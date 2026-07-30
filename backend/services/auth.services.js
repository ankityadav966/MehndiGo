const {
  UserRepository,
  OtpRepository,
} = require("../repositories");
const AppError = require("../utils/errors/app.error");
const { sendOtpEmail } = require("../utils/mail.service");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../models");
const { Op } = require("sequelize");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();

const otpFailedAttempts = new Map();

function hashPassword(password) {
  const salt = process.env.JWT_SECRET || "live_mehndigo_salt_key_2026";
  return crypto.createHmac("sha256", salt).update(String(password)).digest("hex");
}

function verifyPassword(inputPassword, storedHash) {
  if (!storedHash || !inputPassword) return false;
  const hmacHash = hashPassword(inputPassword);
  if (hmacHash === storedHash) return true;
  const legacyHash = crypto.createHash("sha256").update(String(inputPassword)).digest("hex");
  return legacyHash === storedHash;
}


function generateAccessToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT Secret is not configured in server environment variables", 500);
  }
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "Live credentials",
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT Secret is not configured in server environment variables", 500);
  }
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "Live credentials",
    { expiresIn: "7d" }
  );
}

class AuthService {
  async sendOtp(data) {
    const { email } = data;

    if (!email) {
      throw new AppError("Email Address is required", 400);
    }

    const targetEmail = String(email).trim().toLowerCase();
    const user = await UserRepositor.getOne({ email: targetEmail });

    if (!user) {
      // Dynamic Check: user does not exist, return exists: false
      return {
        exists: false,
        email: targetEmail
      };
    }

    // Rate Limit check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpsCount = await db.Otp.count({
      where: {
        email: targetEmail,
        createdAt: {
          [Op.gte]: tenMinutesAgo
        }
      }
    });

    if (recentOtpsCount >= 5) {
      throw new AppError("Too many OTP requests. Please try again after 10 minutes.", 429);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OtpRepositor.create({
      user_id: user.id,
      phone: user.phone || null,
      email: targetEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false
    });

    console.log(otp, 'OtpR');

    // Send via SMTP
    await sendOtpEmail(targetEmail, otp, user.name);

    return {
      exists: true,
      email: targetEmail,
      role: user.role,
      otp,
    };
  }

  async verifyOtp(data) {
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP are required", 400);
    }

    const targetEmail = String(email).trim().toLowerCase();

    // Find the latest unverified OTP for this email
    const otpData = await db.Otp.findOne({
      where: {
        email: targetEmail,
        verified: false
      },
      order: [["createdAt", "DESC"]]
    });

    if (!otpData) {
      throw new AppError("No OTP requested for this email address", 400);
    }

    // Check Expiry
    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    const attempts = otpFailedAttempts.get(otpData.id) || 0;
    if (attempts >= 3) {
      throw new AppError("Maximum verification attempts exceeded. Please request a new OTP.", 429);
    }

    if (otpData.otp !== String(otp)) {
      otpFailedAttempts.set(otpData.id, attempts + 1);
      throw new AppError("Invalid OTP verification code", 400);
    }

    await OtpRepositor.update(otpData.id, { verified: true });
    otpFailedAttempts.delete(otpData.id);

    let user = await UserRepositor.getOne({ email: targetEmail });
    if (!user) {
      user = await UserRepositor.create({
        name: name || "User",
        phone: phone || null,
        email: targetEmail,
        role: role || "USER",
        is_verified: true,
        last_login_at: new Date()
      });
    } else {
      const isNewDay = !user.last_login_at || new Date(user.last_login_at).toDateString() !== new Date().toDateString();
      if (isNewDay) {
        try {
          const xpService = require("./xp.services");
          await xpService.awardXp(user.id, 20, "Daily Login Bonus");
        } catch (e) {}
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

  async register(data) {
    const { name, email, phone, password, role, gender, city, state, pincode } = data;

    if (!name || !email || !role) {
      throw new AppError("Name, Email, and Role are required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check if email already registered
    let existingUser = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingUser) {
      throw new AppError("Email is already registered", 400);
    }

    if (phone) {
      const phoneCleaned = String(phone).trim().replace(/[\s-()]/g, "");
      if (phoneCleaned !== "") {
        existingUser = await UserRepositor.getOne({ phone: phoneCleaned });
        if (existingUser) {
          throw new AppError("Phone number is already registered", 400);
        }
      }
    }

    const hashedPassword = password ? hashPassword(password) : null;

    const user = await UserRepositor.create({
      name,
      phone: phone || null,
      email: trimmedEmail,
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

    const user = await UserRepositor.getOne({ email: String(email).trim().toLowerCase() });
    if (!user || !user.password) {
      throw new AppError("Invalid credentials", 401);
    }

    if (!verifyPassword(password, user.password)) {
      throw new AppError("Invalid credentials", 401);
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
      const jwtSecret = process.env.JWT_SECRET || "Live credentials";
      const decoded = jwt.verify(refreshToken, jwtSecret);
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
