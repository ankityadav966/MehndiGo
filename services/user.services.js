const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const crypto = require("crypto");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT Secret is not configured in server environment variables", 500);
  }
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

class UserService {
  // 1. Registration
  async register(data) {
    const { fullName, email, password, role } = data;

    if (!fullName || !email || !password || !role) {
      throw new AppError("Full Name, Email, Password, and Role are required", 400);
    }

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check duplicate email
    const existingEmail = await UserRepositor.getOne({ email: trimmedEmail });

    if (existingEmail) {
      throw new AppError("This email is already registered.", 400);
    }

    const hashPassword = crypto.createHash("sha256").update(password).digest("hex");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB
    const payload = JSON.stringify({
      fullName,
      email: trimmedEmail,
      password: hashPassword,
      role
    });

    await OtpRepositor.create({
      email: trimmedEmail,
      otp,
      registration_payload: payload,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, fullName);
    console.log(`\n==================================\nEMAIL OTP (Register)\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return { email: trimmedEmail, message: "OTP sent successfully to email" };
  }

  // 2. Verify Email OTP
  async verifyEmailOtp(data) {
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    const otpData = await OtpRepositor.getOne({
      email: trimmedEmail,
      otp: String(otp),
      verified: false,
    });

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    if (!otpData.registration_payload) {
      throw new AppError("Registration payload missing", 400);
    }

    const payload = JSON.parse(otpData.registration_payload);

    // Verify OTP
    await OtpRepositor.update(otpData.id, { verified: true });

    // Create User
    const user = await UserRepositor.create({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      isEmailVerified: true,
      last_login_at: new Date(),
    });
    
    // Create artist profile if role is ARTIST
    if (user.role === "ARTIST") {
      await ArtistProfileRepositor.create({
        user_id: user.id,
        bio: "",
      });
    }

    const token = generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
    };
  }

  // 3. Login
  async login(data) {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError("Email and Password are required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: trimmedEmail });

    if (!user) {
      throw new AppError("User Not Found. Please register first.", 404);
    }

    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.password !== inputHash) {
      throw new AppError("Incorrect Password", 400);
    }

    if (!user.isEmailVerified) {
      // Trigger OTP sending logic
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await OtpRepositor.create({
        email: trimmedEmail,
        otp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });
      await sendOtpEmail(trimmedEmail, otp, user.fullName || "User");
      
      throw new AppError("Email Not Verified", 403);
    }

    await UserRepositor.update(user.id, { last_login_at: new Date() });
    const token = generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
    };
  }

  // 4. Forgot Password
  async forgotPassword(data) {
    const { email } = data;
    if (!email) throw new AppError("Email is required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: trimmedEmail });

    if (!user) {
      throw new AppError("User Not Found", 404);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpRepositor.create({
      user_id: user.id,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, user.fullName || "User");

    return { email: trimmedEmail, message: "OTP sent to your email for password reset" };
  }

  // 5. Verify Forgot Password OTP
  async verifyForgotPasswordOtp(data) {
    const { email, otp } = data;
    if (!email || !otp) throw new AppError("Email and OTP required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();
    const otpData = await OtpRepositor.getOne({ email: trimmedEmail, otp: String(otp), verified: false });

    if (!otpData) throw new AppError("Invalid OTP", 400);
    if (new Date(otpData.expires_at) < new Date()) throw new AppError("OTP Expired", 400);

    await OtpRepositor.update(otpData.id, { verified: true });
    
    return { email: trimmedEmail, message: "OTP verified successfully. You can now reset your password." };
  }

  // 6. Reset Password
  async resetPassword(data) {
    const { email, password } = data;
    if (!email || !password) throw new AppError("Email and Password required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: trimmedEmail });

    if (!user) throw new AppError("User Not Found", 404);

    const hashPassword = crypto.createHash("sha256").update(password).digest("hex");
    
    await UserRepositor.update(user.id, { password: hashPassword });

    return { message: "Password reset successfully. You can now login." };
  }

  // 7. Resend OTP
  async resendOtp(data) {
    const { email } = data;
    if (!email) throw new AppError("Email is required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    let name = "User";
    const user = await UserRepositor.getOne({ email: trimmedEmail });
    if (user) {
        name = user.fullName || "User";
    } else {
        const latestOtp = await OtpRepositor.getOne({ email: trimmedEmail });
        if (latestOtp && latestOtp.registration_payload) {
            try {
                const payload = JSON.parse(latestOtp.registration_payload);
                name = payload.fullName || "User";
            } catch (e) {}
        }
    }

    await OtpRepositor.create({
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, name);

    return { message: "A new OTP has been sent to your email." };
  }

  // Admin Legacy Routes
  async adminSendOtp(data) {
    const { email, password } = data;
    if (!email || !password) throw new AppError("Email and Password are required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: trimmedEmail, role: "ADMIN" });
    
    if (!user) throw new AppError("Access denied: Invalid Admin credentials", 403);
    
    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.password !== inputHash) throw new AppError("Access denied: Invalid Admin credentials", 403);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OtpRepositor.create({
      user_id: user.id,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendEmail(trimmedEmail, "Mehndi Go - Admin Verification Code", `Your Admin security verification OTP is: ${otp}`);

    return { email: trimmedEmail, otp };
  }

  async adminVerifyOtp(data) {
    const { email, otp } = data;
    if (!email || !otp) throw new AppError("Email and OTP are required", 400);

    const trimmedEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: trimmedEmail, role: "ADMIN" });
    if (!user) throw new AppError("Access denied: Invalid Admin credentials", 403);

    const otpData = await OtpRepositor.getOne({
      user_id: user.id,
      otp: String(otp),
      verified: false,
    });

    if (!otpData) throw new AppError("Invalid OTP", 400);
    if (new Date(otpData.expires_at) < new Date()) throw new AppError("OTP Expired", 400);

    await OtpRepositor.update(otpData.id, { verified: true });
    await UserRepositor.update(user.id, { last_login_at: new Date() });

    const token = generateToken(user);
    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    };
  }

  async getProfile(id) {
    const user = await UserRepositor.getById(id);
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updateProfile(id, data) {
    const user = await UserRepositor.getById(id);
    if (!user) throw new AppError("User not found", 404);
    await UserRepositor.update(id, data);
    return await UserRepositor.getById(id);
  }

  async getArtists(query) {
    return await ArtistProfileRepositor.getArtists(query);
  }

  async getListing(userId, query) {
    const user = await UserRepositor.getById(userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.role === "USER") {
      return await ArtistProfileRepositor.getArtists({
        latitude: query.latitude,
        longitude: query.longitude,
        radius: query.radius,
        page: query.page,
        limit: query.limit,
      });
    }

    if (user.role === "ARTIST") {
      return await UserRepositor.getUsers({
        page: query.page,
        limit: query.limit,
      });
    }

    throw new AppError("Invalid role", 400);
  }
}

module.exports = new UserService();
