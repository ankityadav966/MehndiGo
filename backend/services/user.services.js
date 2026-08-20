const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const crypto = require("crypto");
const { Op } = require("sequelize");

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

const AuthService = require("./auth.services");

class UserService {
  sanitizePhone(phone) {
    return AuthService.sanitizePhone(phone);
  }

  // 1. Unified Registration - Send OTP
  async registerSendOtp(data) {
    console.log("Registration Data received:", data);
    const { name, email, phone, password, role } = data;

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const sanitized = this.sanitizePhone(phone) || null;
    const trimmedName = String(name || "").trim() || (trimmedEmail ? trimmedEmail.split("@")[0] : "User");
    const normalizedRole = (String(role).toUpperCase() === "ARTIST") ? "ARTIST" : "USER";
    const mappedRole = role === "CUSTOMER" ? "USER" : (role || "USER");
    const hashPassword = password ? crypto.createHash("sha256").update(password).digest("hex") : null;

    let user = null;
    if (sanitized) {
      user = await UserRepositor.getOne({ phone: sanitized });
    }

    if (!user && trimmedEmail) {
      user = await UserRepositor.getOne({ email: trimmedEmail });
    }

    if (user) {
      if (!user.is_verified) {
        await UserRepositor.update(user.id, {
          name: trimmedName,
          ...(hashPassword ? { password: hashPassword } : {}),
          role: mappedRole
        });
      }
    } else {
      user = await UserRepositor.create({
        name: trimmedName,
        phone: sanitized,
        email: trimmedEmail,
        password: hashPassword,
        role: mappedRole,
        is_verified: false,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store registration data temporarily in OTP table
    const payload = JSON.stringify({
      name: trimmedName,
      email: trimmedEmail,
      phone: sanitized,
      password: hashPassword,
      role: normalizedRole
    });

    await OtpRepositor.create({
      user_id: user ? user.id : null,
      phone: sanitized,
      email: trimmedEmail,
      otp,
      registration_payload: payload,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
    });

    if (trimmedEmail) {
      try {
        await sendOtpEmail(trimmedEmail, otp, trimmedName);
      } catch (e) {
        console.error("Error sending registration OTP email:", e.message);
      }
    }
    console.log(`\n==================================\nEMAIL OTP (Register)\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: true,
      email: trimmedEmail,
      phone: sanitized || (user ? user.phone : null),
      role: user ? user.role : mappedRole,
      otp,
    };
  }

  // Aliases for UserController
  async sendOtp(data) {
    return this.loginSendOtp(data);
  }

  async verifyOtp(data) {
    return this.loginVerifyOtp(data);
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
    return await AuthService.registerVerifyOtp(data);
  }

  // 3. Unified Login - Send OTP
  async loginSendOtp(data) {
    return await AuthService.sendOtp(data);
  }

  // 4. Unified Login - Verify OTP
  async loginVerifyOtp(data) {
    return await AuthService.verifyOtp(data);
  }

  // Aliases for UserController
  async sendOtp(data) {
    return await AuthService.sendOtp(data);
  }

  async verifyOtp(data) {
    return await AuthService.verifyOtp(data);
  }

  async login(data) {
    return await AuthService.login(data);
  }

  async register(data) {
    return await AuthService.register(data);
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
      phone: user.phone || null,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
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

    await OtpRepositor.update(otpData.id, { verified: true });
    await UserRepositor.update(user.id, { last_login_at: new Date() });

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
