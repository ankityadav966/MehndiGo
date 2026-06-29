const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
const { generateToken } = require("../utils/jwt");
const { sendOtp } = require("../utils/twilio.service");
const crypto = require("crypto");

const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

class UserService {
  // 1. Registration - Send OTP (Stores temporarily in Otp table)
  async registerSendOtp(data) {
    console.log("Registration Data received:", data);
    const { name, email, phone, password, role } = data;

    if (!name || (!phone && !email) || !password || !role) {
      throw new AppError("Name, phone/email, password, and role are required for registration", 400);
    }

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    // Check if user already exists
    if (phone) {
      const existingUser = await UserRepositor.getOne({ phone });
      if (existingUser) {
        throw new AppError(`This phone number is already registered. Please log in instead.`, 400);
      }
    }
    
    if (email) {
      const existingEmail = await UserRepositor.getOne({ email });
      if (existingEmail) {
        throw new AppError(`This email is already registered. Please log in instead.`, 400);
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const hashPassword = crypto.createHash("sha256").update(password).digest("hex");

    // Store registration data temporarily in OTP table
    const payload = JSON.stringify({ name, email, phone, password: hashPassword, role });

    await OtpRepositor.create({
      phone: phone || null,
      email: email || null,
      otp,
      registration_payload: payload,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (phone) {
      await sendOtp(phone, otp);
      console.log(`\n==================================\nMOBILE OTP\nMobile: ${phone}\nOTP: ${otp}\n==================================\n`);
    } else {
      const { sendEmail } = require("../utils/mail.service");
      await sendEmail(email, "Registration OTP", `Your OTP is: ${otp}`);
      console.log(`\n==================================\nEMAIL OTP\nEmail: ${email}\nOTP: ${otp}\n==================================\n`);
    }

    return { phone, email, otp }; // OTP returned for dev testing easily
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
    const { phone, email, otp } = data;

    let query = { otp: String(otp), verified: false };
    if (phone) query.phone = phone;
    else if (email) query.email = email;
    else throw new AppError("Phone or Email required", 400);

    const otpData = await OtpRepositor.getOne(query);

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
      name: payload.name,
      phone: payload.phone,
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
    const token = generateToken({
      id: user.id,
      role: user.role,
    });
    
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

  // 3. Unified Login - Send OTP (Handles Special Admin)
  async loginSendOtp(data) {
    const { phone, email } = data;

    if (!phone && !email) {
      throw new AppError("Phone or Email required for login", 400);
    }

    // Special Admin Logic
    const isSpecialAdmin = phone === "6350650966" || email === "ankityadav941318@gmail.com";
    
    let user;
    if (isSpecialAdmin) {
      // Find or hardcode master admin
      user = await UserRepositor.getOne({ role: "ADMIN" });
      if (!user) {
        // If master admin doesn't exist, create it once
        user = await UserRepositor.create({
          name: "Master Admin",
          phone: "6350650966",
          email: "ankityadav941318@gmail.com",
          role: "ADMIN",
          is_verified: true,
        });
      }
    } else {
      user = phone ? await UserRepositor.getOne({ phone }) : await UserRepositor.getOne({ email });
      if (!user) {
        throw new AppError("User not found", 404);
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,
      phone: user.phone,
      email: user.email,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (user.phone && user.phone !== "undefined") {
      await sendOtp(user.phone, otp);
      console.log(`\n==================================\nMOBILE OTP\nMobile: ${user.phone}\nOTP: ${otp}\n==================================\n`);
    } else {
      const { sendEmail } = require("../utils/mail.service");
      await sendEmail(user.email, "Login OTP", `Your OTP is: ${otp}`);
      console.log(`\n==================================\nEMAIL OTP\nEmail: ${user.email}\nOTP: ${otp}\n==================================\n`);
    }

    return {
      phone: user.phone,
      email: user.email,
      role: user.role, // Frontend uses this to redirect appropriately
      otp,
    };
  }

  // 4. Unified Login - Verify OTP
  async loginVerifyOtp(data) {
    const { phone, email, otp } = data;

    let query = { otp: String(otp), verified: false };
    if (phone) query.phone = phone;
    else if (email) query.email = email;
    else throw new AppError("Phone or Email required", 400);

    const otpData = await OtpRepositor.getOne(query);

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

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

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

  // Legacy fallback for any existing routes that might break
  async login(data) { return this.loginSendOtp(data); }
  async sendOtp(data) { return this.loginSendOtp(data); }
  async verifyOtp(data) { return this.loginVerifyOtp(data); }
  async adminSendOtp(data) { return this.loginSendOtp(data); }
  async adminVerifyOtp(data) { return this.loginVerifyOtp(data); }

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
