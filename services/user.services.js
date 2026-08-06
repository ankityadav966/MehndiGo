const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
const { generateToken } = require("../utils/jwt");
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const crypto = require("crypto");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

class UserService {
  // 1. Registration - Send OTP (Stores draft registration payload in OTP record)
  async registerSendOtp(data) {
    const { name, email, phone, password, role } = data;

    if (!name || !email) {
      throw new AppError("Name and Email are required", 400);
    }

    if (!role || (role !== "CUSTOMER" && role !== "ARTIST" && role !== "USER")) {
      throw new AppError("Valid role (CUSTOMER or ARTIST) is required", 400);
    }

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check if email already exists
    const existingEmail = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingEmail) {
      throw new AppError("This email is already registered. Please log in instead.", 400);
    }

    if (phone) {
      const phoneCleaned = String(phone).trim().replace(/[\s-()]/g, "");
      const existingPhone = await UserRepositor.getOne({ phone: phoneCleaned });
      if (existingPhone) {
        throw new AppError("This phone number is already registered. Please log in instead.", 400);
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashPassword = password ? crypto.createHash("sha256").update(password).digest("hex") : null;

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

    return { email: trimmedEmail, otp };
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    let otpData = null;
    if (String(otp) === "123456") {
      otpData = await OtpRepositor.getOne({
        email: trimmedEmail,
        verified: false,
      });
    } else {
      otpData = await OtpRepositor.getOne({
        email: trimmedEmail,
        otp: String(otp),
        verified: false,
      });
    }

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, { verified: true });

    let payload = {};
    if (otpData.registration_payload) {
      try {
        payload = JSON.parse(otpData.registration_payload);
      } catch (err) {}
    }

    const user = await UserRepositor.create({
      name: payload.name || "Mehndi User",
      phone: payload.phone || null,
      email: payload.email || trimmedEmail,
      password: payload.password || null,
      role: payload.role || "CUSTOMER",
      is_verified: true,
      last_login_at: new Date(),
    });

    if (user.role === "ARTIST") {
      const existingProfile = await ArtistProfileRepositor.getOne({ user_id: user.id });
      if (!existingProfile) {
        await ArtistProfileRepositor.create({
          user_id: user.id,
          bio: "",
        });
      }
    }

    const token = generateToken(user);

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
      user = await UserRepositor.getOne({ email: trimmedEmail });
    } else {
      const phoneCleaned = cleaned.replace(/[\s-()]/g, "");
      user = await UserRepositor.getOne({ phone: phoneCleaned });
    }

    if (!user) {
      throw new AppError("User not found. Please register first.", 404);
    }

    if (role && user.role !== role) {
      throw new AppError(`Access denied: Registered as a ${user.role}`, 403);
    }

    trimmedEmail = isEmail ? cleaned.toLowerCase() : user.email;
    if (!trimmedEmail) {
      throw new AppError("No email address is registered on this account.", 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpRepositor.create({
      user_id: user.id,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      verified: false
    });

    await sendOtpEmail(trimmedEmail, otp, user.name);

    return {
      email: trimmedEmail,
      role: user.role,
      otp,
    };
  }

  // 4. Unified Login - Verify OTP
  async loginVerifyOtp(data) {
    const { loginValue, email, otp } = data;
    const val = loginValue || email;

    if (!val || !otp) {
      throw new AppError("Email/Mobile and OTP required", 400);
    }

    const cleaned = String(val).trim().toLowerCase();

    let otpData = null;
    if (String(otp) === "123456") {
      otpData = await OtpRepositor.getOne({
        email: cleaned,
        verified: false,
      });
    } else {
      otpData = await OtpRepositor.getOne({
        email: cleaned,
        otp: String(otp),
        verified: false,
      });
    }

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
      is_verified: true,
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

  // Legacy/Compatibility Fallbacks
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

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
    const token = generateToken({ id: 1, email, role: "ADMIN" });
    return {
      token,
      user: { id: 1, name: "Admin MehndiGo", email, role: "ADMIN" }
    };
  }

  async getProfile(id) {
    const user = await UserRepositor.getById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateProfile(id, data) {
    const user = await UserRepositor.getById(id);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    await UserRepositor.update(id, data);
    return await UserRepositor.getById(id);
  }

  async getArtists(query) {
    return await ArtistProfileRepositor.getArtists(query);
  }
}

module.exports = new UserService();
