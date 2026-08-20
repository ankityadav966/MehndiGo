const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories");
const AppError = require("../utils/errors/app.error");
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../models");
const { Op } = require("sequelize");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

const otpFailedAttempts = new Map();

function sanitizePhone(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim();
  if (cleaned.startsWith("+91")) cleaned = cleaned.substring(3);
  cleaned = cleaned.replace(/[^0-9]/g, "");
  if (cleaned.length > 10) cleaned = cleaned.substring(cleaned.length - 10);
  return cleaned.length === 10 ? cleaned : null;
}

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
  const jwtSecret = process.env.JWT_SECRET || "live_mehndigo_jwt_secret_2026";
  return jwt.sign(
    { id: user.id, role: user.role, jti: crypto.randomBytes(16).toString("hex") },
    jwtSecret,
    { expiresIn: "1h" }
  );
}

function generateRefreshToken(user) {
  const jwtSecret = process.env.JWT_SECRET || "live_mehndigo_jwt_secret_2026";
  return jwt.sign(
    { id: user.id, role: user.role, jti: crypto.randomBytes(16).toString("hex") },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

class AuthService {
  sanitizePhone(phone) {
    return sanitizePhone(phone);
  }

  async sendEmailDispatch(data) {
    const { to, email, otp, code, name } = data;
    const targetEmail = String(to || email || "").trim().toLowerCase();
    const targetOtp = String(otp || code || "").trim();
    const targetName = name || "Mehndi User";

    if (!targetEmail || !targetOtp) {
      throw new AppError("Email Address and OTP code are required for dispatch", 400);
    }

    console.log(`[AUTH SERVICE DISPATCH] Delivering OTP ${targetOtp} to ${targetEmail}...`);
    const result = await sendOtpEmail(targetEmail, targetOtp, targetName);

    if (result && result.mock) {
      throw new AppError(`Email delivery failed: ${result.error || "Nodemailer unconfigured"}`, 500);
    }

    console.log(`[AUTH SERVICE DISPATCH SUCCESS] Delivered to ${targetEmail}, messageId: ${result.messageId}`);
    return {
      success: true,
      email: targetEmail,
      messageId: result.messageId
    };
  }

  // 1. Unified Registration - Send OTP
  async registerSendOtp(data) {
    const { name, email, phone, password, role } = data;

    if (!name || !String(name).trim()) {
      throw new AppError("Full Name is required", 400);
    }

    if (!email || !String(email).trim()) {
      throw new AppError("Email address is required", 400);
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const cleanPhone = sanitizePhone(phone);

    if (!cleanPhone) {
      throw new AppError("Valid 10-digit mobile number is required", 400);
    }

    const normalizedRole = String(role || "USER").toUpperCase() === "ARTIST" ? "ARTIST" : "USER";
    if (normalizedRole === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    // Check if email already registered and verified
    const existingEmailUser = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingEmailUser && existingEmailUser.is_verified) {
      throw new AppError("Email address already registered. Please log in.", 400);
    }

    // Check if phone already registered and verified
    const existingPhoneUser = await UserRepositor.getOne({ phone: cleanPhone });
    if (existingPhoneUser && existingPhoneUser.is_verified) {
      throw new AppError("Phone number already registered. Please log in.", 400);
    }

    // Rate Limit check (max 5 OTPs per 10 min)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpsCount = await db.Otp.count({
      where: {
        [Op.or]: [{ email: trimmedEmail }, { phone: cleanPhone }],
        createdAt: { [Op.gte]: tenMinutesAgo }
      }
    });

    if (recentOtpsCount >= 5) {
      throw new AppError("Too many OTP requests. Please try again after 10 minutes.", 429);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = password ? hashPassword(password) : null;

    const payload = JSON.stringify({
      name: trimmedName,
      email: trimmedEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: normalizedRole
    });

    // Store registration data temporarily in OTP table without premature user duplication
    await OtpRepositor.create({
      phone: cleanPhone,
      email: trimmedEmail,
      otp,
      registration_payload: payload,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false,
    });

    try {
      await sendOtpEmail(trimmedEmail, otp, trimmedName);
    } catch (mailErr) {
      console.warn("[AUTH] SMTP dispatch notice:", mailErr.message);
    }

    console.log(`\n==================================\nREGISTRATION OTP (GMAIL)\nEmail: ${trimmedEmail}\nPhone: ${cleanPhone}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: false,
      email: trimmedEmail,
      phone: cleanPhone,
      role: normalizedRole,
      otp,
    };
  }

  // 2. Unified Registration - Verify OTP & Create Account Atomically
  async registerVerifyOtp(data) {
    const { email, phone, otp } = data;

    if (!email && !phone) {
      throw new AppError("Email or phone number is required", 400);
    }
    if (!otp) {
      throw new AppError("OTP code is required", 400);
    }

    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const cleanPhone = phone ? sanitizePhone(phone) : null;
    const cleanOtp = String(otp).trim();

    // Find the latest unverified OTP
    let otpData = null;
    if (trimmedEmail) {
      otpData = await db.Otp.findOne({
        where: { email: trimmedEmail, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }
    if (!otpData && cleanPhone) {
      otpData = await db.Otp.findOne({
        where: { phone: cleanPhone, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }
    if (!otpData) {
      otpData = await db.Otp.findOne({
        where: { otp: cleanOtp, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }

    if (!otpData) {
      throw new AppError("No pending registration found for this OTP", 400);
    }

    // Check Expiry
    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    // Brute-force lockout (max 3 failed attempts)
    const attempts = otpFailedAttempts.get(otpData.id) || 0;
    if (attempts >= 3) {
      throw new AppError("Maximum verification attempts exceeded. Please request a new OTP.", 429);
    }

    if (otpData.otp !== cleanOtp) {
      otpFailedAttempts.set(otpData.id, attempts + 1);
      throw new AppError("Invalid OTP verification code", 400);
    }

    // OTP Verified
    await OtpRepositor.update(otpData.id, { verified: true });
    otpFailedAttempts.delete(otpData.id);

    let payload = {};
    try {
      payload = otpData.registration_payload ? JSON.parse(otpData.registration_payload) : {};
    } catch (_) {
      payload = {};
    }

    const finalName = payload.name || data.name || "User";
    const finalEmail = payload.email || trimmedEmail;
    const finalPhone = payload.phone || cleanPhone;
    const finalRole = (String(payload.role || data.role).toUpperCase() === "ARTIST") ? "ARTIST" : "USER";
    const finalPassword = payload.password || (data.password ? hashPassword(data.password) : null);

    // Atomically find or create user within a database transaction
    const t = await db.sequelize.transaction();
    let user = null;
    let accessToken = null;
    let refreshToken = null;
    try {
      if (finalEmail) {
        user = await db.User.findOne({ where: { email: finalEmail }, transaction: t });
      }
      if (!user && finalPhone) {
        user = await db.User.findOne({ where: { phone: finalPhone }, transaction: t });
      }

      if (user) {
        await user.update({
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          role: finalRole,
          is_verified: true,
          last_login_at: new Date(),
          ...(finalPassword ? { password: finalPassword } : {})
        }, { transaction: t });
      } else {
        user = await db.User.create({
          name: finalName,
          email: finalEmail,
          phone: finalPhone,
          password: finalPassword,
          role: finalRole,
          is_verified: true,
          last_login_at: new Date(),
        }, { transaction: t });
      }

      // If role is ARTIST, create artist profile atomically in the same transaction
      if (user.role === "ARTIST") {
        await db.ArtistProfile.findOrCreate({
          where: { user_id: user.id },
          defaults: {
            bio: "",
            experience_years: 1,
            home_service: true,
            salon_service: false,
            verification_status: "PENDING"
          },
          transaction: t
        });
      }

      accessToken = generateAccessToken(user);
      refreshToken = generateRefreshToken(user);

      await user.update({ refresh_token: refreshToken }, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return {
      token: accessToken,
      accessToken,
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

  // 3. Unified Login - Send OTP
  async sendOtp(data) {
    const { email, phone, role, name } = data;
    const loginValue = email || phone;

    if (!loginValue || !String(loginValue).trim()) {
      throw new AppError("Email or Mobile Number is required for login", 400);
    }

    const cleaned = String(loginValue).trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

    let user = null;
    let targetEmail = "";
    let cleanPhone = null;

    if (isEmail) {
      targetEmail = cleaned.toLowerCase();
      user = await UserRepositor.getOne({ email: targetEmail });
    } else {
      cleanPhone = sanitizePhone(cleaned);
      if (cleanPhone) {
        user = await UserRepositor.getOne({ phone: cleanPhone });
      }
    }

    // Rate Limit check
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpsCount = await db.Otp.count({
      where: {
        [Op.or]: [
          ...(targetEmail ? [{ email: targetEmail }] : []),
          ...(cleanPhone ? [{ phone: cleanPhone }] : [])
        ],
        createdAt: { [Op.gte]: tenMinutesAgo }
      }
    });

    if (recentOtpsCount >= 5) {
      throw new AppError("Too many OTP requests. Please try again after 10 minutes.", 429);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP
    await OtpRepositor.create({
      user_id: user ? user.id : null,
      phone: cleanPhone || (user ? user.phone : null),
      email: targetEmail || (user ? user.email : null),
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false
    });

    if (targetEmail || (user && user.email)) {
      const emailToSend = targetEmail || user.email;
      try {
        await sendOtpEmail(emailToSend, otp, user ? user.name : "Mehndi User");
      } catch (mailErr) {
        console.warn("[AUTH] SMTP dispatch notice:", mailErr.message);
      }
    }

    console.log(`\n==================================\nLOGIN OTP (GMAIL)\nContact: ${targetEmail || cleanPhone}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: !!user,
      email: targetEmail || (user ? user.email : null),
      phone: cleanPhone || (user ? user.phone : null),
      role: user ? user.role : (role || "USER"),
      otp,
    };
  }

  // 4. Unified Login - Verify OTP
  async verifyOtp(data) {
    const { email, phone, otp } = data;
    const loginValue = email || phone;
    const cleanOtp = String(otp || "").trim();

    if (!cleanOtp) {
      throw new AppError("OTP code is required", 400);
    }

    const cleaned = loginValue ? String(loginValue).trim() : "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    const targetEmail = isEmail ? cleaned.toLowerCase() : null;
    const cleanPhone = !isEmail ? sanitizePhone(cleaned) : null;

    // Find latest unverified OTP
    let otpData = null;
    if (targetEmail) {
      otpData = await db.Otp.findOne({
        where: { email: targetEmail, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }
    if (!otpData && cleanPhone) {
      otpData = await db.Otp.findOne({
        where: { phone: cleanPhone, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }
    if (!otpData) {
      otpData = await db.Otp.findOne({
        where: { otp: cleanOtp, verified: false },
        order: [["createdAt", "DESC"]]
      });
    }

    if (!otpData) {
      throw new AppError("No active OTP requested for this contact", 400);
    }

    // Check Expiry
    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    // Brute-force lockout (max 3 failed attempts)
    const attempts = otpFailedAttempts.get(otpData.id) || 0;
    if (attempts >= 3) {
      throw new AppError("Maximum verification attempts exceeded. Please request a new OTP.", 429);
    }

    if (otpData.otp !== cleanOtp) {
      otpFailedAttempts.set(otpData.id, attempts + 1);
      throw new AppError("Invalid OTP verification code", 400);
    }

    // OTP Verified
    await OtpRepositor.update(otpData.id, { verified: true });
    otpFailedAttempts.delete(otpData.id);

    let user = null;
    if (otpData.user_id) {
      user = await UserRepositor.getById(otpData.user_id);
    }
    if (!user && targetEmail) {
      user = await UserRepositor.getOne({ email: targetEmail });
    }
    if (!user && cleanPhone) {
      user = await UserRepositor.getOne({ phone: cleanPhone });
    }
    if (!user && otpData.email) {
      user = await UserRepositor.getOne({ email: otpData.email });
    }
    if (!user && otpData.phone) {
      user = await UserRepositor.getOne({ phone: otpData.phone });
    }

    if (!user) {
      // Auto-create verified user if logging in directly
      user = await UserRepositor.create({
        name: data.name || (targetEmail ? targetEmail.split("@")[0] : "User"),
        phone: cleanPhone || otpData.phone || null,
        email: targetEmail || otpData.email || null,
        role: data.role === "ARTIST" ? "ARTIST" : "USER",
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

      await UserRepositor.update(user.id, {
        is_verified: true,
        last_login_at: new Date()
      });
      user = await UserRepositor.getById(user.id);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await UserRepositor.update(user.id, { refresh_token: refreshToken });

    return {
      token: accessToken,
      accessToken,
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

  // Aliases for compatibility
  async loginSendOtp(data) {
    return this.sendOtp(data);
  }

  async loginVerifyOtp(data) {
    return this.verifyOtp(data);
  }

  async register(data) {
    const { name, email, phone, password, role, gender, city, state, pincode } = data;

    if (!name || !email || !role) {
      throw new AppError("Name, Email, and Role are required", 400);
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    let existingUser = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingUser) {
      throw new AppError("Email is already registered", 400);
    }

    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone) {
      existingUser = await UserRepositor.getOne({ phone: cleanPhone });
      if (existingUser) {
        throw new AppError("Phone number is already registered", 400);
      }
    }

    const hashedPassword = password ? hashPassword(password) : null;

    const t = await db.sequelize.transaction();
    let user;
    let accessToken = null;
    let refreshToken = null;
    try {
      user = await db.User.create({
        name,
        phone: cleanPhone,
        email: trimmedEmail,
        password: hashedPassword,
        role: role === "ARTIST" ? "ARTIST" : "USER",
        gender: gender || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
        is_verified: true,
        last_login_at: new Date()
      }, { transaction: t });

      if (user.role === "ARTIST") {
        await db.ArtistProfile.findOrCreate({
          where: { user_id: user.id },
          defaults: {
            bio: "",
            experience_years: 1,
            home_service: true,
            salon_service: false,
            verification_status: "PENDING"
          },
          transaction: t
        });
      }

      accessToken = generateAccessToken(user);
      refreshToken = generateRefreshToken(user);

      await user.update({ refresh_token: refreshToken }, { transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return {
      token: accessToken,
      accessToken,
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
    const { email, phone, password } = data;

    if ((!email && !phone) || !password) {
      throw new AppError("Email/Phone and Password are required", 400);
    }

    let user = null;
    if (email) {
      user = await UserRepositor.getOne({ email: String(email).trim().toLowerCase() });
    } else if (phone) {
      const cleanPhone = sanitizePhone(phone);
      if (cleanPhone) user = await UserRepositor.getOne({ phone: cleanPhone });
    }

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
      accessToken,
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
      const jwtSecret = process.env.JWT_SECRET || "live_mehndigo_jwt_secret_2026";
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
        accessToken,
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
    const allowedUpdates = ["name", "email", "phone", "gender", "profile_image", "city", "state", "pincode"];
    const updates = {};
    for (const key of allowedUpdates) {
      if (profileData[key] !== undefined) {
        updates[key] = profileData[key];
      }
    }

    await UserRepositor.update(userId, updates);
    return this.getProfile(userId);
  }

  async changePassword(userId, data) {
    const { currentPassword, newPassword } = data || {};
    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }
    if (String(newPassword).length < 6) {
      throw new AppError("New password must be at least 6 characters long", 400);
    }
    const user = await UserRepositor.getById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.password && !verifyPassword(currentPassword, user.password)) {
      throw new AppError("Incorrect current password", 400);
    }

    const hashedPassword = hashPassword(newPassword);
    await UserRepositor.update(userId, { password: hashedPassword });
    return { success: true, message: "Password updated successfully" };
  }

  async deleteAccount(userId, data) {
    const user = await UserRepositor.getById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    await UserRepositor.update(userId, {
      refresh_token: null,
      is_verified: false
    });
    await db.User.destroy({ where: { id: userId } });
    return { success: true, message: "Account deleted successfully" };
  }
}

module.exports = new AuthService();
