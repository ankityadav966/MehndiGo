const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Mock Cloudflare D1 Database Engine for Artist Profile Persistence Test Suite
 */
class MockD1Database {
  constructor() {
    this.tables = {
      users: [],
      artist_profiles: [],
      otps: [],
      customer_addresses: []
    };
    this.autoIncrement = {
      users: 1,
      artist_profiles: 1,
      otps: 1,
      customer_addresses: 1
    };
  }

  async first(query, params = []) {
    const q = query.trim().toUpperCase();

    if (q.includes("FROM USERS")) {
      if (q.includes("LOWER(EMAIL) = ? OR PHONE = ?")) {
        const val = String(params[0] || "").toLowerCase();
        return this.tables.users.find(u => (u.email && u.email.toLowerCase() === val) || u.phone === params[1]) || null;
      }
      if (q.includes("LOWER(EMAIL) = ?")) {
        const email = String(params[0] || "").toLowerCase();
        return this.tables.users.find(u => u.email && u.email.toLowerCase() === email) || null;
      }
      if (q.includes("WHERE ID = ?")) {
        return this.tables.users.find(u => u.id === Number(params[0])) || null;
      }
      if (q.includes("PHONE = ?")) {
        return this.tables.users.find(u => u.phone === params[0]) || null;
      }
    }

    if (q.includes("FROM ARTIST_PROFILES")) {
      if (q.includes("WHERE USER_ID = ?")) {
        return this.tables.artist_profiles.find(ap => ap.user_id === Number(params[0])) || null;
      }
      if (q.includes("WHERE ID = ?")) {
        return this.tables.artist_profiles.find(ap => ap.id === Number(params[0])) || null;
      }
      if (q.includes("WHERE AADHAAR_NUMBER = ?")) {
        return this.tables.artist_profiles.find(ap => ap.aadhaar_number === params[0] && ap.user_id !== Number(params[1])) || null;
      }
    }

    if (q.includes("FROM OTPS")) {
      return this.tables.otps.find(o => o.code === params[params.length - 1]) || null;
    }

    return null;
  }

  async all(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.includes("FROM ARTIST_PROFILES")) {
      return this.tables.artist_profiles;
    }
    if (q.includes("FROM USERS")) {
      return this.tables.users;
    }
    return [];
  }

  async run(query, params = []) {
    const q = query.trim().toUpperCase();

    // INSERT INTO USERS
    if (q.startsWith("INSERT INTO USERS")) {
      const [full_name, email, phone, password_hash, role] = params;
      const id = this.autoIncrement.users++;
      const user = {
        id,
        full_name,
        name: full_name,
        email,
        phone,
        password_hash,
        role: role || "artist",
        is_verified: 1,
        is_active: 1,
        avatar: ""
      };
      this.tables.users.push(user);
      return { meta: { last_row_id: id, changes: 1 } };
    }

    // UPDATE USERS
    if (q.startsWith("UPDATE USERS")) {
      const userId = params[params.length - 1];
      const user = this.tables.users.find(u => u.id === Number(userId));
      if (user) {
        const [name, phone, email, avatar] = params;
        if (name !== null && name !== undefined) { user.full_name = name; user.name = name; }
        if (phone !== null && phone !== undefined) { user.phone = phone; }
        if (email !== null && email !== undefined) { user.email = email; }
        if (avatar !== null && avatar !== undefined) { user.avatar = avatar; user.profile_image = avatar; }
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    // INSERT INTO ARTIST_PROFILES
    if (q.startsWith("INSERT INTO ARTIST_PROFILES")) {
      const id = this.autoIncrement.artist_profiles++;
      let rec = {};
      if (params.length === 3) {
        // Initial registration stub [userId, "", "Jaipur"]
        rec = {
          id,
          user_id: Number(params[0]),
          bio: params[1] || "",
          city: params[2] || "Jaipur",
          state: "",
          location: "",
          locality: "",
          pincode: "",
          experience_years: 0,
          starting_price: 1500,
          home_service: 1,
          salon_service: 0,
          is_available: 1,
          languages: "English, Hindi",
          cover_image: "",
          selfie_image: "",
          profile_image: "",
          aadhaar_number: "",
          aadhaar_front: "",
          aadhaar_back: "",
          verification_status: "PENDING",
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      } else {
        const [
          user_id, bio, experience_years, starting_price, home_service, salon_service, is_available,
          location, locality, city, state, pincode, languages, cover_image, selfie_image, profile_image,
          aadhaar_number, aadhaar_front, aadhaar_back, latitude, longitude
        ] = params;

        rec = {
          id,
          user_id: Number(user_id),
          bio: bio || "",
          experience_years: experience_years || 0,
          starting_price: starting_price || 1500,
          home_service: home_service !== undefined ? home_service : 1,
          salon_service: salon_service !== undefined ? salon_service : 0,
          is_available: is_available !== undefined ? is_available : 1,
          location: location || "",
          locality: locality || location || "",
          city: city || "",
          state: state || "",
          pincode: pincode || "",
          languages: languages || "English, Hindi",
          cover_image: cover_image || "",
          selfie_image: selfie_image || "",
          profile_image: profile_image || selfie_image || "",
          aadhaar_number: aadhaar_number || "",
          aadhaar_front: aadhaar_front || "",
          aadhaar_back: aadhaar_back || "",
          latitude: latitude || "26.912434",
          longitude: longitude || "75.787270",
          verification_status: "PENDING",
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      this.tables.artist_profiles.push(rec);
      return { meta: { last_row_id: id, changes: 1 } };
    }

    // UPDATE ARTIST_PROFILES
    if (q.startsWith("UPDATE ARTIST_PROFILES")) {
      const userId = params[params.length - 1];
      const ap = this.tables.artist_profiles.find(p => p.user_id === Number(userId));
      if (ap) {
        const [
          bio, experience_years, starting_price, home_service, salon_service, is_available,
          location, locality, city, state, pincode, languages, cover_image, selfie_image, profile_image,
          aadhaar_number, aadhaar_front, aadhaar_back, latitude, longitude
        ] = params;

        if (bio !== null && bio !== undefined) ap.bio = bio;
        if (experience_years !== null && experience_years !== undefined) ap.experience_years = experience_years;
        if (starting_price !== null && starting_price !== undefined) ap.starting_price = starting_price;
        if (home_service !== null && home_service !== undefined) ap.home_service = home_service;
        if (salon_service !== null && salon_service !== undefined) ap.salon_service = salon_service;
        if (is_available !== null && is_available !== undefined) ap.is_available = is_available;
        if (location !== null && location !== undefined) ap.location = location;
        if (locality !== null && locality !== undefined) ap.locality = locality;
        if (city !== null && city !== undefined) ap.city = city;
        if (state !== null && state !== undefined) ap.state = state;
        if (pincode !== null && pincode !== undefined) ap.pincode = pincode;
        if (languages !== null && languages !== undefined) ap.languages = languages;
        if (cover_image !== null && cover_image !== undefined) ap.cover_image = cover_image;
        if (selfie_image !== null && selfie_image !== undefined) ap.selfie_image = selfie_image;
        if (profile_image !== null && profile_image !== undefined) ap.profile_image = profile_image;
        if (aadhaar_number !== null && aadhaar_number !== undefined) ap.aadhaar_number = aadhaar_number;
        if (aadhaar_front !== null && aadhaar_front !== undefined) ap.aadhaar_front = aadhaar_front;
        if (aadhaar_back !== null && aadhaar_back !== undefined) ap.aadhaar_back = aadhaar_back;
        if (latitude !== null && latitude !== undefined) ap.latitude = latitude;
        if (longitude !== null && longitude !== undefined) ap.longitude = longitude;
        ap.updated_at = new Date().toISOString();
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    return { meta: { changes: 1 } };
  }
}

/**
 * Backend Handler Logic Replicating backend/src/index.js
 */
const handleGetArtistDetails = async (db, userId) => {
  const user = await db.first("SELECT id, full_name, email, phone, role, is_verified, is_active, avatar FROM users WHERE id = ?", [userId]);
  const profile = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [userId]);

  const artistName = user?.full_name || user?.name || "Artist";
  const artistAvatar = profile?.profile_image || profile?.selfie_image || user?.avatar || "";
  const rawStatus = profile?.verification_status || profile?.status || "PENDING";
  const canonicalVerificationStatus = String(rawStatus).toUpperCase();

  const canonicalLocation = profile?.location || profile?.locality || "";
  const canonicalLocality = profile?.locality || profile?.location || "";
  const canonicalCity = profile?.city || "";
  const canonicalState = profile?.state || "";
  const canonicalPincode = profile?.pincode || "";
  const canonicalBio = profile?.bio || "";
  const canonicalExp = profile?.experience_years !== undefined && profile?.experience_years !== null ? Number(profile.experience_years) : 0;
  const canonicalPrice = profile?.starting_price ? Number(profile.starting_price) : 1500;
  const canonicalHomeSvc = profile?.home_service !== undefined ? Boolean(profile.home_service !== false && profile.home_service !== 0) : true;
  const canonicalSalonSvc = Boolean(profile?.salon_service);
  const canonicalLanguages = profile?.languages || "English, Hindi";
  const canonicalIsAvailable = profile?.is_available !== undefined ? Boolean(profile.is_available !== false && profile.is_available !== 0) : true;

  const isProfileComplete = Boolean(
    canonicalBio &&
    canonicalBio.trim() !== "" &&
    canonicalExp !== null &&
    (canonicalCity || canonicalLocation) &&
    (profile?.aadhaar_front || profile?.aadhaar_number)
  );

  return {
    id: profile?.id || user?.id || userId,
    user_id: user?.id || userId,
    user: {
      id: user?.id || userId,
      full_name: artistName,
      name: artistName,
      email: user?.email || "",
      phone: user?.phone || "",
      profile_image: artistAvatar,
      avatar: artistAvatar,
      role: user?.role || "artist",
      is_verified: Boolean(user?.is_verified),
      is_active: user?.is_active !== 0
    },
    bio: canonicalBio,
    experience_years: canonicalExp,
    experience: canonicalExp,
    starting_price: canonicalPrice,
    startingPrice: canonicalPrice,
    home_service: canonicalHomeSvc,
    homeService: canonicalHomeSvc,
    salon_service: canonicalSalonSvc,
    salonService: canonicalSalonSvc,
    location: canonicalLocation,
    locality: canonicalLocality,
    city: canonicalCity,
    state: canonicalState,
    pincode: canonicalPincode,
    languages: canonicalLanguages,
    aadhaar_number: profile?.aadhaar_number ? (String(profile.aadhaar_number).replace(/\s/g, "").length >= 4 ? `•••• •••• ${String(profile.aadhaar_number).replace(/\s/g, "").slice(-4)}` : "••••") : "",
    pan_number: profile?.pan_number || "",
    aadhaar_front: profile?.aadhaar_front || "",
    aadhaar_back: profile?.aadhaar_back || "",
    selfie_image: profile?.selfie_image || artistAvatar || "",
    profile_image: artistAvatar,
    avatar: artistAvatar,
    cover_image: profile?.cover_image || "",
    rating: profile?.rating || 0,
    total_reviews: profile?.total_reviews || 0,
    status: canonicalVerificationStatus.toLowerCase(),
    verification_status: canonicalVerificationStatus,
    is_available: canonicalIsAvailable,
    rejection_reason: profile?.rejection_reason || null,
    isProfileComplete: isProfileComplete
  };
};

const handleUpdateArtistProfile = async (db, userId, body) => {
  const name = body.full_name || body.fullName || body.name;
  const email = body.email;
  const phone = body.phone;
  const avatar = body.profile_image || body.profileImage || body.avatar || body.selfie_image;

  if (name || email || phone || avatar) {
    await db.run(
      "UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), email = COALESCE(?, email), avatar = COALESCE(?, avatar) WHERE id = ?",
      [name || null, phone || null, email || null, avatar || null, userId]
    );
  }

  const bio = body.bio;
  const experienceYears = body.experience_years !== undefined ? Number(body.experience_years) : (body.experience !== undefined ? Number(body.experience) : (body.experienceYears !== undefined ? Number(body.experienceYears) : undefined));
  const startingPrice = body.starting_price !== undefined ? Number(body.starting_price) : (body.startingPrice !== undefined ? Number(body.startingPrice) : undefined);
  const homeService = body.home_service !== undefined ? (body.home_service === true || body.home_service === "true" || body.home_service === 1 ? 1 : 0) : (body.homeService !== undefined ? (body.homeService ? 1 : 0) : undefined);
  const salonService = body.salon_service !== undefined ? (body.salon_service === true || body.salon_service === "true" || body.salon_service === 1 ? 1 : 0) : (body.salonService !== undefined ? (body.salonService ? 1 : 0) : undefined);
  const isAvailable = body.is_available !== undefined ? (body.is_available === true || body.is_available === "true" || body.is_available === 1 ? 1 : 0) : (body.isAvailable !== undefined ? (body.isAvailable ? 1 : 0) : undefined);
  const location = body.location !== undefined ? body.location : (body.address !== undefined ? body.address : undefined);
  const city = body.city;
  const state = body.state;
  const pincode = body.pincode;
  const languages = body.languages;
  const coverImage = body.cover_image || body.coverImage;
  const aadhaarFront = body.aadhaar_front || body.aadhaarFront;
  const aadhaarBack = body.aadhaar_back || body.aadhaarBack;
  const latitude = body.latitude;
  const longitude = body.longitude;

  // Sanitize Aadhaar: Only update if an actual 12-digit non-masked Aadhaar number was sent
  let cleanAadhaar = undefined;
  const rawAadhaar = body.aadhaar_number || body.aadhaarNumber;
  if (rawAadhaar && typeof rawAadhaar === "string" && !rawAadhaar.includes("•") && !rawAadhaar.includes("*")) {
    const digits = rawAadhaar.replace(/[^0-9]/g, "");
    if (digits.length === 12) {
      cleanAadhaar = digits;
    }
  }

  const existingProfile = await db.first("SELECT id FROM artist_profiles WHERE user_id = ?", [userId]);
  if (existingProfile) {
    await db.run(`
      UPDATE artist_profiles SET
        bio = COALESCE(?, bio),
        experience_years = COALESCE(?, experience_years),
        starting_price = COALESCE(?, starting_price),
        home_service = COALESCE(?, home_service),
        salon_service = COALESCE(?, salon_service),
        is_available = COALESCE(?, is_available),
        location = COALESCE(?, location),
        locality = COALESCE(?, locality, location),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        languages = COALESCE(?, languages),
        cover_image = COALESCE(?, cover_image),
        selfie_image = COALESCE(?, selfie_image),
        profile_image = COALESCE(?, profile_image, selfie_image),
        aadhaar_number = COALESCE(?, aadhaar_number),
        aadhaar_front = COALESCE(?, aadhaar_front),
        aadhaar_back = COALESCE(?, aadhaar_back),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [
      bio !== undefined ? bio : null,
      experienceYears !== undefined ? experienceYears : null,
      startingPrice !== undefined ? startingPrice : null,
      homeService !== undefined ? homeService : null,
      salonService !== undefined ? salonService : null,
      isAvailable !== undefined ? isAvailable : null,
      location !== undefined ? location : null,
      location !== undefined ? location : null,
      city !== undefined ? city : null,
      state !== undefined ? state : null,
      pincode !== undefined ? pincode : null,
      languages !== undefined ? languages : null,
      coverImage !== undefined ? coverImage : null,
      avatar !== undefined ? avatar : null,
      avatar !== undefined ? avatar : null,
      cleanAadhaar !== undefined ? cleanAadhaar : null,
      aadhaarFront !== undefined ? aadhaarFront : null,
      aadhaarBack !== undefined ? aadhaarBack : null,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      userId
    ]);
  } else {
    await db.run(`
      INSERT INTO artist_profiles (
        user_id, bio, experience_years, starting_price, home_service, salon_service, is_available,
        location, locality, city, state, pincode, languages, cover_image, selfie_image, profile_image,
        aadhaar_number, aadhaar_front, aadhaar_back, latitude, longitude, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `, [
      userId,
      bio || "",
      experienceYears || 0,
      startingPrice || 1500,
      homeService !== undefined ? homeService : 1,
      salonService !== undefined ? salonService : 0,
      isAvailable !== undefined ? isAvailable : 1,
      location || "",
      location || "",
      city || "",
      state || "",
      pincode || "",
      languages || "English, Hindi",
      coverImage || "",
      avatar || "",
      avatar || "",
      cleanAadhaar || "",
      aadhaarFront || "",
      aadhaarBack || "",
      latitude || "26.912434",
      longitude || "75.787270"
    ]);
  }

  return await handleGetArtistDetails(db, userId);
};

// ================= TEST SUITE =================
describe("MehndiGo Artist Auth, Onboarding & Canonical Profile Persistence Suite", () => {
  let db;

  beforeEach(() => {
    db = new MockD1Database();
  });

  test("Test 1 — New Artist Signup & Onboarding Persistence in Database", async () => {
    // 1. Signup & OTP verify creates user and initial stub
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Priya Sharma", "priya@example.com", "9876543210", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;
    await db.run("INSERT INTO artist_profiles (user_id, bio, city) VALUES (?, ?, ?)", [artistUserId, "", "Jaipur"]);

    // 2. Submit onboarding form
    const onboardingPayload = {
      bio: "Award-winning Rajasthani & Bridal Mehndi Specialist with 6 years experience.",
      experience_years: 6,
      starting_price: 2500,
      home_service: true,
      salon_service: false,
      location: "Mansarovar Sector 5, Near Central Park",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302020",
      languages: "Hindi, English, Marwari",
      aadhaar_number: "541289632145",
      aadhaar_front: "https://res.cloudinary.com/mehndigo/aadhaar_front_1.jpg",
      aadhaar_back: "https://res.cloudinary.com/mehndigo/aadhaar_back_1.jpg",
      selfie_image: "https://res.cloudinary.com/mehndigo/avatar_priya.jpg",
      phone: "9876543210"
    };

    const savedProfile = await handleUpdateArtistProfile(db, artistUserId, onboardingPayload);

    // Verify database record
    const dbProfile = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUserId]);
    assert.equal(dbProfile.bio, onboardingPayload.bio, "Bio must be persisted in DB");
    assert.equal(dbProfile.location, onboardingPayload.location, "Location must be persisted in DB");
    assert.equal(dbProfile.city, "Jaipur", "City must be persisted in DB");
    assert.equal(dbProfile.state, "Rajasthan", "State must be persisted in DB");
    assert.equal(dbProfile.pincode, "302020", "Pincode must be persisted in DB");
    assert.equal(dbProfile.experience_years, 6, "Experience must be persisted in DB");
    assert.equal(dbProfile.starting_price, 2500, "Starting price must be persisted in DB");
    assert.equal(dbProfile.aadhaar_number, "541289632145", "12-digit Aadhaar must be stored in DB");
    assert.equal(savedProfile.isProfileComplete, true, "Profile must be flagged complete");
  });

  test("Test 2 — Profile View: All saved fields returned by GET Profile API", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Sunita Verma", "sunita@example.com", "9123456780", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Expert Bridal Artist with 8 years of experience",
      experience_years: 8,
      starting_price: 3000,
      location: "Vaishali Nagar, Block B",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302021",
      languages: "Hindi, English",
      aadhaar_number: "987654321098",
      aadhaar_front: "https://cloudinary.com/front.jpg",
      aadhaar_back: "https://cloudinary.com/back.jpg"
    });

    const getRes = await handleGetArtistDetails(db, artistUserId);

    assert.equal(getRes.bio, "Expert Bridal Artist with 8 years of experience");
    assert.equal(getRes.location, "Vaishali Nagar, Block B");
    assert.equal(getRes.city, "Jaipur");
    assert.equal(getRes.state, "Rajasthan");
    assert.equal(getRes.pincode, "302021");
    assert.equal(getRes.experience_years, 8);
    assert.equal(getRes.starting_price, 3000);
    assert.equal(getRes.aadhaar_number, "•••• •••• 1098", "Aadhaar must be safely masked on retrieval");
  });

  test("Test 3 — Edit Profile: Partial update of Bio preserves location, state, pincode & experience", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Kavita Meena", "kavita@example.com", "9811223344", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    // Initial setup
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Old bio description",
      experience_years: 4,
      starting_price: 1800,
      location: "Malviya Nagar Sector 3",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302017",
      aadhaar_number: "123456789012"
    });

    // Update ONLY Bio
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "New updated professional bridal mehndi description."
    });

    const refreshed = await handleGetArtistDetails(db, artistUserId);
    assert.equal(refreshed.bio, "New updated professional bridal mehndi description.");
    assert.equal(refreshed.location, "Malviya Nagar Sector 3", "Location must remain intact");
    assert.equal(refreshed.city, "Jaipur", "City must remain intact");
    assert.equal(refreshed.state, "Rajasthan", "State must remain intact");
    assert.equal(refreshed.pincode, "302017", "Pincode must remain intact");
    assert.equal(refreshed.experience_years, 4, "Experience must remain intact");
    assert.equal(refreshed.starting_price, 1800, "Starting price must remain intact");
  });

  test("Test 4 — Logout and Login Restore: Profile data is retrieved directly from database", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Bhavna Patel", "bhavna@example.com", "9776655443", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Gujarati and Marwari traditional artist",
      experience_years: 5,
      location: "C-Scheme, Ashok Nagar",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      aadhaar_number: "445566778899"
    });

    // Simulate login verification fetching fresh profile
    const user = await db.first("SELECT * FROM users WHERE id = ?", [artistUserId]);
    assert.ok(user, "User must exist");

    const postLoginProfile = await handleGetArtistDetails(db, user.id);
    assert.equal(postLoginProfile.location, "C-Scheme, Ashok Nagar");
    assert.equal(postLoginProfile.city, "Jaipur");
    assert.equal(postLoginProfile.state, "Rajasthan");
    assert.equal(postLoginProfile.pincode, "302001");
    assert.equal(postLoginProfile.experience_years, 5);
  });

  test("Test 5 — Masked Aadhaar Update Protection: Submitting masked string does NOT overwrite 12-digit number", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Aarti Soni", "aarti@example.com", "9665544332", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    // Save with real Aadhaar
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Henna Designer",
      aadhaar_number: "987654321012"
    });

    const dbRecordBefore = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUserId]);
    assert.equal(dbRecordBefore.aadhaar_number, "987654321012");

    // Client sends masked string from view form on profile update
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Updated Henna Designer",
      aadhaar_number: "•••• •••• 1012"
    });

    const dbRecordAfter = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUserId]);
    assert.equal(dbRecordAfter.aadhaar_number, "987654321012", "Real 12-digit Aadhaar must be protected from masked overwrite");
    assert.equal(dbRecordAfter.bio, "Updated Henna Designer");
  });

  test("Test 6 — Duplicate Onboarding Submissions: Exactly ONE canonical profile per artist is maintained", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Ritu Goyal", "ritu@example.com", "9554433221", "hash123", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    // Submit 1
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Bio Version 1",
      city: "Jaipur",
      location: "Raja Park"
    });

    // Submit 2 (Retry/Double Click)
    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Bio Version 2",
      city: "Jaipur",
      location: "Raja Park"
    });

    const allProfiles = await db.all("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUserId]);
    const matching = allProfiles.filter(p => p.user_id === artistUserId);
    assert.equal(matching.length, 1, "Exactly one canonical profile must exist for artist");
    assert.equal(matching[0].bio, "Bio Version 2", "Latest submission updates canonical row");
  });

  test("Test 7 — Multi-Artist Data Isolation: Artist A never receives Artist B profile data", async () => {
    const userA = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Artist A", "artistA@example.com", "9000000001", "hash", "artist"
    ]);
    const userB = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Artist B", "artistB@example.com", "9000000002", "hash", "artist"
    ]);

    await handleUpdateArtistProfile(db, userA.meta.last_row_id, {
      bio: "Artist A unique bio",
      location: "Location A",
      city: "Jaipur"
    });

    await handleUpdateArtistProfile(db, userB.meta.last_row_id, {
      bio: "Artist B unique bio",
      location: "Location B",
      city: "Udaipur"
    });

    const profileA = await handleGetArtistDetails(db, userA.meta.last_row_id);
    const profileB = await handleGetArtistDetails(db, userB.meta.last_row_id);

    assert.equal(profileA.bio, "Artist A unique bio");
    assert.equal(profileA.location, "Location A");
    assert.equal(profileA.city, "Jaipur");

    assert.equal(profileB.bio, "Artist B unique bio");
    assert.equal(profileB.location, "Location B");
    assert.equal(profileB.city, "Udaipur");
  });

  test("Test 8 — Empty State / Non-Fabrication: Genuinely empty fields return empty string, not fake data", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Fresh Artist", "fresh@example.com", "9111111111", "hash", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;
    // Fresh profile stub
    await db.run("INSERT INTO artist_profiles (user_id, bio, city) VALUES (?, ?, ?)", [artistUserId, "", ""]);

    const getRes = await handleGetArtistDetails(db, artistUserId);
    assert.equal(getRes.bio, "", "Unfilled bio must be empty string");
    assert.equal(getRes.location, "", "Unfilled location must be empty string");
    assert.equal(getRes.state, "", "Unfilled state must be empty string");
    assert.equal(getRes.pincode, "", "Unfilled pincode must be empty string");
    assert.equal(getRes.isProfileComplete, false, "Fresh incomplete profile must flag isProfileComplete: false");
  });

  test("Test 9 — Location Partial Update: Changing Location maintains bio and pincode", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Meena Kumari", "meena@example.com", "9222222222", "hash", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    await handleUpdateArtistProfile(db, artistUserId, {
      bio: "Bridal Specialist",
      location: "Old Address Road",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302004",
      experience_years: 5
    });

    // Update location only
    await handleUpdateArtistProfile(db, artistUserId, {
      location: "New Studio Address, MI Road"
    });

    const updated = await handleGetArtistDetails(db, artistUserId);
    assert.equal(updated.location, "New Studio Address, MI Road");
    assert.equal(updated.bio, "Bridal Specialist");
    assert.equal(updated.city, "Jaipur");
    assert.equal(updated.state, "Rajasthan");
    assert.equal(updated.pincode, "302004");
    assert.equal(updated.experience_years, 5);
  });

  test("Test 10 — Direct Contract Match: Database columns match API response structure", async () => {
    const userRes = await db.run("INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      "Ananya Sen", "ananya@example.com", "9333333333", "hash", "artist"
    ]);
    const artistUserId = userRes.meta.last_row_id;

    const payload = {
      bio: "Kolkata & Rajasthani fusion henna",
      experience_years: 7,
      starting_price: 3500,
      home_service: true,
      salon_service: true,
      location: "Civil Lines, Near Metro",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302006",
      languages: "English, Hindi, Bengali",
      aadhaar_number: "778899001122",
      aadhaar_front: "https://cloudinary.com/front_ananya.jpg",
      aadhaar_back: "https://cloudinary.com/back_ananya.jpg",
      selfie_image: "https://cloudinary.com/avatar_ananya.jpg"
    };

    await handleUpdateArtistProfile(db, artistUserId, payload);

    const apiRes = await handleGetArtistDetails(db, artistUserId);
    const dbRow = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUserId]);

    assert.equal(apiRes.bio, dbRow.bio);
    assert.equal(apiRes.location, dbRow.location);
    assert.equal(apiRes.city, dbRow.city);
    assert.equal(apiRes.state, dbRow.state);
    assert.equal(apiRes.pincode, dbRow.pincode);
    assert.equal(apiRes.experience_years, dbRow.experience_years);
    assert.equal(apiRes.starting_price, dbRow.starting_price);
    assert.equal(apiRes.home_service, Boolean(dbRow.home_service));
    assert.equal(apiRes.salon_service, Boolean(dbRow.salon_service));
  });
});
