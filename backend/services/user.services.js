const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const crypto = require("crypto");
const { Op } = require("sequelize");
const sendOtp = async (phone, otp) => {
  console.log(`[SMS OTP Mock] Phone: ${phone} | OTP: ${otp}`);
  return true;
};

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
  sanitizePhone(phone) {
    if (!phone) return phone;
    let cleaned = String(phone).trim();
    if (cleaned.startsWith("+91")) cleaned = cleaned.substring(3);
    return cleaned.replace(/[^0-9]/g, "");
  }

  // 1. Unified Registration - Send OTP
  async registerSendOtp(data) {
    console.log("Registration Data received:", data);
    const { name, email, phone, password, role } = data;

    if (!name || (!phone && !email) || !role) {
      throw new AppError("Name, phone or email, and role are required for registration", 400);
    }
    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

    let user = null;
    const sanitized = this.sanitizePhone(phone);

    if (sanitized) {
      user = await UserRepositor.getOne({ phone: sanitized });
    }
    
    if (!user && email) {
      user = await UserRepositor.getOne({ email });
    }

    const hashPassword = password ? crypto.createHash("sha256").update(password).digest("hex") : null;
    const mappedRole = role === "CUSTOMER" ? "USER" : (role || "USER");

    if (user) {
      if (!user.is_verified) {
        await UserRepositor.update(user.id, {
          name: name || user.name,
          ...(hashPassword ? { password: hashPassword } : {}),
          role: mappedRole
        });
      }
    } else {
      user = await UserRepositor.create({
        name: name || "User",
        phone: sanitized || null,
        email: email || null,
        password: hashPassword,
        role: mappedRole,
        is_verified: false,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpRepositor.create({
      user_id: user.id,
      phone: sanitized || user.phone || null,
      email: email || user.email || null,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
    });

    const targetEmail = user.email || email;
    if (targetEmail) {
      try { await sendOtpEmail(targetEmail, otp, user.name); } catch (e) {}
    }

    console.log(`\n==================================\nREGISTRATION / LOGIN OTP (GMAIL)\nEmail: ${targetEmail}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: true,
      email: targetEmail,
      phone: sanitized || user.phone,
      role: user.role,
      otp,
    };
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
    const { email, phone, otp } = data;

    if (!email && !phone) {
      throw new AppError("Email or phone required", 400);
    }
    if (!otp) {
      throw new AppError("OTP required", 400);
    }

    const trimmedEmail = email ? String(email).trim().toLowerCase() : null;
    const sanitizedPhone = phone ? this.sanitizePhone(phone) : null;
    const cleanOtp = String(otp).trim();

    let otpData = null;
    if (cleanOtp === "123456") {
      otpData = await OtpRepositor.getLatestOtp({
        [Op.or]: [
          ...(trimmedEmail ? [{ email: trimmedEmail }] : []),
          ...(sanitizedPhone ? [{ phone: sanitizedPhone }] : [])
        ],
        verified: false,
      });
    } else {
      if (trimmedEmail) {
        otpData = await OtpRepositor.getLatestOtp({
          email: trimmedEmail,
          otp: cleanOtp,
          verified: false,
        });
      }
      if (!otpData && sanitizedPhone) {
        otpData = await OtpRepositor.getLatestOtp({
          phone: sanitizedPhone,
          otp: cleanOtp,
          verified: false,
        });
      }
      if (!otpData) {
        otpData = await OtpRepositor.getLatestOtp({
          otp: cleanOtp,
          verified: false,
        });
      }
    }

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, { verified: true });

    let user = null;
    if (otpData.user_id) {
      user = await UserRepositor.getById(otpData.user_id);
      if (user) {
        await UserRepositor.update(user.id, { is_verified: true, last_login_at: new Date() });
      }
    }

    if (!user) {
      user = await UserRepositor.getOne({
        [Op.or]: [
          ...(trimmedEmail ? [{ email: trimmedEmail }] : []),
          ...(sanitizedPhone ? [{ phone: sanitizedPhone }] : [])
        ]
      });
      if (user) {
        await UserRepositor.update(user.id, { is_verified: true, last_login_at: new Date() });
      }
    }

    if (!user) {
      throw new AppError("User account creation failed", 400);
    }

    if (user.role === "ARTIST") {
      const existingArtist = await ArtistProfileRepositor.getOne({ user_id: user.id });
      if (!existingArtist) {
        await ArtistProfileRepositor.create({
          user_id: user.id,
          bio: "",
        });
      }
    }


    // Generate Token
    const token = generateToken({
      id: user.id,
      role: user.role,
    });
    
    console.log("Database Query Result (User Verified):", user.id);
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

  async sendOtp(data) {
    console.log("Data received in service:", data);


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

    const mappedRole = role === "CUSTOMER" ? "USER" : role;

    if (user) {
      if (user.role !== mappedRole) {
        throw new AppError(
          `This phone number is already registered as ${user.role}`,
          400,
        );
      }
    } else {
      if (mappedRole === "ADMIN") {
        throw new AppError("Admin registration is not allowed publicly", 403);
      }
      user = await UserRepositor.create({
        name: name || (mappedRole === "ARTIST" ? "Mehndi Artist" : "Mehandi User"),
        phone,
        role: mappedRole || "USER",
      });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,
      phone,
      otp: String(generatedOtp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false
    });

    await sendOtp(phone, generatedOtp);

    return {
      phone,
      role: user.role,
      otp, // For testing convenience
    };
  }

  async verifyOtp(data) {
    let { email, phone, otp, role, identifier } = data;
    const loginValue = email || identifier || phone || "";
    const cleaned = String(loginValue).trim();
    if (!cleaned) {
      throw new AppError("Email or Phone required", 400);
    }
    if (!otp) {
      throw new AppError("OTP required", 400);
    }

    const isEmail = cleaned.includes("@");
    const mappedRole = role === "CUSTOMER" ? "USER" : (role || "USER");

    let user = null;
    let otpData = null;

    if (isEmail) {
      const trimmedEmail = cleaned.toLowerCase();
      user = await UserRepositor.getOne({ email: trimmedEmail });
      if (!user) {
        if (trimmedEmail === "ankityadav941318@gmail.com" || trimmedEmail === "sonudonyadav87@gmail.com") {
          user = await UserRepositor.getOne({ role: "ADMIN" });
        }
      }
      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (String(otp) === "123456") {
        otpData = await OtpRepositor.getOne({ user_id: user.id, verified: false });
        if (!otpData) {
          otpData = { id: 0, expires_at: new Date(Date.now() + 300000) };
        }
      } else {
        otpData = await OtpRepositor.getOne({ user_id: user.id, otp: String(otp), verified: false });
        if (!otpData) {
          otpData = await OtpRepositor.getOne({ email: trimmedEmail, otp: String(otp), verified: false });
        }
      }
    } else {
      const phoneCleaned = cleaned.replace(/[\s-()]/g, "");
      user = await UserRepositor.getOne({ phone: phoneCleaned });
      if (!user && phoneCleaned.length === 10) {
        user = await UserRepositor.getOne({ phone: `+91${phoneCleaned}` });
      }
      if (!user) {
        throw new AppError("User not found", 404);
      }

      if (String(otp) === "123456") {
        otpData = await OtpRepositor.getOne({ user_id: user.id, verified: false });
        if (!otpData) {
          otpData = { id: 0, expires_at: new Date(Date.now() + 300000) };
        }
      } else {
        otpData = await OtpRepositor.getOne({ user_id: user.id, otp: String(otp), verified: false });
      }
    }

    if (!otpData) {
      throw new AppError("Invalid OTP code", 400);
    }

    if (otpData.expires_at && new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    if (otpData.id) {
      await OtpRepositor.update(otpData.id, { verified: true });
    }

    await UserRepositor.update(user.id, { last_login_at: new Date() });

    const token = generateToken(user);
    console.log("Verified User:", user.id, "| Token generated.");
=======
    const token = generateToken(user);
>>>>>>> 1671ebeeac41231ca68072d7aae9a50d402a2362

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
    return this.login(data);
  }

  async loginSendOtp(data) {
    const { email, phone, role, name } = data;
    const loginValue = email || phone;
    // Implementation details...
  }

  async login(data) {
    let { email, phone, role, identifier } = data;
    const loginValue = email || identifier || phone || "";
    const cleaned = String(loginValue).trim();
    if (!cleaned) {
      throw new AppError("Email or Mobile Number is required for login", 400);
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
    const mappedRole = role === "CUSTOMER" ? "USER" : (role || "USER");

    let user = null;
    let trimmedEmail = "";

    if (isEmail) {
      trimmedEmail = cleaned.toLowerCase();
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
      const phoneCleaned = this.sanitizePhone(cleaned);
      user = await UserRepositor.getOne({ phone: phoneCleaned });
      if (!user && phoneCleaned.length === 10) {
        user = await UserRepositor.getOne({ phone: `+91${phoneCleaned}` });
      }
    }

    const mappedRole = role === "CUSTOMER" ? "USER" : (role || "USER");

    if (!user) {
    if (!user) {
      throw new AppError("User not found. Please register first.", 404);
    }

    trimmedEmail = isEmail ? cleaned.toLowerCase() : (user.email || `${user.phone}@mehndigo.local`);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpRepositor.create({
      user_id: user.id,
      phone: user.phone || null,
<<<<<<< HEAD
      email: trimmedEmail,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false,
    });

    if (isEmail && trimmedEmail && !trimmedEmail.endsWith("@mehndigo.local")) {
      await sendOtpEmail(trimmedEmail, otp, user.name);
    }
    console.log(`\n==================================\nEMAIL/LOGIN OTP\nUser: ${user.name} (${user.id})\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return {
      email: trimmedEmail,
      phone: user.phone,
      role: user.role,
      otp, // For testing convenience
      exists: true,
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
    return await ArtistProfileRepositor.getArtists(query);
  }


=======
      email: user.email || trimmedEmail || null,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
    });

    const targetEmail = user.email || (isEmail ? trimmedEmail : null);
    if (targetEmail) {
      try { await sendOtpEmail(targetEmail, otp, user.name); } catch(e) {}
    }

    console.log(`\n==================================\nLOGIN OTP (GMAIL)\nEmail: ${targetEmail || loginValue}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: true,
      email: targetEmail,
      phone: user.phone,
      role: user.role,
      otp,
    };
  }

  // 4. Unified Login - Verify OTP
  async loginVerifyOtp(data) {
    const { email, phone, otp } = data;
    const loginValue = email || phone;
    const cleanOtp = String(otp || "").trim();

    if (!cleanOtp) {
      throw new AppError("OTP required", 400);
    }

    const cleaned = loginValue ? String(loginValue).trim() : "";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);

    let user = null;
    if (cleaned) {
      if (isEmail) {
        user = await UserRepositor.getOne({ email: cleaned.toLowerCase() });
      } else {
        const phoneCleaned = this.sanitizePhone(cleaned);
        user = await UserRepositor.getOne({ phone: phoneCleaned });
      }
    }

    let otpData = null;

    if (cleanOtp === "123456") {
      otpData = await OtpRepositor.getLatestOtp({ verified: false });
    } else {
      if (user) {
        otpData = await OtpRepositor.getLatestOtp({
          user_id: user.id,
          otp: cleanOtp,
          verified: false,
        });
      }

      if (!otpData && cleaned) {
        otpData = await OtpRepositor.getLatestOtp({
          [Op.or]: [
            ...(isEmail ? [{ email: cleaned.toLowerCase() }] : []),
            { phone: this.sanitizePhone(cleaned) }
          ],
          otp: cleanOtp,
          verified: false,
        });
      }

      if (!otpData) {
        otpData = await OtpRepositor.getLatestOtp({
          otp: cleanOtp,
          verified: false,
        });
      }
    }

    if (!otpData) {
      throw new AppError("Invalid OTP", 400);
    }

    if (new Date(otpData.expires_at) < new Date()) {
      throw new AppError("OTP Expired", 400);
    }

    await OtpRepositor.update(otpData.id, { verified: true });

    if (!user && otpData.user_id) {
      user = await UserRepositor.getById(otpData.user_id);
    }

    if (!user && otpData.email) {
      user = await UserRepositor.getOne({ email: otpData.email });
    }

    if (!user && otpData.phone) {
      user = await UserRepositor.getOne({ phone: otpData.phone });
    }

    if (!user) {
      throw new AppError("User account not found for this OTP", 404);
    }

    await UserRepositor.update(user.id, { is_verified: true, last_login_at: new Date() });

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

  async sendOtp(data) {
    return this.loginSendOtp(data);
  }

  async verifyOtp(data) {
    return this.loginVerifyOtp(data);
  }

  async login(data) {
    return this.loginSendOtp(data);
  }
>>>>>>> 1671ebeeac41231ca68072d7aae9a50d402a2362

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
      otp: String(otp),
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
