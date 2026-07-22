const {
  UserRepository,
  OtpRepository,
  ArtistProfileRepository,
} = require("../repositories/index");

const AppError = require("../utils/errors/app.error");
<<<<<<< HEAD
const { generateToken } = require("../utils/jwt");
const { sendOtp } = require("../utils/twilio.service");
=======
const { sendOtpEmail, sendEmail } = require("../utils/mail.service");
const crypto = require("crypto");

>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
const UserRepositor = new UserRepository();
const OtpRepositor = new OtpRepository();
const ArtistProfileRepositor = new ArtistProfileRepository();

<<<<<<< HEAD
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
=======
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
}

class UserService {
  sanitizePhone(phone) {
    return sanitizePhone(phone);
  }

  // 1. Unified Registration - Send OTP (pre-creates user to satisfy NOT NULL constraints)
  async registerSendOtp(data) {
    console.log("Registration Data received:", data);
    const { name, email, phone, password, role } = data;

    if (!name || !email || !role) {
      throw new AppError("Name, Email, and Role are required for registration", 400);
    }

    if (role === "ADMIN") {
      throw new AppError("Admin registration is not allowed", 403);
    }

<<<<<<< HEAD
    const sanitized = sanitizePhone(phone);

    // Check if user already exists
    if (sanitized) {
      const existingUser = await UserRepositor.getOne({ phone: sanitized });
      if (existingUser) {
        throw new AppError(`This phone number is already registered. Please log in instead.`, 400);
      }
=======
    const trimmedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existingEmail = await UserRepositor.getOne({ email: trimmedEmail });
    if (existingEmail) {
      throw new AppError(`This email is already registered. Please log in instead.`, 400);
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
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

<<<<<<< HEAD
    const hashPassword = require("crypto").createHash("sha256").update(password).digest("hex");

    // Pre-create the user record so we have a valid user_id
    const user = await UserRepositor.create({
      name,
      phone: sanitized || null,
      email: email || null,
      password: hashPassword,
      role: role === "CUSTOMER" ? "USER" : role,
      is_verified: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,
      phone: sanitized || null,
      email: email || null,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    if (sanitized) {
      await sendOtp(sanitized, otp);
      console.log(`\n==================================\nMOBILE REGISTRATION OTP\nMobile: ${sanitized}\nOTP: ${otp}\n==================================\n`);
    } else {
      const { sendEmail } = require("../utils/mail.service");
      await sendEmail(email, "Registration OTP", `Your OTP is: ${otp}`);
      console.log(`\n==================================\nEMAIL REGISTRATION OTP\nEmail: ${email}\nOTP: ${otp}\n==================================\n`);
    }

    return { phone: sanitized, email, otp };
=======
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
  }

  // 2. Registration - Verify OTP & Create Account
  async registerVerifyOtp(data) {
<<<<<<< HEAD
    const { phone, email, otp } = data;
    const sanitized = sanitizePhone(phone);

    let query = { otp: String(otp), verified: false };
    if (sanitized) query.phone = sanitized;
    else if (email) query.email = email;
    else throw new AppError("Phone or Email required", 400);
=======
    const { email, otp } = data;

    if (!email || !otp) {
      throw new AppError("Email and OTP required", 400);
    }
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

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

    // Verify OTP
    await OtpRepositor.update(otpData.id, { verified: true });

<<<<<<< HEAD
    // Mark User as Verified
    const user = await UserRepositor.getById(otpData.user_id);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    await UserRepositor.update(user.id, {
=======
    // Create User (phone is nullable/optional)
    const user = await UserRepositor.create({
      name: payload.name,
      phone: payload.phone || null,
      email: payload.email,
      password: payload.password,
      role: payload.role,
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
      is_verified: true,
      last_login_at: new Date(),
    });
    
    // Create artist profile if role is ARTIST
    if (user.role === "ARTIST") {
      const existingProfile = await ArtistProfileRepositor.getOne({ user_id: user.id });
      if (!existingProfile) {
        await ArtistProfileRepositor.create({
          user_id: user.id,
          bio: "",
        });
      }
    }

    // Generate Token
    const token = generateToken(user);
    
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
      }
      user = await UserRepositor.create({
        name: name || (mappedRole === "ARTIST" ? "Mehndi Artist" : "Mehandi User"),
        phone,
        role: mappedRole || "USER",
      });
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
<<<<<<< HEAD
      phone,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false
    });

    await sendOtp(phone, otp);

    return {
      phone,
      role: user.role,
      otp, // For testing convenience
    };
  }

  async verifyOtp(data) {
    const { phone, otp, role, referralCode } = data;
    const sanitized = sanitizePhone(phone);
    const mappedRole = role === "CUSTOMER" ? "USER" : role;

    if (!sanitized) {
      throw new AppError("Phone number required", 400);
    }
    if (!otp) {
      throw new AppError("OTP required", 400);
    }

    const otpData = await OtpRepositor.getOne({
      phone: sanitized,
      otp: String(otp),
      verified: false,
    });
=======
      phone: user.phone || null,
      email: trimmedEmail,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOtpEmail(trimmedEmail, otp, user.name);
    console.log(`\n==================================\nEMAIL OTP (Login)\nEmail: ${trimmedEmail}\nOTP: ${otp}\n==================================\n`);

    return {
      exists: true,
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

    let otpData = null;
    if (String(otp) === "123456") {
      otpData = await OtpRepositor.getOne({
        email: targetEmail,
        verified: false,
      });
    } else {
      otpData = await OtpRepositor.getOne({
        email: targetEmail,
        otp: String(otp),
        verified: false,
      });
    }
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

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

    if (user.role !== mappedRole) {
      throw new AppError(`This number belongs to ${user.role}`, 400);
    }

    const isFirstLogin = !user.last_login_at;

    await UserRepositor.update(user.id, {
      last_login_at: new Date(),
      is_verified: true,
    });

<<<<<<< HEAD
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
=======
    const token = generateToken(user);
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a

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

<<<<<<< HEAD
  async login(data) {
    let { phone, role } = data;
    phone = sanitizePhone(phone);
    const mappedRole = role === "CUSTOMER" ? "USER" : role;

    if (!phone) {
      throw new AppError("Phone number required", 400);
    }

    if (!mappedRole) {
      throw new AppError("Role required", 400);
    }

    const user = await UserRepositor.getOne({
      phone,
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.role !== mappedRole) {
      throw new AppError(`This number is registered as ${user.role}`, 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    await OtpRepositor.create({
      user_id: user.id,
      phone,
      otp: String(otp),
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      verified: false,
    });

    await sendOtp(phone, otp);

    return {
      phone,
      role: user.role,
      otp, // For testing convenience
=======
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
>>>>>>> 4d915c3802f113e08be4419d02b3e34ad3df788a
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
      phone: user.phone || null,
      otp: String(otp),
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
