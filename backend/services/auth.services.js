const {
  UserRepository,
  OtpRepository,
} = require("../repositories");
const AppError = require("../utils/errors/app.error");
const { generateToken } = require("../utils/jwt");
const { sendOtp } = require("../utils/twilio.service");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../models");
const { Op } = require("sequelize");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();

// In-memory store for OTP verification failed attempts: otpId -> count
const otpFailedAttempts = new Map();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

class AuthService {
  async sendOtp(data) {
    const { phone, role, name, email } = data;

    if (!phone) {
      throw new AppError("Phone number is required", 400);
    }
    if (!role) {
      throw new AppError("Role is required", 400);
    }

    // Rate Limit check: Check how many OTPs sent to this phone in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpsCount = await db.Otp.count({
      where: {
        phone,
        createdAt: {
          [Op.gte]: tenMinutesAgo
        }
      }
    });

    if (recentOtpsCount >= 5) {
      throw new AppError("Too many OTP requests. Please try again after 10 minutes.", 429);
    }

    // Check if user exists
    let user = await UserRepositor.getOne({ phone });
    if (user && user.role !== role) {
      throw new AppError(`This phone number is already registered as a ${user.role}`, 400);
    }

    // Create user if they don't exist yet (Pre-registration on OTP request)
    if (!user) {
      if (role === "ADMIN") {
        throw new AppError("Admin registration is not allowed publicly", 403);
      }
      user = await UserRepositor.create({
        name: name || "User",
        phone,
        email: email || null,
        role: role || "USER",
        is_verified: false
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    // Save OTP to database
    await OtpRepositor.create({
      user_id: user.id,
      phone,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false
    });

    console.log(OtpRepositor, 'OtpRepositorOtpRepositorOtpRepositor')
    console.log(otp, 'OtpR')

    // Send via Twilio
    await sendOtp(phone, otp);

    return {
      phone,
      role: user.role,
      otp, // For testing convenience if twilio is mock
    };
  }

  async verifyOtp(data) {
    const { phone, otp, role, name, email } = data;

    if (!phone || !otp || !role) {
      throw new AppError("Phone, OTP, and Role are required", 400);
    }

    // Find the latest unverified OTP for this phone
    const otpData = await db.Otp.findOne({
      where: {
        phone,
        verified: false
      },
      order: [["createdAt", "DESC"]]
    });

    if (!otpData) {
      throw new AppError("No OTP requested for this phone number", 400);
    }

    // Check Expiry
    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    // Max Retry Limit: 3 attempts per OTP ID
    const attempts = otpFailedAttempts.get(otpData.id) || 0;
    if (attempts >= 3) {
      throw new AppError("Maximum verification attempts exceeded. Please request a new OTP.", 429);
    }

    if (otpData.otp !== String(otp)) {
      otpFailedAttempts.set(otpData.id, attempts + 1);
      throw new AppError("Invalid OTP verification code", 400);
    }

    // Mark OTP as verified
    await OtpRepositor.update(otpData.id, { verified: true });
    otpFailedAttempts.delete(otpData.id);

    // Fetch user or create if missed
    let user = await UserRepositor.getOne({ phone });
    if (!user) {
      user = await UserRepositor.create({
        name: name || "User",
        phone,
        email: email || null,
        role,
        is_verified: true,
        last_login_at: new Date()
      });
    } else {
      const isNewDay = !user.last_login_at || new Date(user.last_login_at).toDateString() !== new Date().toDateString();
      if (isNewDay) {
        const xpService = require("./xp.services");
        await xpService.awardXp(user.id, 20, "Daily Login Bonus");
      }

      const updateData = {
        is_verified: true,
        last_login_at: new Date()
      };
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      await UserRepositor.update(user.id, updateData);
      user = await UserRepositor.getById(user.id);
    }

    // Generate JWT access and refresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to user
    await UserRepositor.update(user.id, { refresh_token: refreshToken });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profile_image: user.profile_image,
        city: user.city,
        state: user.state,
        pincode: user.pincode
      }
    };
  }

  async register(data) {
    const { name, phone, email, password, role, gender, city, state, pincode } = data;

    if (!name || !phone || !email || !password || !role) {
      throw new AppError("Name, Phone, Email, Password, and Role are required", 400);
    }

    // Check if phone or email already registered
    let existingUser = await UserRepositor.getOne({ phone });
    if (existingUser) {
      throw new AppError("Phone number is already registered", 400);
    }

    existingUser = await UserRepositor.getOne({ email });
    if (existingUser) {
      throw new AppError("Email is already registered", 400);
    }

    const hashedPassword = hashPassword(password);

    const user = await UserRepositor.create({
      name,
      phone,
      email,
      password: hashedPassword,
      role,
      gender: gender || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      is_verified: true
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await UserRepositor.update(user.id, { refresh_token: refreshToken });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profile_image: user.profile_image,
        city: user.city,
        state: user.state,
        pincode: user.pincode
      }
    };
  }

  async login(data) {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError("Email and Password are required", 400);
    }

    const user = await UserRepositor.getOne({ email });
    if (!user || !user.password) {
      throw new AppError("Invalid email or password credentials", 401);
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      throw new AppError("Invalid email or password credentials", 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await UserRepositor.update(user.id, {
      refresh_token: refreshToken,
      last_login_at: new Date()
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profile_image: user.profile_image,
        city: user.city,
        state: user.state,
        pincode: user.pincode
      }
    };
  }

  async refresh(data) {
    const { refreshToken } = data;

    if (!refreshToken) {
      throw new AppError("Refresh token is required", 400);
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      const user = await UserRepositor.getById(decoded.id);

      if (!user || user.refresh_token !== refreshToken) {
        throw new AppError("Invalid or expired refresh token", 401);
      }

      const accessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      await UserRepositor.update(user.id, { refresh_token: newRefreshToken });

      return {
        token: accessToken,
        refreshToken: newRefreshToken
      };
    } catch (e) {
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  async logout(userId) {
    await UserRepositor.update(userId, { refresh_token: null });
    return true;
  }

  async getProfile(userId) {
    const user = await UserRepositor.getById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      gender: user.gender,
      profile_image: user.profile_image,
      city: user.city,
      state: user.state,
      pincode: user.pincode
    };
  }

  async updateProfile(userId, profileData) {
    const allowedUpdates = ["name", "email", "gender", "profile_image", "city", "state", "pincode"];
    const updates = {};
    for (const key of allowedUpdates) {
      if (profileData[key] !== undefined) {
        updates[key] = profileData[key];
      }
    }

    await UserRepositor.update(userId, updates);
    return this.getProfile(userId);
  }
}

module.exports = new AuthService();
