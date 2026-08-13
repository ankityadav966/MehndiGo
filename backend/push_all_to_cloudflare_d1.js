const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("=== PREPARING COMPLETE 31 ARTISTS & TABLES SYNC TO CLOUDFLARE D1 ===\n");

// 1. Categories (10 complete categories)
const categories = [
  { id: 1, name: "Bridal Mehndi", slug: "bridal-mehndi", description: "Full arm & leg luxury traditional bridal henna with intricate storytelling details.", image_url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 2, name: "Arabic Mehndi", slug: "arabic-mehndi", description: "Bold flowing floral vines, shaded mandalas, and elegant contemporary geometry.", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 3, name: "Rajasthani & Marwari", slug: "rajasthani-marwari", description: "Authentic Marwari, peacock, doli & baraat heritage patterns with rich dark color.", image_url: "https://images.unsplash.com/photo-1582192732961-2364f55b1a3d?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 4, name: "Indo-Western Fusion", slug: "indo-western", description: "Modern contemporary motifs, floral lace, and minimalist negative-space styling.", image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 5, name: "Floral & Mandala", slug: "floral-mandala", description: "Delicate blossoms, lotus motifs, and symmetrical centerpieces on palms & wrists.", image_url: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 6, name: "Traditional Indian", slug: "traditional-indian", description: "Classic paisley, mango motifs, and cultural festive mehndi for all celebrations.", image_url: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 7, name: "Pakistani & Khafif", slug: "pakistani-khafif", description: "Intricate shading, architectural jaal patterns, and graceful fine-line henna trails.", image_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 8, name: "Minimalist & Geometric", slug: "minimalist-geometric", description: "Chic modern fingers, wrist accents, and delicate motif accents for quick occasions.", image_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 9, name: "Engagement & Sangeet", slug: "engagement-sangeet", description: "Festive party henna packages tailored for bridesmaids, family & guests.", image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80", is_active: 1 },
  { id: 10, name: "Royal Portrait Mehndi", slug: "royal-portrait", description: "Customized bride & groom face portraits, royal motifs, and bespoke event storytelling.", image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80", is_active: 1 }
];

// 2. Banners
const banners = [
  { id: 1, title: "Bridal Mehndi Ceremony ✨", image_url: "https://images.unsplash.com/photo-1582192732961-2364f55b1a3d?auto=format&fit=crop&w=800&q=80", banner_type: "HOME", is_active: 1 },
  { id: 2, title: "Royal Wedding Mehndi 👑", image_url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80", banner_type: "HOME", is_active: 1 },
  { id: 3, title: "Arabic & Modern Henna 🌸", image_url: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=800&q=80", banner_type: "HOME", is_active: 1 },
  { id: 4, title: "Festive Season Special 🪔", image_url: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=800&q=80", banner_type: "HOME", is_active: 1 }
];

// 3. Coupons
const coupons = [
  { id: 1, code: "BRIDAL20", discount_type: "percentage", discount_percentage: 20, discount_value: 20, max_discount: 1000, min_booking_value: 1500, expires_at: "2028-12-31 23:59:59", is_active: 1 },
  { id: 2, code: "ROYAL500", discount_type: "fixed", discount_percentage: 0, discount_value: 500, max_discount: 500, min_booking_value: 2500, expires_at: "2028-12-31 23:59:59", is_active: 1 },
  { id: 3, code: "ARABIC15", discount_type: "percentage", discount_percentage: 15, discount_value: 15, max_discount: 500, min_booking_value: 800, expires_at: "2028-12-31 23:59:59", is_active: 1 },
  { id: 4, code: "FEST20", discount_type: "fixed", discount_percentage: 0, discount_value: 300, max_discount: 300, min_booking_value: 1200, expires_at: "2028-12-31 23:59:59", is_active: 1 },
  { id: 5, code: "WELCOME50", discount_type: "percentage", discount_percentage: 50, discount_value: 50, max_discount: 200, min_booking_value: 300, expires_at: "2028-12-31 23:59:59", is_active: 1 }
];

// 4. 31 Real Verified Artists List
const artistNames = [
  { name: "Pooja Sharma", loc: "Malviya Nagar", lat: 26.8524, lng: 75.8142, exp: 8, price: 2500, rating: 4.9, rev: 48, feat: 1, fp: 1, cats: ["Bridal Mehndi", "Rajasthani & Marwari", "Royal Portrait Mehndi"] },
  { name: "Aisha Khan", loc: "C-Scheme", lat: 26.9150, lng: 75.7900, exp: 6, price: 1800, rating: 4.8, rev: 36, feat: 1, fp: 2, cats: ["Arabic Mehndi", "Indo-Western Fusion", "Floral & Mandala"] },
  { name: "Kiran Rajput", loc: "Raja Park", lat: 26.8920, lng: 75.8250, exp: 7, price: 2100, rating: 4.7, rev: 29, feat: 1, fp: 3, cats: ["Indo-Western Fusion", "Traditional Indian", "Engagement & Sangeet"] },
  { name: "Shalu Saini", loc: "Vaishali Nagar", lat: 26.9050, lng: 75.7420, exp: 9, price: 3500, rating: 4.9, rev: 52, feat: 1, fp: 4, cats: ["Royal Portrait Mehndi", "Bridal Mehndi", "Rajasthani & Marwari"] },
  { name: "Preeti Vyas", loc: "Mansarovar", lat: 26.8620, lng: 75.7680, exp: 10, price: 2200, rating: 4.8, rev: 41, feat: 1, fp: 5, cats: ["Rajasthani & Marwari", "Traditional Indian", "Bridal Mehndi"] },
  { name: "Sunita Yadav", loc: "Tonk Road", lat: 26.8720, lng: 75.7980, exp: 12, price: 3000, rating: 4.9, rev: 65, feat: 1, fp: 6, cats: ["Bridal Mehndi", "Rajasthani & Marwari", "Floral & Mandala"] },
  { name: "Rekha Meena", loc: "Jagatpura", lat: 26.8250, lng: 75.8420, exp: 5, price: 1600, rating: 4.7, rev: 22, feat: 0, fp: 0, cats: ["Pakistani & Khafif", "Arabic Mehndi", "Minimalist & Geometric"] },
  { name: "Meera Agarwal", loc: "Civil Lines", lat: 26.9080, lng: 75.7820, exp: 7, price: 1900, rating: 4.8, rev: 31, feat: 0, fp: 0, cats: ["Bridal Mehndi", "Minimalist & Geometric", "Floral & Mandala"] },
  { name: "Kavita Joshi", loc: "Bani Park", lat: 26.9280, lng: 75.7890, exp: 6, price: 1500, rating: 4.7, rev: 19, feat: 0, fp: 0, cats: ["Traditional Indian", "Arabic Mehndi", "Engagement & Sangeet"] },
  { name: "Divya Rathore", loc: "Vidhyadhar Nagar", lat: 26.9620, lng: 75.7720, exp: 11, price: 3200, rating: 4.9, rev: 58, feat: 1, fp: 7, cats: ["Rajasthani & Marwari", "Bridal Mehndi", "Royal Portrait Mehndi"] },
  { name: "Tanvi Soni", loc: "Sodala", lat: 26.8950, lng: 75.7650, exp: 5, price: 1700, rating: 4.7, rev: 18, feat: 0, fp: 0, cats: ["Minimalist & Geometric", "Indo-Western Fusion", "Floral & Mandala"] },
  { name: "Ritu Pareek", loc: "Shyam Nagar", lat: 26.8850, lng: 75.7550, exp: 8, price: 2000, rating: 4.8, rev: 27, feat: 0, fp: 0, cats: ["Rajasthani & Marwari", "Bridal Mehndi", "Traditional Indian"] },
  { name: "Sneha Khandelwal", loc: "Ajmer Road", lat: 26.8900, lng: 75.7200, exp: 6, price: 1800, rating: 4.8, rev: 33, feat: 0, fp: 0, cats: ["Engagement & Sangeet", "Bridal Mehndi", "Floral & Mandala"] },
  { name: "Muskan Jain", loc: "Pratap Nagar", lat: 26.7900, lng: 75.8300, exp: 4, price: 1200, rating: 4.6, rev: 15, feat: 0, fp: 0, cats: ["Minimalist & Geometric", "Arabic Mehndi", "Floral & Mandala"] },
  { name: "Komal Sharma", loc: "Bapu Nagar", lat: 26.8850, lng: 75.8050, exp: 7, price: 2800, rating: 4.8, rev: 38, feat: 1, fp: 8, cats: ["Bridal Mehndi", "Royal Portrait Mehndi", "Rajasthani & Marwari"] },
  { name: "Priyanka Verma", loc: "MI Road", lat: 26.9180, lng: 75.8120, exp: 9, price: 2400, rating: 4.8, rev: 44, feat: 0, fp: 0, cats: ["Bridal Mehndi", "Arabic Mehndi", "Pakistani & Khafif"] },
  { name: "Vandana Shekhawat", loc: "Johari Bazaar", lat: 26.9240, lng: 75.8280, exp: 10, price: 2700, rating: 4.9, rev: 50, feat: 1, fp: 9, cats: ["Rajasthani & Marwari", "Bridal Mehndi", "Traditional Indian"] },
  { name: "Jyoti Kumawat", loc: "Sanganer", lat: 26.8180, lng: 75.7720, exp: 5, price: 1400, rating: 4.6, rev: 17, feat: 0, fp: 0, cats: ["Traditional Indian", "Floral & Mandala", "Minimalist & Geometric"] },
  { name: "Payal Chouhan", loc: "Jhotwara", lat: 26.9450, lng: 75.7350, exp: 6, price: 1600, rating: 4.7, rev: 21, feat: 0, fp: 0, cats: ["Arabic Mehndi", "Indo-Western Fusion", "Engagement & Sangeet"] },
  { name: "Nisha Soni", loc: "Gopalpura Bypass", lat: 26.8680, lng: 75.7820, exp: 7, price: 1900, rating: 4.7, rev: 25, feat: 0, fp: 0, cats: ["Bridal Mehndi", "Floral & Mandala", "Traditional Indian"] },
  { name: "Aarti Gehlot", loc: "Moti Doongri", lat: 26.8980, lng: 75.8190, exp: 8, price: 2300, rating: 4.8, rev: 32, feat: 1, fp: 10, cats: ["Rajasthani & Marwari", "Bridal Mehndi", "Royal Portrait Mehndi"] },
  { name: "Ananya Sen", loc: "Adarsh Nagar", lat: 26.9020, lng: 75.8350, exp: 5, price: 1800, rating: 4.8, rev: 24, feat: 0, fp: 0, cats: ["Indo-Western Fusion", "Minimalist & Geometric", "Floral & Mandala"] },
  { name: "Bhavna Mahawar", loc: "Durgapura", lat: 26.8480, lng: 75.7920, exp: 4, price: 1300, rating: 4.5, rev: 14, feat: 0, fp: 0, cats: ["Traditional Indian", "Arabic Mehndi", "Engagement & Sangeet"] },
  { name: "Deepika Jangid", loc: "Sindhi Camp", lat: 26.9230, lng: 75.7990, exp: 6, price: 1700, rating: 4.7, rev: 20, feat: 0, fp: 0, cats: ["Arabic Mehndi", "Floral & Mandala", "Minimalist & Geometric"] },
  { name: "Garima Koli", loc: "Mahapura", lat: 26.8550, lng: 75.6850, exp: 5, price: 1500, rating: 4.6, rev: 16, feat: 0, fp: 0, cats: ["Bridal Mehndi", "Rajasthani & Marwari", "Traditional Indian"] },
  { name: "Harsha Gour", loc: "Sitapura", lat: 26.7750, lng: 75.8520, exp: 7, price: 2100, rating: 4.8, rev: 28, feat: 0, fp: 0, cats: ["Bridal Mehndi", "Pakistani & Khafif", "Floral & Mandala"] },
  { name: "Ishita Pareek", loc: "Khatipura", lat: 26.9180, lng: 75.7250, exp: 4, price: 1350, rating: 4.6, rev: 12, feat: 0, fp: 0, cats: ["Minimalist & Geometric", "Indo-Western Fusion", "Arabic Mehndi"] },
  { name: "Juhi Agarwal", loc: "Ajmeri Gate", lat: 26.9190, lng: 75.8200, exp: 9, price: 2600, rating: 4.9, rev: 47, feat: 0, fp: 0, cats: ["Royal Portrait Mehndi", "Rajasthani & Marwari", "Bridal Mehndi"] },
  { name: "Kajal Soni", loc: "Chandpole", lat: 26.9270, lng: 75.8110, exp: 6, price: 1800, rating: 4.7, rev: 23, feat: 0, fp: 0, cats: ["Traditional Indian", "Engagement & Sangeet", "Floral & Mandala"] },
  { name: "Latika Sen", loc: "Brahmpuri", lat: 26.9420, lng: 75.8300, exp: 5, price: 1550, rating: 4.6, rev: 18, feat: 0, fp: 0, cats: ["Pakistani & Khafif", "Arabic Mehndi", "Traditional Indian"] },
  { name: "Sonu Yadav (Master Artist)", loc: "Jaipur Main", lat: 26.9124, lng: 75.7873, exp: 8, price: 2500, rating: 4.9, rev: 55, feat: 1, fp: 11, cats: ["Bridal Mehndi", "Rajasthani & Marwari", "Royal Portrait Mehndi"] }
];

const avatarImages = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400",
  "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=400"
];

let sqlStatements = [];

// 1. Categories
sqlStatements.push(`-- 1. Insert/Replace Categories`);
for (const cat of categories) {
  const desc = (cat.description || '').replace(/'/g, "''");
  const img = (cat.image_url || '').replace(/'/g, "''");
  sqlStatements.push(`INSERT OR REPLACE INTO categories (id, name, slug, description, image_url, is_active) VALUES (${cat.id}, '${cat.name}', '${cat.slug}', '${desc}', '${img}', ${cat.is_active});`);
}

// 2. Banners
sqlStatements.push(`\n-- 2. Insert/Replace Banners`);
for (const b of banners) {
  const title = (b.title || '').replace(/'/g, "''");
  const img = (b.image_url || '').replace(/'/g, "''");
  sqlStatements.push(`INSERT OR REPLACE INTO banners (id, title, image_url, banner_type, is_active) VALUES (${b.id}, '${title}', '${img}', '${b.banner_type}', ${b.is_active});`);
}

// 3. Coupons
sqlStatements.push(`\n-- 3. Insert/Replace Coupons`);
for (const c of coupons) {
  sqlStatements.push(`INSERT OR REPLACE INTO coupons (id, code, discount_type, discount_value, min_order_amount, is_active, expires_at) VALUES (${c.id}, '${c.code}', '${c.discount_type}', ${c.discount_value}, ${c.min_booking_value}, ${c.is_active}, '${c.expires_at}');`);
}

// 4. System Settings
sqlStatements.push(`\n-- 4. System Settings`);
sqlStatements.push(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('platform_commission_percent', '10');`);
sqlStatements.push(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('cancellation_fee_fixed', '100');`);
sqlStatements.push(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('min_advance_percent', '20');`);

// 5. 31 Artists, Profiles, Locations, Services, Portfolios
sqlStatements.push(`\n-- 5. Insert/Replace All 31 Artists & Data`);
let currentUserId = 201;
let currentProfileId = 101;
let currentServiceId = 101;
let currentPortfolioId = 101;

for (let i = 0; i < artistNames.length; i++) {
  const item = artistNames[i];
  const uId = currentUserId++;
  const pId = currentProfileId++;
  const phone = `98290110${String(i + 1).padStart(2, '0')}`;
  const email = `artist_${i + 1}_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@mehndigo.in`;
  const avatar = avatarImages[i % avatarImages.length];
  const bio = `Top rated Mehndi specialist in ${item.loc}, Jaipur. Specializing in ${item.cats.join(', ')} with ${item.exp}+ years experience. Authentic natural organic herbal stain guarantee.`;
  const catsJson = JSON.stringify(item.cats);

  // User
  sqlStatements.push(`INSERT OR REPLACE INTO users (id, full_name, email, phone, password_hash, role, is_verified, avatar) VALUES (${uId}, '${item.name}', '${email}', '${phone}', 'secret123', 'artist', 1, '${avatar}');`);

  // Profile
  sqlStatements.push(`INSERT OR REPLACE INTO artist_profiles (id, user_id, bio, experience_years, starting_price, city, locality, rating, total_reviews, status, is_available, categories, profile_image, cover_image, state, pincode, is_featured, featured_priority, latitude, longitude) VALUES (${pId}, ${uId}, '${bio.replace(/'/g, "''")}', ${item.exp}, ${item.price}, 'Jaipur', '${item.loc}', ${item.rating}, ${item.rev}, 'approved', 1, '${catsJson.replace(/'/g, "''")}', '${avatar}', 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600', 'Rajasthan', '302001', ${item.feat}, ${item.fp}, ${item.lat}, ${item.lng});`);

  // Location
  sqlStatements.push(`INSERT OR REPLACE INTO artist_locations (id, artist_id, latitude, longitude) VALUES (${pId}, ${uId}, ${item.lat}, ${item.lng});`);

  // Services (2 per artist)
  const s1Id = currentServiceId++;
  const s2Id = currentServiceId++;
  const primCat = item.cats[0] || 'Bridal Mehndi';
  const secCat = item.cats[1] || 'Arabic Mehndi';

  sqlStatements.push(`INSERT OR REPLACE INTO services (id, artist_id, user_id, title, category, specialization_name, price, minimum_price, duration_mins, duration_minutes, is_active) VALUES (${s1Id}, ${uId}, ${uId}, '${item.name} Signature ${primCat}', '${primCat}', '${item.name} Signature ${primCat}', ${item.price * 2}, ${item.price * 2}, 180, 180, 1);`);
  sqlStatements.push(`INSERT OR REPLACE INTO services (id, artist_id, user_id, title, category, specialization_name, price, minimum_price, duration_mins, duration_minutes, is_active) VALUES (${s2Id}, ${uId}, ${uId}, 'Classic ${secCat} Design', '${secCat}', 'Classic ${secCat} Design', ${item.price}, ${item.price}, 60, 60, 1);`);

  // Portfolios
  const portId = currentPortfolioId++;
  const portImg = avatarImages[(i + 1) % avatarImages.length];
  sqlStatements.push(`INSERT OR REPLACE INTO portfolios (id, artist_id, title, image_url, category, likes_count, visibility) VALUES (${portId}, ${uId}, '${primCat} Design Showcase', '${portImg}', '${primCat}', ${15 + i}, 1);`);
}

const sqlContent = `PRAGMA foreign_keys = OFF;\nPRAGMA defer_foreign_keys = TRUE;\n` + sqlStatements.join('\n');
const sqlFilePath = path.join(__dirname, 'scratch_sync_d1_dataset.sql');
fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');
console.log(`Generated SQL file with ${sqlStatements.length} statements: ${sqlFilePath}`);

console.log("\nExecuting batch sync to Cloudflare D1 (mehndigo)...");
try {
  const result = execSync(`npx wrangler d1 execute mehndigo --remote --file="${sqlFilePath}"`, { encoding: 'utf8' });
  console.log(result);
  console.log("\n>>> ALL 31 ARTISTS & DATASETS SUCCESSFULLY PUSHED TO CLOUDFLARE D1! <<<");
} catch (err) {
  console.error("Execution failed:", err.message);
  if (err.stdout) console.log("STDOUT:", err.stdout);
  if (err.stderr) console.error("STDERR:", err.stderr);
}
