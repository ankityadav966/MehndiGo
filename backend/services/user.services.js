const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");

const { generateToken } = require("../utils/jwt");
const { sendOtp } = require("../utils/twilio.service");
const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

function sanitizePhone(phone) {
  if (!phone) return phone;
  let cleaned = String(phone).trim();
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.substring(3);
  }
  cleaned = cleaned.replace(/[^0-9]/g, "");
  if (cleaned.length > 10) {
    cleaned = cleaned.substring(cleaned.length - 10);
  }
  return cleaned;
}

class UserService {
  async sendOtp(data) {
    console.log("Data received in service:", data);

    let { name, phone, role } = data;
    phone = sanitizePhone(phone);

    if (!phone) {
      throw new AppError("Phone number required", 400);
    }

    let user = await UserRepositor.getOne({
      phone,
    });

    if (user) {
      if (user.role !== role) {
        throw new AppError(
          `This phone number is already registered as ${user.role}`,
          400,
        );
      }
    } else {
      if (role === "ADMIN") {
        throw new AppError("Admin registration is not allowed publicly", 403);
      }
      user = await UserRepositor.create({
        name: name || (role === "ARTIST" ? "Mehndi Artist" : "Mehndi User"),
        phone,
        role: role || "USER",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,

      phone,

      otp,

      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    console.log("OTP Code Generated:", otp);

    await sendOtp(phone, otp);

    return {
      phone,
      role: user.role,
      otp,
    };
  }

  async verifyOtp(data) {
    let { phone, otp, role, referralCode } = data;
    phone = sanitizePhone(phone);

    const otpData = await OtpRepositor.getOne({
      phone,
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

    const user = await UserRepositor.getById(otpData.user_id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role !== role) {
      throw new AppError(`This number belongs to ${user.role}`, 400);
    }

    const isFirstLogin = !user.last_login_at;

    await UserRepositor.update(user.id, {
      last_login_at: new Date(),
    });

    if (isFirstLogin && referralCode) {
      try {
        const ReferralService = require("./referral.services");
        await ReferralService.recordReferralSignup(user.id, referralCode);
      } catch (err) {
        console.log("[Referral] Signup recording failed in verifyOtp:", err.message);
      }
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    return {
      token,

      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  async login(data) {
    let { phone, role } = data;
    phone = sanitizePhone(phone);

    if (!phone) {
      throw new AppError("Phone number required", 400);
    }

    if (!role) {
      throw new AppError("Role required", 400);
    }

    const user = await UserRepositor.getOne({
      phone,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role !== role) {
      throw new AppError(`This number is registered as ${user.role}`, 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,

      phone,

      otp,

      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtp(phone, otp);

    return {
      phone,
      role,
      otp,
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

  async getListing(userId, query) {
    const user = await UserRepositor.getById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // USER LOGIN
    if (user.role === "USER") {
      return await ArtistProfileRepositor.getArtists({
        latitude: query.latitude,
        longitude: query.longitude,
        radius: query.radius,
        page: query.page,
        limit: query.limit,
      });
    }

    // ARTIST LOGIN
    if (user.role === "ARTIST") {
      return await UserRepositor.getUsers({
        page: query.page,
        limit: query.limit,
      });
    }

    throw new AppError("Invalid role", 400);
  }

  async adminSendOtp(data) {
    const { email, password } = data;
    
    if (!email || !password) {
      throw new AppError("Email and Password are required", 400);
    }
    
    // Find admin user in database by email
    const user = await UserRepositor.getOne({ email, role: "ADMIN" });
    if (!user) {
      throw new AppError("Access denied: Invalid Admin credentials", 403);
    }
    
    // Verify password hash
    const crypto = require("crypto");
    const inputHash = crypto.createHash("sha256").update(password).digest("hex");
    if (user.password !== inputHash) {
      throw new AppError("Access denied: Invalid Admin credentials", 403);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,
      phone: user.phone,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send OTP to email
    const { sendEmail } = require("../utils/mail.service");
    await sendEmail(email, "Mehndi Go - Admin Verification Code", `Your Admin security verification OTP is: ${otp}`);

    return {
      email,
      otp,
    };
  }

  async adminVerifyOtp(data) {
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP are required", 400);
    }

    const user = await UserRepositor.getOne({ email, role: "ADMIN" });
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

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

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
}

module.exports = new UserService();
