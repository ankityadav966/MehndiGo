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
  // 1. Registration - Send OTP (Stores temporarily in Otp table)
  async registerSendOtp(data) {
    console.log("Registration Data received:", data);
    const { name, email, phone, password, role } = data;

    if (!name || !email || !role) {
      throw new AppError("Name, Email, and Role are required for registration", 400);
    }

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existingEmail = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingEmail) {
      throw new AppError(`This email is already registered. Please log in instead.`, 400);
    }

    if (phone) {
      const phoneCleaned = String(phone).trim().replace(/[\s-()]/g, "");
      if (phoneCleaned !== "") {
        const existingUser = await UserRepositor.getOne({ phone: phoneCleaned });
        if (existingUser) {
          throw new AppError(`This phone number is already registered. Please log in instead.`, 400);
        }
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashPassword = password ? crypto.createHash("sha256").update(password).digest("hex") : null;

    // Store registration data temporarily in OTP table
    const payload = JSON.stringify({
      name,
      email: trimmedEmail,
      phone: phone ? phone.trim() : null,
      password: hashPassword,
      role
    });

    await OtpRepositor.create({
      phone: phone || null,
      email: trimmedEmail,
      otp,
      registration_payload: payload,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, name);
    console.log(`\n==================================\nEMAIL OTP (Register)\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return { email: trimmedEmail, otp }; // OTP returned for dev testing easily
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
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

    // Create User (phone is nullable/optional)
    const user = await UserRepositor.create({
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      is_verified: true,
      last_login_at: new Date(),
    });
    
    // Create artist profile if role is ARTIST
    if (user.role === "ARTIST") {
      await ArtistProfileRepositor.create({
        user_id: user.id,
        bio: "",
      });
    }

    // Generate Token
    const token = generateToken(user);
    
    console.log("Database Query Result (User Created):", user.id);
    console.log("Generated JWT:", token);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  // 3. Unified Login - Send OTP
  async loginSendOtp(data) {
    const { email, phone, role } = data;
    const loginValue = email || phone;

    if (!loginValue) {
      throw new AppError("Email or Mobile Number is required for login", 400);
    }

    const cleaned = String(loginValue).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

    let user = null;
    let trimmedEmail = "";

    if (isEmail) {
      trimmedEmail = cleaned.toLowerCase();
      
      // Special Admin Logic
      const isSpecialAdmin = trimmedEmail === "ankityadav941318@gmail.com" || trimmedEmail === "sonudonyadav87@gmail.com";
      if (isSpecialAdmin) {
        user = await UserRepositor.getOne({ role: "ADMIN" });
        if (!user) {
          user = await UserRepositor.create({
            name: "Master Admin",
            phone: "6350650966",
            email: trimmedEmail,
            role: "ADMIN",
            is_verified: true,
          });
        }
      } else {
        user = await UserRepositor.getOne({ email: trimmedEmail });
      }
    } else {
      const phoneCleaned = cleaned.replace(/[\s-()]/g, "");
      user = await UserRepositor.getOne({ phone: phoneCleaned });
      if (!user && phoneCleaned.length === 10) {
        user = await UserRepositor.getOne({ phone: `+91${phoneCleaned}` });
      }
    }

    if (!user) {
      throw new AppError("User not found. Please register first.", 404);
    }

    if (role && user.role !== role) {
      throw new AppError(`Access denied: Registered as a ${user.role}`, 403);
    }

    trimmedEmail = user.email;
    if (!trimmedEmail) {
      throw new AppError("No email address is registered on this account.", 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpRepositor.create({
      user_id: user.id,
      phone: user.phone || null,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, user.name);
    console.log(`\n==================================\nEMAIL OTP (Login)\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return {
      email: trimmedEmail,
      role: user.role,
      otp,
    };
  }

  // 4. Unified Login - Verify OTP
  async loginVerifyOtp(data) {
    const { email, phone, otp } = data;
    const loginValue = email || phone;

    if (!loginValue || !otp) {
      throw new AppError("Email/Mobile and OTP required", 400);
    }

    const cleaned = String(loginValue).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

    let targetEmail = "";
    if (isEmail) {
      targetEmail = cleaned.toLowerCase();
    } else {
      const phoneCleaned = cleaned.replace(/[\s-()]/g, "");
      const user = await UserRepositor.getOne({ phone: phoneCleaned });
      if (user) {
        targetEmail = user.email;
      } else {
        const user91 = await UserRepositor.getOne({ phone: `+91${phoneCleaned}` });
        if (user91) targetEmail = user91.email;
      }
    }

    if (!targetEmail) {
      throw new AppError("Valid email or registered phone number required", 400);
    }

    const otpData = await OtpRepositor.getOne({
      email: targetEmail,
      otp: String(otp),
      verified: false,
    });

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, { verified: true });

    const user = await UserRepositor.getById(otpData.user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await UserRepositor.update(user.id, {
      last_login_at: new Date(),
    });

    const token = generateToken(user);

    console.log("Authenticated User:", user.id);
    console.log("Generated JWT:", token);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Legacy/Compatibility fallbacks
  async sendOtp(data) {
    return this.loginSendOtp(data);
  }

  async verifyOtp(data) {
    return this.loginVerifyOtp(data);
  }

  async login(data) {
    return this.sendOtp(data);
  }

  async adminSendOtp(data) {
    const { email, password } = data;
    
    if (!email || !password) {
      throw new AppError("Email and Password are required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    
    const user = await UserRepositor.getOne({ email: trimmedEmail, role: "ADMIN" });
    if (!user) {
      throw new AppError("Access denied: Invalid Admin credentials", 403);
    }
    
    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.password !== inputHash) {
      throw new AppError("Access denied: Invalid Admin credentials", 403);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpRepositor.create({
      user_id: user.id,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendEmail(trimmedEmail, "Mehndi Go - Admin Verification Code", `Your Admin security verification OTP is: ${otp}`);

    return {
      email: trimmedEmail,
      otp,
    };
  }

  async adminVerifyOtp(data) {
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP are required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    const user = await UserRepositor.getOne({ email: trimmedEmail, role: "ADMIN" });
    if (!user) {
      throw new AppError("Access denied: Invalid Admin credentials", 403);
    }

    const otpData = await OtpRepositor.getOne({
      user_id: user.id,
      otp: String(otp),
      verified: false,
    });

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, {
      verified: true,
    });

    await UserRepositor.update(user.id, {
      last_login_at: new Date(),
    });

    const token = generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
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
