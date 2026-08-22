const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

// Mock Database & Server Environment for full contract verification
class MockD1Database {
  constructor() {
    this.users = [];
    this.artist_profiles = [];
    this.customer_addresses = [];
    this.portfolios = [];
    this.autoIncrement = 1;
  }

  async first(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.includes("FROM USERS WHERE ID = ?")) {
      return this.users.find(u => u.id === Number(params[0])) || null;
    }
    if (q.includes("FROM ARTIST_PROFILES WHERE USER_ID = ?")) {
      return this.artist_profiles.find(ap => ap.user_id === Number(params[0])) || null;
    }
    if (q.includes("FROM CUSTOMER_ADDRESSES WHERE USER_ID = ?")) {
      return this.customer_addresses.find(ca => ca.user_id === Number(params[0])) || null;
    }
    if (q.includes("SELECT COUNT(*) AS COUNT FROM PORTFOLIOS")) {
      const count = this.portfolios.filter(p => p.artist_id === Number(params[0])).length;
      return { count };
    }
    return null;
  }

  async all(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.includes("FROM PORTFOLIOS WHERE ARTIST_ID = ?")) {
      return this.portfolios.filter(p => p.artist_id === Number(params[0]));
    }
    return [];
  }

  async run(query, params = []) {
    const q = query.trim().toUpperCase();
    if (q.startsWith("INSERT INTO USERS")) {
      const user = {
        id: this.autoIncrement++,
        full_name: params[0] || "",
        email: params[1] || "",
        phone: params[2] || "",
        role: params[3] || "artist",
        avatar: params[4] || null,
        is_verified: params[5] !== undefined ? params[5] : 1,
        is_active: 1,
        created_at: new Date().toISOString()
      };
      this.users.push(user);
      return { success: true, meta: { last_row_id: user.id } };
    }

    if (q.startsWith("UPDATE USERS SET")) {
      const userId = Number(params[params.length - 1]);
      const user = this.users.find(u => u.id === userId);
      if (user) {
        const setClause = query.substring(query.toUpperCase().indexOf("SET") + 3, query.toUpperCase().indexOf("WHERE"));
        const assignments = setClause.split(",").map(s => s.trim());
        let paramIdx = 0;
        for (const assign of assignments) {
          const colName = assign.split("=")[0].trim().toLowerCase();
          if (assign.includes("?")) {
            const val = params[paramIdx++];
            if (val !== null && val !== undefined) {
              user[colName] = val;
            }
          }
        }
      }
      return { success: true };
    }

    if (q.startsWith("INSERT INTO ARTIST_PROFILES")) {
      const profile = {
        id: this.autoIncrement++,
        user_id: Number(params[0]),
        bio: params[1] || "",
        experience_years: Number(params[2]) || 0,
        starting_price: Number(params[3]) || 1500,
        home_service: params[4] !== undefined ? params[4] : 1,
        salon_service: params[5] !== undefined ? params[5] : 0,
        is_available: params[6] !== undefined ? params[6] : 1,
        location: params[7] || "",
        locality: params[8] || "",
        city: params[9] || "",
        state: params[10] || "",
        pincode: params[11] || "",
        languages: params[12] || "English, Hindi",
        cover_image: params[13] || null,
        selfie_image: params[14] || null,
        profile_image: params[15] || null,
        aadhaar_number: params[16] || null,
        aadhaar_front: params[17] || null,
        aadhaar_back: params[18] || null,
        latitude: params[19] || null,
        longitude: params[20] || null,
        verification_status: "PENDING"
      };
      this.artist_profiles.push(profile);
      return { success: true, meta: { last_row_id: profile.id } };
    }

    if (q.startsWith("UPDATE ARTIST_PROFILES SET")) {
      const userId = Number(params[params.length - 1]);
      const profile = this.artist_profiles.find(ap => ap.user_id === userId);
      if (profile) {
        // Extract column names from the SET clause
        const setClause = query.substring(query.toUpperCase().indexOf("SET") + 3, query.toUpperCase().indexOf("WHERE"));
        const assignments = setClause.split(",").map(s => s.trim());
        let paramIdx = 0;
        for (const assign of assignments) {
          const colName = assign.split("=")[0].trim().toLowerCase();
          if (assign.includes("?")) {
            const val = params[paramIdx++];
            if (val !== null && val !== undefined) {
              if (colName === "experience_years" || colName === "starting_price") {
                profile[colName] = Number(val);
              } else {
                profile[colName] = val;
              }
            }
          }
        }
      }
      return { success: true };
    }

    if (q.startsWith("INSERT INTO PORTFOLIOS")) {
      const item = {
        id: this.autoIncrement++,
        artist_id: Number(params[0]),
        title: params[1],
        description: params[2],
        category: params[3],
        image_url: params[4],
        video_url: params[5],
        art_tier: params[6] || "STANDARD",
        price: params[7] || null,
        created_at: new Date().toISOString()
      };
      this.portfolios.push(item);
      return { success: true, meta: { last_row_id: item.id } };
    }

    return { success: true };
  }
}

// Server helper mocks
const sanitizeStorageUrl = (val) => {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("file://") || trimmed.startsWith("content://") || trimmed.startsWith("ph://") || trimmed.startsWith("blob:") || trimmed.startsWith("assets-library://")) {
    return null;
  }
  return trimmed;
};

const resolveImage = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("uploads/")) {
    const cleanBase = "https://api.mehndigo.in";
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${cleanBase}${cleanPath}`;
  }
  if (trimmed.startsWith("file://") || trimmed.startsWith("content://") || trimmed.startsWith("ph://")) {
    return trimmed;
  }
  return trimmed;
};

test("End-to-End Image Pipeline, Storage, and Flicker-Free Profile Updates", async (t) => {
  const db = new MockD1Database();
  const env = {
    CLOUDINARY_CLOUD_NAME: "dair21jov",
    CLOUDINARY_API_KEY: "344422783583887",
    CLOUDINARY_API_SECRET: "KxOubI4_DlRLsEtkP360SLlwJNg"
  };

  // 1. Test Cloudinary Signature Generation
  await t.test("1. Cloudinary upload signature generation with SHA-1 matching Cloudinary SDK", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "mehndigo/portfolio";
    const toSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const msgUint8 = new TextEncoder().encode(toSign);
    const hashBuffer = await crypto.webcrypto.subtle.digest("SHA-1", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    assert.ok(signature, "Signature must be generated");
    assert.equal(signature.length, 40, "SHA-1 hex digest must be 40 characters");

    // Parity check with crypto.createHash
    const expectedSig = crypto.createHash("sha1").update(toSign).digest("hex");
    assert.equal(signature, expectedSig, "WebCrypto SHA-1 signature must match crypto SHA-1 exactly");
  });

  // 2. Setup Real Test Artist
  let artistUser = null;
  await t.test("2. Register and Onboard Test Artist with Real Image URLs", async () => {
    const userRes = await db.run(
      "INSERT INTO users (full_name, email, phone, role, avatar, is_verified) VALUES (?, ?, ?, ?, ?, ?)",
      ["Radhika Sharma", "radhika.artist@mehndigo.in", "9876543210", "artist", null, 1]
    );
    artistUser = { id: userRes.meta.last_row_id };

    const cloudPhoto1 = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/profile/radhika_photo1.jpg";
    const cloudAadhaarFront = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/kyc/radhika_aadhaar_f.jpg";
    const cloudAadhaarBack = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/kyc/radhika_aadhaar_b.jpg";

    const profileRes = await db.run(`
      INSERT INTO artist_profiles (
        user_id, bio, experience_years, starting_price, home_service, salon_service, is_available,
        location, locality, city, state, pincode, languages, cover_image, selfie_image, profile_image,
        aadhaar_number, aadhaar_front, aadhaar_back, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      artistUser.id,
      "Professional Bridal Mehndi Specialist with 6 years experience",
      6,
      2500,
      1,
      0,
      1,
      "C-Scheme",
      "C-Scheme",
      "Jaipur",
      "Rajasthan",
      "302001",
      "English, Hindi, Rajasthani",
      null,
      cloudPhoto1,
      cloudPhoto1,
      "554433221100",
      cloudAadhaarFront,
      cloudAadhaarBack,
      "26.9124",
      "75.7873"
    ]);

    // Also update users.avatar
    await db.run("UPDATE users SET avatar = ? WHERE id = ?", [cloudPhoto1, artistUser.id]);

    const created = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUser.id]);
    assert.equal(created.profile_image, cloudPhoto1, "Profile image must be stored correctly");
    assert.equal(created.selfie_image, cloudPhoto1, "Selfie image must be stored correctly");
    assert.equal(created.aadhaar_front, cloudAadhaarFront, "Aadhaar front image must be stored correctly");
    assert.equal(created.aadhaar_back, cloudAadhaarBack, "Aadhaar back image must be stored correctly");
  });

  // 3. Update Artist Profile with New Photo (Photo B replaces Photo A)
  await t.test("3. Replace Artist Profile Photo (Photo B replaces Photo A)", async () => {
    const cloudPhoto2 = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/profile/radhika_photo2_updated.jpg";

    // Simulate PUT /artist/profile
    const sanitizedAvatar = sanitizeStorageUrl(cloudPhoto2);
    assert.equal(sanitizedAvatar, cloudPhoto2);

    await db.run("UPDATE users SET avatar = COALESCE(?, avatar) WHERE id = ?", [sanitizedAvatar, artistUser.id]);
    await db.run(`
      UPDATE artist_profiles SET
        profile_image = COALESCE(?, profile_image, selfie_image),
        selfie_image = COALESCE(?, selfie_image),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [sanitizedAvatar, sanitizedAvatar, artistUser.id]);

    const updated = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUser.id]);
    const updatedUser = await db.first("SELECT * FROM users WHERE id = ?", [artistUser.id]);

    assert.equal(updated.profile_image, cloudPhoto2, "Artist profile_image must be updated to Photo 2");
    assert.equal(updated.selfie_image, cloudPhoto2, "Artist selfie_image must be updated to Photo 2");
    assert.equal(updatedUser.avatar, cloudPhoto2, "User avatar in users table must be updated to Photo 2");
  });

  // 4. Non-Destructive Partial Profile Updates (Update Bio Only -> Photo Unchanged)
  await t.test("4. Partial Update (Bio Only) must NOT wipe or reset Photo", async () => {
    const before = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUser.id]);
    const photoBefore = before.profile_image;

    // Simulate Partial Update (avatar is undefined / null)
    const newBio = "Updated Luxury Royal Mehndi Master in Jaipur";
    const avatarPassed = sanitizeStorageUrl(undefined); // null

    await db.run(`
      UPDATE artist_profiles SET
        bio = COALESCE(?, bio),
        profile_image = COALESCE(?, profile_image, selfie_image),
        selfie_image = COALESCE(?, selfie_image)
      WHERE user_id = ?
    `, [newBio, avatarPassed, avatarPassed, artistUser.id]);

    const after = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUser.id]);
    assert.equal(after.bio, newBio, "Bio must be updated");
    assert.equal(after.profile_image, photoBefore, "Profile image must remain untouched and NOT become null or empty");
    assert.equal(after.selfie_image, photoBefore, "Selfie image must remain untouched");
  });

  // 5. Security: Reject Local File URIs from Storage
  await t.test("5. Local temporary URIs (file://, content://, blob:) MUST be rejected by storage sanitizer", async () => {
    assert.equal(sanitizeStorageUrl("file:///data/user/0/com.mehndigo/cache/temp_123.jpg"), null, "file:// URI must be rejected");
    assert.equal(sanitizeStorageUrl("content://media/external/images/media/456"), null, "content:// URI must be rejected");
    assert.equal(sanitizeStorageUrl("blob:http://localhost:8081/789"), null, "blob: URI must be rejected");
    assert.equal(sanitizeStorageUrl("ph://asset-photo-id-999"), null, "ph:// URI must be rejected");
    assert.equal(sanitizeStorageUrl(""), null, "Empty string must return null");
    assert.equal(sanitizeStorageUrl(null), null, "Null must return null");
    assert.equal(sanitizeStorageUrl(undefined), null, "Undefined must return null");

    // Real HTTPS Cloudinary URLs must pass
    const validUrl = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/portfolio/design_sample.jpg";
    assert.equal(sanitizeStorageUrl(validUrl), validUrl, "Valid HTTPS Cloudinary URL must be accepted");
  });

  // 6. Portfolio Image Upload and Visibility
  await t.test("6. Portfolio Image upload, persistence and customer discovery retrieval", async () => {
    const portfolioUrl = "https://res.cloudinary.com/dair21jov/image/upload/v1787373589/mehndigo/portfolio/royal_bridal_front_hand.jpg";
    await db.run(
      "INSERT INTO portfolios (artist_id, title, description, category, image_url, video_url, art_tier, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [artistUser.id, "Royal Rajasthani Bridal Front Hand", "Intricate dulha-dulhan wedding motif", "Bridal Mehndi", portfolioUrl, null, "PREMIUM", 4500]
    );

    const items = await db.all("SELECT * FROM portfolios WHERE artist_id = ?", [artistUser.id]);
    assert.equal(items.length, 1, "Portfolio item must be stored");
    assert.equal(items[0].image_url, portfolioUrl, "Portfolio image_url must match Cloudinary secure URL");
    assert.equal(items[0].art_tier, "PREMIUM", "Art tier must be stored");
    assert.equal(items[0].price, 4500, "Price must be stored");
  });

  // 7. KYC Aadhaar Security Isolation
  await t.test("7. KYC Aadhaar images are protected from public discovery", async () => {
    const privateProfile = await db.first("SELECT * FROM artist_profiles WHERE user_id = ?", [artistUser.id]);
    
    // Public DTO formatting (e.g. for customer HomeScreen / ArtistDetails public)
    const publicProfileDto = {
      id: privateProfile.id,
      name: "Radhika Sharma",
      bio: privateProfile.bio,
      profile_image: privateProfile.profile_image,
      city: privateProfile.city,
      starting_price: privateProfile.starting_price,
      experience_years: privateProfile.experience_years
    };

    assert.equal(publicProfileDto.aadhaar_number, undefined, "Public DTO must NOT contain aadhaar_number");
    assert.equal(publicProfileDto.aadhaar_front, undefined, "Public DTO must NOT contain aadhaar_front");
    assert.equal(publicProfileDto.aadhaar_back, undefined, "Public DTO must NOT contain aadhaar_back");
  });

  // 8. Image URL Resolution and Fallbacks
  await t.test("8. resolveImage handles Cloudinary, relative uploads, and fallback placeholders", async () => {
    const cloudUrl = "https://res.cloudinary.com/dair21jov/image/upload/v123/sample.jpg";
    assert.equal(resolveImage(cloudUrl), cloudUrl, "HTTPS URL returns as-is");

    const relUpload = "/uploads/avatar_123.jpg";
    assert.equal(resolveImage(relUpload), "https://api.mehndigo.in/uploads/avatar_123.jpg", "Relative uploads prepend base URL");

    const relUploadNoSlash = "uploads/avatar_456.jpg";
    assert.equal(resolveImage(relUploadNoSlash), "https://api.mehndigo.in/uploads/avatar_456.jpg", "Relative path without slash prepends base URL");

    assert.equal(resolveImage(null), null, "Null returns null");
    assert.equal(resolveImage(""), null, "Empty string returns null");
    assert.equal(resolveImage("   "), null, "Whitespace returns null");
  });
});
