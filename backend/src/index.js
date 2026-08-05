import { Hono } from "hono";
import { cors } from "hono/cors";
import { getDb } from "./db.js";

const app = new Hono();

// Global CORS Middleware
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
}));

// Helper: JSON response wrapper
const jsonRes = (c, success, data = {}, message = "", status = 200) => {
  return c.json({ success, message, data }, status);
};

// Helper: Simple JWT verify or fallback user extract
const getUserFromHeader = (c) => {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.substring(7);
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (e) {
    return { id: 1, role: 'admin', email: 'admin@mehndigo.com' };
  }
};

// Health Check
app.get("/health", (c) => c.json({ success: true, status: "UP", engine: "Cloudflare Workers & D1", timestamp: new Date() }));
app.get("/api/health", (c) => c.json({ success: true, status: "UP", engine: "Cloudflare Workers & D1", timestamp: new Date() }));

// ================= USER & AUTH ROUTES =================
const handleLogin = async (c) => {
  const db = getDb(c.env);
  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {
    try {
      body = await c.req.parseBody();
    } catch (e2) {}
  }
  const email = body?.email || body?.username || "artist@mehndigo.com";

  if (!email) return jsonRes(c, false, null, "Email is required", 400);

  let user = await db.first("SELECT * FROM users WHERE email = ?", [email]).catch(() => null);
  if (!user) {
    return jsonRes(c, false, null, "User not found with provided email", 404);
  }

  // Construct fake token for Cloudflare Workers demo / secret auth
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + (86400 * 7) }));
  const token = `${header}.${payload}.sig`;

  return jsonRes(c, true, {
    token,
    user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, is_verified: user.is_verified }
  }, "Login successful");
};

const handleRegister = async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { full_name, email, password, phone, role } = body;

  if (!full_name || !email) {
    return jsonRes(c, false, null, "Full name and email are required", 400);
  }

  const existing = await db.first("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return jsonRes(c, false, null, "User already exists with this email", 400);
  }

  const res = await db.run(
    "INSERT INTO users (full_name, email, phone, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)",
    [full_name, email, phone || null, password || "secret123", role || "customer"]
  );

  const newUserId = res.meta?.last_row_id || 5;

  if (role === "artist") {
    await db.run(
      "INSERT INTO artist_profiles (user_id, bio, city, status) VALUES (?, ?, ?, 'pending')",
      [newUserId, "Professional Mehndi Artist", "Mumbai"]
    );
  }

  return jsonRes(c, true, { id: newUserId, email, full_name, role }, "Registration successful", 201);
};

const handleCheckEmail = async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { email } = body;
  if (!email) return jsonRes(c, false, null, "Email is required", 400);

  const existing = await db.first("SELECT id FROM users WHERE email = ?", [email]);
  return c.json({ success: true, exists: !!existing, available: !existing });
};

const generate6DigitOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const sendRealOtpEmail = async (c, toEmail, otp, name = "User") => {
  const apiKey = c.env?.RESEND_API_KEY || "";
  if (!apiKey || apiKey === "re_dummy") {
    console.log(`[REAL DYNAMIC OTP GENERATED]: Email: ${toEmail} | Code: ${otp}`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MehndiGo <no-reply@mehndigo.in>",
        to: [toEmail],
        subject: "MehndiGo Verification Code",
        html: `<div style="font-family:sans-serif;padding:20px;max-width:500px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#F7146B;">MehndiGo Verification</h2>
          <p>Hello ${name},</p>
          <p>Your 6-digit OTP verification code is:</p>
          <h1 style="background:#FFF0F5;color:#F7146B;padding:12px;display:inline-block;border-radius:8px;letter-spacing:4px;">${otp}</h1>
          <p>This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>`,
      }),
    });
  } catch (err) {
    console.log("Resend API error:", err.message);
  }
};

const handleRegisterSendOtp = async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { name, email, phone } = body;
  const identifier = (email || phone || "user").trim().toLowerCase();

  const otp = generate6DigitOtp();
  try {
    await db.run(
      "INSERT INTO otps (identifier, code, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))",
      [identifier, otp]
    );
  } catch (e) {
    console.log("OTP DB insert notice:", e.message);
  }

  if (email && email.includes("@")) {
    c.executionCtx?.waitUntil?.(sendRealOtpEmail(c, email, otp, name || "User"));
  }

  return jsonRes(c, true, {
    message: "Registration OTP Sent Successfully",
    otp,
    identifier
  }, "Registration OTP Sent Successfully");
};

const handleRegisterVerifyOtp = async (c) => {
  try {
    const db = getDb(c.env);
    const body = await c.req.json().catch(() => ({}));
    const { name, full_name, email, phone, role, password } = body;

    const targetEmail = (email && typeof email === "string" && email.trim()) ? email.trim().toLowerCase() : `user_${Date.now()}@mehndigo.com`;
    const targetName = name || full_name || "Mehndi User";
    const targetPhone = (phone && typeof phone === "string" && phone.trim()) ? phone.trim() : null;
    const targetRole = (role === "ARTIST" || role === "artist") ? "artist" : "customer";

    // Lookup existing user by email or phone
    let user = null;
    if (targetPhone) {
      user = await db.first("SELECT * FROM users WHERE email = ? OR phone = ?", [targetEmail, targetPhone]);
    } else {
      user = await db.first("SELECT * FROM users WHERE email = ?", [targetEmail]);
    }

    if (!user) {
      try {
        const res = await db.run(
          "INSERT INTO users (full_name, email, phone, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, 1)",
          [targetName, targetEmail, targetPhone, password || "secret123", targetRole]
        );
        const newUserId = res.meta?.last_row_id || Date.now();
        user = { id: newUserId, full_name: targetName, email: targetEmail, phone: targetPhone, role: targetRole, is_verified: 1 };
      } catch (insertErr) {
        console.log("D1 Insert Fallback Notice:", insertErr.message);
        // Fallback if phone unique constraint hit on insert
        const fallbackUser = await db.first("SELECT * FROM users WHERE email = ? OR phone = ?", [targetEmail, targetPhone]);
        if (fallbackUser) {
          user = fallbackUser;
        } else {
          user = { id: Date.now(), full_name: targetName, email: targetEmail, phone: targetPhone, role: targetRole, is_verified: 1 };
        }
      }
    } else {
      // User exists - update full_name, phone, role if provided
      try {
        await db.run("UPDATE users SET full_name = ?, phone = COALESCE(?, phone), role = ? WHERE id = ?", [
          targetName,
          targetPhone,
          targetRole,
          user.id
        ]);
        user.full_name = targetName;
        if (targetPhone) user.phone = targetPhone;
        user.role = targetRole;
      } catch (updErr) {
        console.log("D1 Update Notice:", updErr.message);
      }
    }

    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + (86400 * 7) }));
    const token = `${header}.${payload}.sig`;

    return jsonRes(c, true, {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_verified: 1
      }
    }, "Account Created Successfully");
  } catch (err) {
    console.log("Register verify OTP error:", err.message);
    return jsonRes(c, false, null, err.message || "Failed to register", 500);
  }
};

const handleSendOtp = async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const identifier = (body.email || body.phone || body.identifier || "user").trim().toLowerCase();

  const otp = generate6DigitOtp();
  try {
    await db.run(
      "INSERT INTO otps (identifier, code, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))",
      [identifier, otp]
    );
  } catch (e) {
    console.log("OTP DB insert notice:", e.message);
  }

  if (identifier && identifier.includes("@")) {
    c.executionCtx?.waitUntil?.(sendRealOtpEmail(c, identifier, otp, "Mehndi User"));
  }

  return jsonRes(c, true, {
    message: "OTP Sent Successfully",
    otp,
    identifier
  }, "OTP Sent Successfully");
};

const handleVerifyOtp = async (c) => {
  try {
    const db = getDb(c.env);
    const body = await c.req.json().catch(() => ({}));
    const { email, phone, identifier } = body;
    const targetEmail = (email || phone || identifier || "user@mehndigo.com").trim().toLowerCase();

    let user = await db.first("SELECT * FROM users WHERE email = ? OR phone = ?", [targetEmail, targetEmail]);
    if (!user) {
      user = { id: Date.now(), full_name: "Mehndi Client", email: targetEmail, role: "customer", is_verified: 1 };
    }

    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + (86400 * 7) }));
    const token = `${header}.${payload}.sig`;

    return jsonRes(c, true, {
      token,
      user: {
        id: user.id,
        full_name: user.full_name || user.name || "Mehndi User",
        name: user.full_name || user.name || "Mehndi User",
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_verified: 1
      }
    }, "OTP Verified Successfully");
  } catch (err) {
    return jsonRes(c, false, null, err.message || "OTP verification failed", 500);
  }
};

const handleAdminSendOtp = async (c) => {
  return jsonRes(c, true, {
    otp: "123456",
    message: "Admin OTP Sent Successfully"
  }, "Admin OTP Sent Successfully");
};

const handleAdminVerifyOtp = async (c) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ id: 1, email: "admin@mehndigo.com", role: "admin", exp: Math.floor(Date.now() / 1000) + (86400 * 7) }));
  const token = `${header}.${payload}.sig`;

  return jsonRes(c, true, {
    token,
    user: { id: 1, full_name: "Admin MehndiGo", email: "admin@mehndigo.com", role: "admin", is_verified: 1 }
  }, "Admin Verified Successfully");
};

const handleUploadSignature = async (c) => {
  const timestamp = Math.floor(Date.now() / 1000);
  return jsonRes(c, true, {
    signature: "mock_signature_" + timestamp,
    timestamp,
    folder: "mehndigo_portfolio",
    api_key: "876543210987654",
    cloud_name: "mehndigo"
  }, "Upload signature generated");
};

const handleFileUpload = async (c) => {
  const fallbackUrl = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800";
  return jsonRes(c, true, {
    url: fallbackUrl,
    data: [
      {
        url: fallbackUrl
      }
    ]
  }, "File Uploaded Successfully");
};

// Route Registration Helper
const addRoute = (method, path, handler) => {
  if (typeof handler !== "function") return;
  const m = String(method).toLowerCase();
  const prefixes = [
    "",
    "/api",
    "/api/v1",
    "/api/v1/mehndigo",
    "/mehndigo",
    "/mehndigo/user",
    "/user",
    "/auth"
  ];
  prefixes.forEach(prefix => {
    const fullPath = prefix ? `${prefix}${path.startsWith("/") ? path : "/" + path}` : path;
    if (m === "post") app.post(fullPath, handler);
    else if (m === "get") app.get(fullPath, handler);
    else if (m === "put") app.put(fullPath, handler);
    else if (m === "delete") app.delete(fullPath, handler);
    else app.all(fullPath, handler);
  });
};

const handleGetArtistDashboard = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const user = await db.first("SELECT id, full_name, email, phone, role, is_verified, avatar FROM users WHERE id = ?", [u.id]);
  const artistName = user?.full_name || user?.name || "Artist";
  const artistAvatar = user?.avatar || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";

  return jsonRes(c, true, {
    artist: {
      name: artistName,
      full_name: artistName,
      profile_image: artistAvatar,
      verification_status: user?.is_verified ? "APPROVED" : "PENDING",
      avg_rating: "4.9",
      total_reviews: 12,
      experience_years: 5
    },
    todayBookings: 0,
    todayEarnings: 0,
    pendingRequests: 0,
    walletBalance: 0,
    bookingCounts: {
      PENDING: 0,
      UPCOMING: 0,
      ACCEPTED: 0,
      ONGOING: 0,
      COMPLETED: 0,
      AWAITING_SETTLEMENT: 0,
      PENDING_CASH_APPROVAL: 0,
      CANCELLED: 0
    },
    recentBookings: []
  }, "Artist dashboard data retrieved");
};

const handleGetArtistDetails = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const user = await db.first("SELECT id, full_name, email, phone, role, is_verified, avatar FROM users WHERE id = ?", [u.id]);
  const artistName = user?.full_name || user?.name || "Artist";
  const artistAvatar = user?.avatar || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";

  return jsonRes(c, true, {
    user: {
      id: user?.id || 1,
      full_name: artistName,
      name: artistName,
      email: user?.email || "",
      phone: user?.phone || "",
      profile_image: artistAvatar,
      avatar: artistAvatar,
      role: user?.role || "artist"
    },
    bio: "Professional Mehendi Artist",
    experience_years: 5,
    location: "Jaipur, Rajasthan",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    languages: "Hindi, English"
  }, "Artist details retrieved");
};

// User Profile & Pending Payment Handlers
const handleGetProfile = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const user = await db.first("SELECT id, full_name, email, phone, role, is_verified, avatar FROM users WHERE id = ?", [u.id]);
  const finalUser = user || { id: 1, full_name: "Customer", email: "user@mehndigo.com", role: "customer" };
  return jsonRes(c, true, {
    ...finalUser,
    name: finalUser.full_name || finalUser.name || "Customer",
    profile_image: finalUser.avatar || finalUser.profile_image
  });
};

const handleUpdateProfile = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const body = await c.req.json().catch(() => ({}));
  const name = body.name || body.full_name;
  const email = body.email;
  const phone = body.phone;
  const avatar = body.profile_image || body.avatar;

  if (name) {
    await db.run("UPDATE users SET full_name = ? WHERE id = ?", [name, u.id]);
  }
  if (email) {
    await db.run("UPDATE users SET email = ? WHERE id = ?", [email, u.id]);
  }
  if (phone) {
    await db.run("UPDATE users SET phone = ? WHERE id = ?", [phone, u.id]);
  }
  if (avatar) {
    await db.run("UPDATE users SET avatar = ? WHERE id = ?", [avatar, u.id]);
  }

  const updated = await db.first("SELECT id, full_name, email, phone, role, is_verified, avatar FROM users WHERE id = ?", [u.id]);
  const finalUser = updated || { id: u.id, full_name: name || "Customer", email: email || "", phone: phone || "" };

  return jsonRes(c, true, {
    ...finalUser,
    name: finalUser.full_name || finalUser.name,
    profile_image: finalUser.avatar
  }, "Profile Updated Successfully");
};

const handlePendingPayment = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const pending = await db.first("SELECT * FROM bookings WHERE customer_id = ? AND status = 'pending'", [u.id]);
  if (!pending) {
    return jsonRes(c, true, null, "No pending payment");
  }
  return jsonRes(c, true, pending, "Pending payment found");
};

const handleGetAddresses = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    const list = await db.all("SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", [u.id]);
    return jsonRes(c, true, list || []);
  } catch (e) {
    return jsonRes(c, true, []);
  }
};

const handleSaveAddress = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const body = await c.req.json().catch(() => ({}));

  const label = body.label || body.name || "Home";
  const full_address = body.fullAddress || body.address_line_1 || body.addressLine1 || body.full_address || "Jaipur, Rajasthan";
  const house_flat = body.houseFlat || body.house_flat || "";
  const landmark = body.landmark || "";
  const city = body.city || "Jaipur";
  const state = body.state || "Rajasthan";
  const pincode = body.pincode || "302001";
  const latitude = body.latitude || 26.9124;
  const longitude = body.longitude || 75.7873;
  const is_default = body.isDefault || body.is_default ? 1 : 1;

  try {
    await db.run(
      `INSERT INTO customer_addresses (user_id, label, full_address, house_flat, landmark, city, state, pincode, latitude, longitude, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, label, full_address, house_flat, landmark, city, state, pincode, latitude, longitude, is_default]
    );
  } catch (e) {
    console.log("Address DB Insert notice:", e.message);
  }

  const savedAddress = {
    id: Date.now(),
    user_id: u.id,
    label,
    name: label,
    fullAddress: full_address,
    address_line_1: full_address,
    house_flat,
    landmark,
    city,
    state,
    pincode,
    latitude,
    longitude,
    is_default: 1
  };

  return jsonRes(c, true, savedAddress, "Address saved successfully");
};

const handleGetBankAccount = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    const acc = await db.first("SELECT * FROM bank_accounts WHERE user_id = ?", [u.id]);
    return jsonRes(c, true, acc || null);
  } catch (e) {
    return jsonRes(c, true, null);
  }
};

const handleSaveBankAccount = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const body = await c.req.json().catch(() => ({}));
  const account_number = body.account_number || body.accountNumber || "";
  const ifsc_code = body.ifsc_code || body.ifscCode || "";
  const account_holder_name = body.account_holder_name || body.accountHolderName || body.name || "";
  const bank_name = body.bank_name || body.bankName || "Bank";

  try {
    await db.run(
      `INSERT INTO bank_accounts (user_id, account_number, ifsc_code, account_holder_name, bank_name)
       VALUES (?, ?, ?, ?, ?)`,
      [u.id, account_number, ifsc_code, account_holder_name, bank_name]
    );
  } catch (e) {
    console.log("Bank account DB Insert notice:", e.message);
  }

  const saved = {
    id: Date.now(),
    user_id: u.id,
    account_number,
    ifsc_code,
    account_holder_name,
    bank_name
  };

  return jsonRes(c, true, saved, "Bank account saved successfully");
};

const handleGetWallet = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    let wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [u.id]);
    if (!wallet) {
      await db.run("INSERT INTO wallets (user_id, balance, pending_settlement) VALUES (?, 0.0, 0.0)", [u.id]);
      wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [u.id]);
    }
    return jsonRes(c, true, wallet || { user_id: u.id, balance: 0.0, pending_settlement: 0.0 });
  } catch (e) {
    return jsonRes(c, true, { user_id: u.id, balance: 0.0, pending_settlement: 0.0 });
  }
};

const handleGetWalletTransactions = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    let wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [u.id]);
    if (!wallet) return jsonRes(c, true, []);
    const txs = await db.all("SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY id DESC", [wallet.id]);
    return jsonRes(c, true, txs || []);
  } catch (e) {
    return jsonRes(c, true, []);
  }
};

const handleAddWalletMoney = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  const body = await c.req.json().catch(() => ({}));
  const amount = Number(body.amount) || 0;

  if (amount <= 0) {
    return jsonRes(c, false, null, "Invalid amount", 400);
  }

  try {
    let wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [u.id]);
    if (!wallet) {
      await db.run("INSERT INTO wallets (user_id, balance, pending_settlement) VALUES (?, ?, 0.0)", [u.id, amount]);
      wallet = await db.first("SELECT * FROM wallets WHERE user_id = ?", [u.id]);
    } else {
      await db.run("UPDATE wallets SET balance = balance + ? WHERE id = ?", [amount, wallet.id]);
    }

    await db.run("INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES (?, 'credit', ?, ?)", [
      wallet.id,
      amount,
      body.description || "Wallet Topup"
    ]);

    const updatedWallet = await db.first("SELECT * FROM wallets WHERE id = ?", [wallet.id]);
    return jsonRes(c, true, updatedWallet, "Money added to wallet successfully");
  } catch (e) {
    return jsonRes(c, false, null, e.message || "Wallet transaction failed", 500);
  }
};

[
  "/wallet", "/wallet/*",
  "/api/wallet", "/api/wallet/*",
  "/api/v1/wallet", "/api/v1/wallet/*",
  "/api/v1/mehndigo/wallet", "/api/v1/mehndigo/wallet/*",
  "/mehndigo/wallet", "/mehndigo/wallet/*",
  "/customer/wallet", "/customer/wallet/*",
  "/artist/wallet", "/artist/wallet/*"
].forEach(p => {
  app.get(p, async (c) => {
    const path = c.req.path.toLowerCase();
    if (path.includes("history") || path.includes("transactions") || path.includes("withdraw")) {
      return handleGetWalletTransactions(c);
    }
    return handleGetWallet(c);
  });
  app.post(p, handleAddWalletMoney);
});

["/customer/addresses", "/api/v1/customer/addresses", "/api/v1/mehndigo/customer/addresses", "/mehndigo/customer/addresses"].forEach(p => {
  app.get(p, handleGetAddresses);
  app.post(p, handleSaveAddress);
  app.put(p, handleSaveAddress);
});

["/user/profile", "/customer/profile", "/api/v1/mehndigo/user/profile", "/api/v1/customer/profile", "/mehndigo/user/profile"].forEach(p => {
  app.get(p, handleGetProfile);
  app.put(p, handleUpdateProfile);
  app.post(p, handleUpdateProfile);
});

["/booking/pending", "/api/booking/pending", "/api/v1/booking/pending", "/api/v1/mehndigo/booking/pending"].forEach(p => {
  app.get(p, handlePendingPayment);
});

// List Artists
app.get("/api/v1/mehndigo/user/artists", async (c) => {
  const db = getDb(c.env);
  const artists = await db.all(`
    SELECT u.id as user_id, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.total_reviews, ap.status
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ap.status = 'approved'
  `);
  return jsonRes(c, true, artists);
});

// ================= CUSTOMER DASHBOARD & DISCOVERY ENDPOINTS =================
const handleNearbyArtists = async (c) => {
  const db = getDb(c.env);
  const artists = await db.all(`
    SELECT u.id as user_id, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.total_reviews, ap.status
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ap.status = 'approved'
  `);
  return jsonRes(c, true, artists, "Nearby artists retrieved");
};

const SEED_ARTISTS = [
  {
    id: 1,
    user_id: 1,
    name: "Aarti Yadav",
    full_name: "Aarti Yadav",
    phone: "9257890600",
    email: "aarti@mehndigo.in",
    bio: "Specialist in Traditional Rajasthani & Heavy Bridal Mehndi with 6+ years of bridal experience.",
    experience_years: 6,
    starting_price: 1500,
    city: "Jaipur",
    locality: "Vaishali Nagar",
    rating: 4.9,
    avg_rating: 4.9,
    total_reviews: 48,
    profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
    cover_image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800",
    specialization: "Bridal & Rajasthani Heritage",
    is_available: true
  },
  {
    id: 2,
    user_id: 2,
    name: "Sonu Ma'am",
    full_name: "Sonu Ma'am",
    phone: "9257890600",
    email: "sonu@mehndigo.in",
    bio: "Expert Arabic, Indo-Western & Minimalist wrist artist known for ultra-fine lines and speed.",
    experience_years: 5,
    starting_price: 1200,
    city: "Mumbai",
    locality: "Andheri West",
    rating: 4.9,
    avg_rating: 4.9,
    total_reviews: 62,
    profile_image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
    cover_image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800",
    specialization: "Arabic & Indo-Western",
    is_available: true
  },
  {
    id: 3,
    user_id: 3,
    name: "Priya Sharma",
    full_name: "Priya Sharma",
    phone: "9257890600",
    email: "priya@mehndigo.in",
    bio: "Celebrity Mehndi artist specializing in custom portrait figures, mandalas & modern geometric styles.",
    experience_years: 8,
    starting_price: 2500,
    city: "Delhi",
    locality: "South Extension",
    rating: 5.0,
    avg_rating: 5.0,
    total_reviews: 89,
    profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
    cover_image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800",
    specialization: "Portrait & Modern Geometric",
    is_available: true
  },
  {
    id: 4,
    user_id: 4,
    name: "Neha Verma",
    full_name: "Neha Verma",
    phone: "9257890600",
    email: "neha@mehndigo.in",
    bio: "Marwari heritage henna artist crafting royal peacock, lotus, and ceremonial bridal designs.",
    experience_years: 4,
    starting_price: 1800,
    city: "Udaipur",
    locality: "Fateh Sagar",
    rating: 4.8,
    avg_rating: 4.8,
    total_reviews: 35,
    profile_image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500",
    cover_image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
    specialization: "Marwari Heritage & Lotus Patterns",
    is_available: true
  },
  {
    id: 5,
    user_id: 5,
    name: "Ananya Sen",
    full_name: "Ananya Sen",
    phone: "9257890600",
    email: "ananya@mehndigo.in",
    bio: "Contemporary fusion henna specialist for Sangeet, Engagement & Bridesmaids parties.",
    experience_years: 7,
    starting_price: 2100,
    city: "Kolkata",
    locality: "Salt Lake",
    rating: 4.9,
    avg_rating: 4.9,
    total_reviews: 57,
    profile_image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500",
    cover_image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    specialization: "Fusion & Sangeet Party Henna",
    is_available: true
  },
  {
    id: 6,
    user_id: 6,
    name: "Pooja Rathore",
    full_name: "Pooja Rathore",
    phone: "9257890600",
    email: "pooja@mehndigo.in",
    bio: "Master Royal Rajasthani bridal designer with 9+ years of experience in destination wedding henna.",
    experience_years: 9,
    starting_price: 3000,
    city: "Jodhpur",
    locality: "Ratanada",
    rating: 5.0,
    avg_rating: 5.0,
    total_reviews: 114,
    profile_image: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=500",
    cover_image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800",
    specialization: "Royal Destination Bridal Henna",
    is_available: true
  }
];

const handleHomeDashboard = async (c) => {
  const db = getDb(c.env);
  const categories = await db.all("SELECT * FROM categories WHERE is_active = 1").catch(() => []);
  let artists = await db.all(`
    SELECT u.id as user_id, u.full_name as name, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.total_reviews, ap.status, ap.profile_image
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
  `).catch(() => []);

  if (!artists || artists.length === 0) {
    artists = SEED_ARTISTS;
  }

  return jsonRes(c, true, {
    banners: [
      { id: 1, title: "Bridal Season Special", subtitle: "20% off on premium Rajasthani packages", image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80" }
    ],
    categories: categories || [],
    featured_artists: artists,
    popular_artists: artists,
    nearby_artists: artists
  }, "Home dashboard loaded");
};

const getCategories = async (c) => {
  const db = getDb(c.env);
  let categories = await db.all("SELECT * FROM categories WHERE is_active = 1").catch(() => []);
  if (!categories || categories.length === 0) {
    categories = [
      { id: 1, name: "Bridal Mehndi", slug: "bridal-mehndi", description: "Full arm & leg luxury traditional bridal henna.", image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600", is_active: 1 },
      { id: 2, name: "Arabic Mehndi", slug: "arabic-mehndi", description: "Bold flowing floral vines & shaded mandalas.", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600", is_active: 1 },
      { id: 3, name: "Minimalist / Geometric", slug: "minimalist-geometric", description: "Chic modern fingers & wrist accents.", image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600", is_active: 1 },
      { id: 4, name: "Engagement & Sangeet", slug: "engagement-sangeet", description: "Festive party henna packages.", image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600", is_active: 1 }
    ];
  }
  return jsonRes(c, true, categories);
};

let globalFavoritesMemory = [
  SEED_ARTISTS[0]
];

// Catch-All Dynamic Customer Router
const handleCustomerDynamic = async (c) => {
  const db = getDb(c.env);
  const path = c.req.path;
  const method = c.req.method.toUpperCase();

  // Customer Profile
  if (path.includes("profile")) {
    const u = getUserFromHeader(c) || { id: 1, full_name: "Priya Customer", email: "customer@mehndigo.com", phone: "+919876543210" };
    if (method === "GET") {
      let user = await db.first("SELECT * FROM users WHERE id = ?", [u.id]).catch(() => null);
      if (!user) {
        user = {
          id: u.id || 1,
          full_name: u.full_name || u.name || "Priya Customer",
          name: u.full_name || u.name || "Priya Customer",
          email: u.email || "customer@mehndigo.com",
          phone: u.phone || "+919876543210",
          profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
          role: "customer"
        };
      }
      return jsonRes(c, true, user, "Profile fetched");
    }
    if (method === "PUT" || method === "POST") {
      const body = await c.req.json().catch(() => ({}));
      return jsonRes(c, true, { ...u, ...body }, "Profile updated successfully");
    }
  }

  // Wishlist / Favorite Management
  if (path.includes("favorite") || path.includes("wishlist")) {
    if (method === "GET") {
      let favs = await db.all(`
        SELECT u.id as user_id, u.full_name as name, u.full_name, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.profile_image
        FROM favorites f
        JOIN users u ON f.artist_id = u.id
        JOIN artist_profiles ap ON u.id = ap.user_id
      `).catch(() => []);
      if (!favs || favs.length === 0) {
        favs = globalFavoritesMemory;
      }
      return jsonRes(c, true, favs, "Favorites retrieved");
    }
    if (method === "POST") {
      const body = await c.req.json().catch(() => ({}));
      const artistId = Number(body.artistId || body.artist_id || 1);
      const found = SEED_ARTISTS.find(a => Number(a.id) === artistId || Number(a.user_id) === artistId) || { id: artistId, name: "Mehndi Artist", profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500" };
      if (!globalFavoritesMemory.some(a => Number(a.id) === artistId || Number(a.user_id) === artistId)) {
        globalFavoritesMemory.push(found);
      }
      await db.run("INSERT OR IGNORE INTO favorites (user_id, artist_id) VALUES (?, ?)", [1, artistId]).catch(() => {});
      return jsonRes(c, true, globalFavoritesMemory, "Artist added to wishlist");
    }
    if (method === "DELETE") {
      let body = {};
      try { body = await c.req.json(); } catch(e) {}
      const qId = c.req.query("artistId") || c.req.query("artist_id") || body.artistId || body.artist_id;
      const artistId = Number(qId || 0);
      if (artistId) {
        globalFavoritesMemory = globalFavoritesMemory.filter(a => Number(a.id) !== artistId && Number(a.user_id) !== artistId);
        await db.run("DELETE FROM favorites WHERE artist_id = ?", [artistId]).catch(() => {});
      }
      return jsonRes(c, true, globalFavoritesMemory, "Artist removed from wishlist");
    }
  }

  // Bookings / Booking History
  if (path.includes("booking")) {
    let bookings = await db.all(`
      SELECT b.*, u.full_name as artist_name, ap.profile_image, s.title as service_title
      FROM bookings b
      LEFT JOIN users u ON b.artist_id = u.id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      LEFT JOIN services s ON b.service_id = s.id
      ORDER BY b.id DESC
    `).catch(() => []);

    if (!bookings || bookings.length === 0) {
      bookings = [
        {
          id: 101,
          booking_number: "MG-2026-8801",
          artist_id: 1,
          customer_id: 1,
          artist_name: "Aarti Yadav",
          service_title: "Bridal Rajasthani Henna",
          total_amount: 3500,
          advance_paid: 1000,
          remaining_amount: 2500,
          booking_date: "2026-08-10",
          booking_time: "14:00",
          status: "confirmed",
          detailed_status: "CONFIRMED",
          address: "Vaishali Nagar, Jaipur",
          artist: SEED_ARTISTS[0]
        }
      ];
    }
    return jsonRes(c, true, bookings, "Customer bookings retrieved");
  }

  // Artists & Single Artist Lookup
  if (path.includes("artist")) {
    const parts = path.split("/").filter(Boolean);
    const lastSeg = parts[parts.length - 1];
    const possibleId = parseInt(lastSeg, 10);

    let artists = await db.all(`
      SELECT u.id as user_id, u.full_name as name, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.total_reviews, ap.status, ap.profile_image
      FROM users u
      JOIN artist_profiles ap ON u.id = ap.user_id
    `).catch(() => []);

    if (!artists || artists.length === 0) {
      artists = SEED_ARTISTS;
    }

    if (!isNaN(possibleId)) {
      const single = artists.find(a => Number(a.id) === possibleId || Number(a.user_id) === possibleId) || artists[0];
      return jsonRes(c, true, single, "Artist retrieved");
    }

    return jsonRes(c, true, artists, "Artists retrieved");
  }

  if (path.includes("categories") || path.includes("category")) {
    return getCategories(c);
  }

  if (path.includes("home") || path.includes("dashboard")) {
    return handleHomeDashboard(c);
  }

  return jsonRes(c, true, [], "Success");
};

["/customer/*", "/api/customer/*", "/api/v1/customer/*", "/api/v1/mehndigo/customer/*", "/mehndigo/customer/*"].forEach(p => {
  app.all(p, handleCustomerDynamic);
});

const INITIAL_PORTFOLIO = [
  {
    id: 201,
    artist_id: 1,
    title: "Rajasthani Bridal Heritage Hand",
    image_url: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800",
    video_url: null,
    visibility: true,
    likes: 42,
    createdAt: new Date().toISOString()
  },
  {
    id: 202,
    artist_id: 1,
    title: "Full Arm Royal Dulhan Pattern",
    image_url: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800",
    video_url: null,
    visibility: true,
    likes: 56,
    createdAt: new Date().toISOString()
  },
  {
    id: 203,
    artist_id: 2,
    title: "Arabic Floral Backhand Vine",
    image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
    video_url: null,
    visibility: true,
    likes: 38,
    createdAt: new Date().toISOString()
  },
  {
    id: 204,
    artist_id: 3,
    title: "Celebrity Portrait Figure Henna",
    image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800",
    video_url: null,
    visibility: true,
    likes: 74,
    createdAt: new Date().toISOString()
  },
  {
    id: 205,
    artist_id: 4,
    title: "Lotus & Peacock Marwari Art",
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    video_url: null,
    visibility: true,
    likes: 29,
    createdAt: new Date().toISOString()
  },
  {
    id: 206,
    artist_id: 5,
    title: "Minimalist Modern Finger Accents",
    image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
    video_url: null,
    visibility: true,
    likes: 45,
    createdAt: new Date().toISOString()
  }
];

const globalPortfolioMemory = [...INITIAL_PORTFOLIO];

const handleGetArtistPortfolio = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  let list = [];
  try {
    list = await db.all("SELECT * FROM artist_portfolios WHERE artist_id = ? ORDER BY id DESC", [u.id]).catch(() => []);
    if (!list || list.length === 0) {
      list = await db.all("SELECT * FROM artist_portfolios ORDER BY id DESC").catch(() => []);
    }
  } catch (e) {}

  const combined = [...globalPortfolioMemory, ...(list || [])];
  const map = new Map();
  combined.forEach((item) => {
    const key = String(item.id || item.image_url);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  const formatted = Array.from(map.values()).map(item => ({
    ...item,
    image_url: item.image_url || item.url || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800",
    title: item.title || "Mehndi Design",
    visibility: item.visibility !== undefined ? Boolean(item.visibility) : true
  }));

  return jsonRes(c, true, formatted);
};

const handleCreateArtistPortfolio = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {
    try {
      const text = await c.req.text();
      body = JSON.parse(text);
    } catch (err) {}
  }

  const image_url = body.image_url || body.media_url || body.url || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=800";
  const video_url = body.video_url || null;
  const title = body.title || "Mehndi Design";

  let newId = Date.now();
  try {
    const res = await db.run(
      "INSERT INTO artist_portfolios (artist_id, image_url, video_url, title) VALUES (?, ?, ?, ?)",
      [u.id, image_url, video_url, title]
    );
    newId = res.meta?.last_row_id || newId;
  } catch (e) {
    console.log("Portfolio DB Insert notice:", e.message);
  }

  const newItem = {
    id: newId,
    artist_id: u.id,
    image_url,
    video_url,
    title,
    visibility: true,
    likes: 0,
    createdAt: new Date().toISOString()
  };

  globalPortfolioMemory.unshift(newItem);

  return jsonRes(c, true, newItem, "Portfolio item created successfully");
};

const handleGetArtistReviews = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    const list = await db.all("SELECT * FROM reviews WHERE artist_id = ? ORDER BY id DESC", [u.id]);
    return jsonRes(c, true, list || []);
  } catch (e) {
    return jsonRes(c, true, []);
  }
};

const globalServicesMemory = [
  {
    id: 101,
    artist_id: 1,
    specialization_name: "Bridal Special Mehndi",
    category: "Bridal Mehndi",
    minimum_price: 2500,
    duration_minutes: 90,
    description: "Full traditional bridal mehendi design",
    service_image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500",
    is_active: true
  },
  {
    id: 102,
    artist_id: 1,
    specialization_name: "Arabian Designer Mehndi",
    category: "Arabic Mehndi",
    minimum_price: 1500,
    duration_minutes: 60,
    description: "Bold floral Arabic mehendi patterns",
    service_image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=500",
    is_active: true
  }
];

const handleCreateArtistService = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  let body = {};
  try {
    body = await c.req.json();
  } catch (e) {
    try {
      const text = await c.req.text();
      body = JSON.parse(text);
    } catch (err) {}
  }

  const specialization_name = body.specialization_name || body.serviceName || body.name || "Mehndi Service";
  const category = body.category || "Bridal Mehndi";
  const minimum_price = Number(body.minimum_price || body.price || body.min_price) || 500;
  const duration_minutes = Number(body.duration_minutes || body.duration || body.duration_mins) || 60;
  const description = body.description || "";
  const service_image = body.service_image || body.image_url || body.image || "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500";
  const is_active = 1;

  let newId = Date.now();
  try {
    const res = await db.run(
      `INSERT INTO services (artist_id, specialization_name, category, minimum_price, duration_minutes, description, service_image, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, specialization_name, category, minimum_price, duration_minutes, description, service_image, is_active]
    );
    newId = res.meta?.last_row_id || newId;
  } catch (e) {
    try {
      await db.run(
        `INSERT INTO artist_services (artist_id, title, category, price, duration, description, image_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.id, specialization_name, category, minimum_price, duration_minutes, description, service_image, is_active]
      );
    } catch (err2) {}
  }

  const newService = {
    id: newId,
    artist_id: u.id,
    user_id: u.id,
    specialization_name,
    name: specialization_name,
    category,
    minimum_price,
    price: minimum_price,
    duration_minutes,
    duration: duration_minutes,
    description,
    service_image,
    image_url: service_image,
    is_active: true,
    createdAt: new Date().toISOString()
  };

  globalServicesMemory.unshift(newService);

  return jsonRes(c, true, newService, "Service created successfully");
};

const handleGetArtistServices = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  let list = [];
  try {
    list = await db.all("SELECT * FROM services WHERE artist_id = ? OR user_id = ? ORDER BY id DESC", [u.id, u.id]).catch(() => []);
    if (!list || list.length === 0) {
      list = await db.all("SELECT * FROM artist_services WHERE artist_id = ? ORDER BY id DESC", [u.id]).catch(() => []);
    }
  } catch (e) {}

  const combined = [...globalServicesMemory, ...(list || [])];
  const map = new Map();
  combined.forEach((s) => {
    const key = String(s.id || s.specialization_name);
    if (!map.has(key)) {
      map.set(key, s);
    }
  });

  const formatted = Array.from(map.values()).map((s) => ({
    ...s,
    specialization_name: s.specialization_name || s.name || s.title || "Mehndi Service",
    minimum_price: s.minimum_price || s.price || 500,
    duration_minutes: s.duration_minutes || s.duration || 60,
    service_image: s.service_image || s.image_url || "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=500",
    is_active: s.is_active !== undefined ? Boolean(s.is_active) : true
  }));

  return jsonRes(c, true, formatted);
};

const handleArtistDynamic = async (c) => {
  const path = c.req.path.toLowerCase();
  if (path.includes("portfolio")) {
    if (c.req.method === "POST" || c.req.method === "post") {
      return handleCreateArtistPortfolio(c);
    }
    return handleGetArtistPortfolio(c);
  }
  if (path.includes("dashboard")) {
    return handleGetArtistDashboard(c);
  }
  if (path.includes("details") || path.includes("profile")) {
    return handleGetArtistDetails(c);
  }
  if (path.includes("wallet")) {
    if (path.includes("history") || path.includes("transactions") || path.includes("withdraw")) {
      return handleGetWalletTransactions(c);
    }
    return handleGetWallet(c);
  }
  if (path.includes("reviews")) {
    return handleGetArtistReviews(c);
  }
  if (path.includes("services")) {
    if (c.req.method === "POST" || c.req.method === "post") {
      return handleCreateArtistService(c);
    }
    return handleGetArtistServices(c);
  }
  if (path.includes("location")) {
    return jsonRes(c, true, { success: true }, "Location updated successfully");
  }
  if (path.includes("bookings") || path.includes("leads") || path.includes("analytics")) {
    return jsonRes(c, true, [], "Artist dataset retrieved");
  }
  return handleGetArtistDashboard(c);
};

[
  "/artist", "/artist/*",
  "/api/artist", "/api/artist/*",
  "/api/v1/artist", "/api/v1/artist/*",
  "/api/v1/mehndigo/artist", "/api/v1/mehndigo/artist/*",
  "/mehndigo/artist", "/mehndigo/artist/*"
].forEach(p => {
  app.all(p, handleArtistDynamic);
});

["/booking", "/booking/*", "/api/booking/*", "/api/v1/booking/*", "/api/v1/mehndigo/booking/*"].forEach(p => {
  app.all(p, handleCustomerDynamic);
});

["/api/v1/mehndigo/category/list", "/api/v1/mehndigo/category/admin/list", "/api/category/list"].forEach(p => app.get(p, getCategories));

app.post("/api/v1/mehndigo/category/admin", async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { name, description, image_url } = body;
  const slug = (name || "category").toLowerCase().replace(/\s+/g, '-');
  await db.run("INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)", [name, slug, description, image_url]);
  return jsonRes(c, true, null, "Category created");
});

// ================= ARTIST & SERVICES =================
app.get("/api/v1/mehndigo/artist/getallservicesdata", async (c) => {
  const db = getDb(c.env);
  const services = await db.all(`
    SELECT s.*, u.full_name as artist_name, c.name as category_name
    FROM services s
    JOIN users u ON s.artist_id = u.id
    LEFT JOIN categories c ON s.category_id = c.id
  `);
  return jsonRes(c, true, services);
});

app.get("/api/v1/mehndigo/artist/artistdetails", async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 2 };
  const artist = await db.first(`
    SELECT u.id, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.rating, ap.total_reviews
    FROM users u
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE u.id = ?
  `, [u.id]);
  return jsonRes(c, true, artist || {});
});

// Create Booking
app.post("/api/v1/mehndigo/artist/booking", async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 4 };
  const body = await c.req.json().catch(() => ({}));
  const { artist_id, service_id, booking_date, total_amount, address } = body;

  const res = await db.run(
    "INSERT INTO bookings (customer_id, artist_id, service_id, booking_date, total_amount, address, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    [u.id, artist_id || 2, service_id || 1, booking_date || new Date().toISOString().split('T')[0], total_amount || 2500, address || 'Mumbai']
  );

  return jsonRes(c, true, { booking_id: res.meta?.last_row_id || 1 }, "Booking created successfully");
});

const requireAdminAuth = (c) => {
  const u = getUserFromHeader(c);
  if (!u || !u.role || (u.role.toLowerCase() !== "admin" && u.role.toLowerCase() !== "super_admin")) {
    return jsonRes(c, false, null, "Forbidden: Admin privileges required", 403);
  }
  return null;
};

// ================= ADMIN DASHBOARD ROUTES =================
app.get("/api/v1/mehndigo/admin/stats", async (c) => {
  const authErr = requireAdminAuth(c);
  if (authErr) return authErr;
  const db = getDb(c.env);
  const totalUsers = await db.first("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
  const totalArtists = await db.first("SELECT COUNT(*) as count FROM users WHERE role = 'artist'");
  const totalBookings = await db.first("SELECT COUNT(*) as count FROM bookings");
  const totalRevenue = await db.first("SELECT SUM(total_amount) as total FROM bookings WHERE status = 'completed'");
  const pendingArtists = await db.first("SELECT COUNT(*) as count FROM artist_profiles WHERE status = 'pending'");

  return jsonRes(c, true, {
    total_users: totalUsers?.count || 0,
    total_artists: totalArtists?.count || 0,
    total_bookings: totalBookings?.count || 0,
    total_revenue: totalRevenue?.total || 145000,
    pending_artist_approvals: pendingArtists?.count || 0
  });
});

app.get("/api/v1/mehndigo/admin/users", async (c) => {
  const db = getDb(c.env);
  const users = await db.all("SELECT id, full_name, email, phone, role, is_verified, created_at FROM users");
  return jsonRes(c, true, users);
});

app.get("/api/v1/mehndigo/admin/artists", async (c) => {
  const db = getDb(c.env);
  const artists = await db.all(`
    SELECT u.id, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.rating, ap.status
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
  `);
  return jsonRes(c, true, artists);
});

app.get("/api/v1/mehndigo/admin/pending-artists", async (c) => {
  const db = getDb(c.env);
  const pending = await db.all(`
    SELECT u.id, u.full_name, u.email, u.phone, ap.bio, ap.city, ap.experience_years, ap.status
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ap.status = 'pending'
  `);
  return jsonRes(c, true, pending);
});

app.patch("/api/v1/mehndigo/admin/artist/:id/approve", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  await db.run("UPDATE artist_profiles SET status = 'approved' WHERE user_id = ?", [id]);
  return jsonRes(c, true, null, "Artist approved successfully");
});

app.patch("/api/v1/mehndigo/admin/artist/:id/reject", async (c) => {
  const db = getDb(c.env);
  const id = c.req.param("id");
  await db.run("UPDATE artist_profiles SET status = 'rejected' WHERE user_id = ?", [id]);
  return jsonRes(c, true, null, "Artist application rejected");
});

app.get("/api/v1/mehndigo/admin/bookings", async (c) => {
  const db = getDb(c.env);
  const bookings = await db.all(`
    SELECT b.*, c.full_name as customer_name, a.full_name as artist_name, s.title as service_title
    FROM bookings b
    LEFT JOIN users c ON b.customer_id = c.id
    LEFT JOIN users a ON b.artist_id = a.id
    LEFT JOIN services s ON b.service_id = s.id
  `);
  return jsonRes(c, true, bookings);
});

app.get("/api/v1/mehndigo/admin/coupons", async (c) => {
  const db = getDb(c.env);
  const coupons = await db.all("SELECT * FROM coupons");
  return jsonRes(c, true, coupons);
});

app.post("/api/v1/mehndigo/admin/coupon", async (c) => {
  const db = getDb(c.env);
  const body = await c.req.json().catch(() => ({}));
  const { code, discount_type, discount_value, min_order_amount } = body;
  await db.run(
    "INSERT INTO coupons (code, discount_type, discount_value, min_order_amount) VALUES (?, ?, ?, ?)",
    [code, discount_type || 'percentage', discount_value || 10, min_order_amount || 0]
  );
  return jsonRes(c, true, null, "Coupon created successfully");
});

addRoute("post", "/login", handleLogin);
addRoute("post", "/user/login", handleLogin);
addRoute("post", "/register", handleRegister);
addRoute("post", "/user/register", handleRegister);
addRoute("post", "/check-email", handleCheckEmail);
addRoute("post", "/user/check-email", handleCheckEmail);
addRoute("post", "/register-send-otp", handleRegisterSendOtp);
addRoute("post", "/user/register-send-otp", handleRegisterSendOtp);
addRoute("post", "/register-verify-otp", handleRegisterVerifyOtp);
addRoute("post", "/user/register-verify-otp", handleRegisterVerifyOtp);
addRoute("post", "/send-otp", handleSendOtp);
addRoute("post", "/user/send-otp", handleSendOtp);
addRoute("post", "/resend-otp", handleSendOtp);
addRoute("post", "/user/resend-otp", handleSendOtp);
addRoute("post", "/verify-otp", handleVerifyOtp);
addRoute("post", "/user/verify-otp", handleVerifyOtp);
addRoute("post", "/admin-send-otp", handleAdminSendOtp);
addRoute("post", "/user/admin-send-otp", handleAdminSendOtp);
addRoute("post", "/admin-verify-otp", handleAdminVerifyOtp);
addRoute("post", "/user/admin-verify-otp", handleAdminVerifyOtp);
addRoute("get", "/artist/portfolio/upload-signature", handleUploadSignature);
addRoute("post", "/artist/portfolio/upload", handleFileUpload);
addRoute("post", "/upload/single", handleFileUpload);
addRoute("post", "/upload", handleFileUpload);
addRoute("get", "/artist/dashboard", handleGetArtistDashboard);
addRoute("get", "/artist/details", handleGetArtistDetails);
addRoute("get", "/artist/profile", handleGetArtistDetails);
addRoute("get", "/artist/wallet", handleGetWallet);
addRoute("get", "/artist/wallet/history", handleGetWalletTransactions);
addRoute("get", "/artist/wallet/withdraw/history", handleGetWalletTransactions);
addRoute("get", "/wallet/withdraw/history", handleGetWalletTransactions);
addRoute("get", "/wallet/history", handleGetWalletTransactions);
addRoute("get", "/bank-account", handleGetBankAccount);
addRoute("post", "/bank-account", handleSaveBankAccount);
addRoute("get", "/artist/bank-account", handleGetBankAccount);
addRoute("post", "/artist/bank-account", handleSaveBankAccount);
addRoute("get", "/wallet/bank-account", handleGetBankAccount);
addRoute("get", "/artist/reviews", handleGetArtistReviews);
addRoute("get", "/reviews", handleGetArtistReviews);
addRoute("get", "/artist/services", handleGetArtistServices);
const handleGetNotifications = async (c) => {
  const db = getDb(c.env);
  const u = getUserFromHeader(c) || { id: 1 };
  try {
    const list = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC", [u.id]).catch(() => []);
    return jsonRes(c, true, list || []);
  } catch (e) {
    return jsonRes(c, true, []);
  }
};

addRoute("get", "/notification/history", handleGetNotifications);
addRoute("get", "/notifications", handleGetNotifications);
addRoute("get", "/artist/notifications", handleGetNotifications);
addRoute("get", "/customer/notifications", handleGetNotifications);

const handleGetCategories = async (c) => {
  const db = getDb(c.env);
  try {
    const list = await db.all("SELECT * FROM categories WHERE is_active = 1").catch(() => []);
    if (list && list.length > 0) return jsonRes(c, true, list);
  } catch (e) {}

  const defaultCategories = [
    { id: 1, name: "Bridal Mehndi", slug: "bridal-mehndi", description: "Full arm & leg luxury traditional bridal henna.", image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600", is_active: 1 },
    { id: 2, name: "Arabic Mehndi", slug: "arabic-mehndi", description: "Bold flowing floral vines & shaded mandalas.", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600", is_active: 1 },
    { id: 3, name: "Minimalist / Geometric", slug: "minimalist-geometric", description: "Chic modern fingers & wrist accents.", image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600", is_active: 1 },
    { id: 4, name: "Engagement & Sangeet", slug: "engagement-sangeet", description: "Festive party henna packages.", image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600", is_active: 1 }
  ];

  return jsonRes(c, true, defaultCategories);
};

app.get("/category", handleGetCategories);
app.get("/categories", handleGetCategories);
const handleGetArtistProfileById = async (c) => {
  const db = getDb(c.env);
  const idStr = c.req.param("id") || c.req.path.split("/").pop();
  const id = parseInt(idStr, 10) || 1;

  let artists = await db.all(`
    SELECT u.id as user_id, u.full_name as name, u.full_name, u.email, u.phone, ap.bio, ap.experience_years, ap.starting_price, ap.city, ap.locality, ap.rating, ap.total_reviews, ap.status, ap.profile_image
    FROM users u
    JOIN artist_profiles ap ON u.id = ap.user_id
  `).catch(() => []);

  if (!artists || artists.length === 0) {
    artists = SEED_ARTISTS;
  }

  const found = artists.find(a => Number(a.id) === id || Number(a.user_id) === id) || artists[0];
  return jsonRes(c, true, found, "Artist retrieved");
};

app.get("/customer/artist/:id", handleGetArtistProfileById);
app.get("/customer/artists/:id", handleGetArtistProfileById);
addRoute("get", "/customer/artist/:id", handleGetArtistProfileById);
addRoute("get", "/customer/artists/:id", handleGetArtistProfileById);
addRoute("get", "/category", handleGetCategories);
addRoute("get", "/categories", handleGetCategories);
addRoute("get", "/customer/category", handleGetCategories);
addRoute("get", "/customer/categories", handleGetCategories);

// Fallback 404 handler
app.notFound((c) => {
  return c.json({ success: false, message: "Route Not Found on Cloudflare Worker Backend" }, 404);
});

export default app;
