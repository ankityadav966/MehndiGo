/**
 * seed-categories.js
 * Run: node scripts/seed-categories.js
 *
 * Upserts (creates-or-updates) the master list of mehndi categories
 * into the Categories table.  Safe to re-run at any time.
 */

const db = require("../models");

const MEHNDI_CATEGORIES = [
  { name: "Bridal Mehndi",      slug: "bridal-mehndi",      description: "Full bridal henna for wedding day",            icon: "💍", featured: true,  popular: true,  sortOrder: 1  },
  { name: "Arabic Mehndi",      slug: "arabic-mehndi",      description: "Flowing floral & geometric patterns",          icon: "🌿", featured: true,  popular: true,  sortOrder: 2  },
  { name: "Rajasthani Mehndi",  slug: "rajasthani-mehndi",  description: "Traditional Marwari jaali & peacock motifs",   icon: "🏰", featured: true,  popular: true,  sortOrder: 3  },
  { name: "Indo-Arabic Mehndi", slug: "indo-arabic-mehndi", description: "Fusion of Indian & Arabic styles",             icon: "✨", featured: true,  popular: false, sortOrder: 4  },
  { name: "Portrait Mehndi",    slug: "portrait-mehndi",    description: "Realistic face/scene henna art",               icon: "🎨", featured: false, popular: false, sortOrder: 5  },
  { name: "Minimal Mehndi",     slug: "minimal-mehndi",     description: "Simple, elegant & modern henna",               icon: "🤍", featured: false, popular: true,  sortOrder: 6  },
  { name: "Royal Mehndi",       slug: "royal-mehndi",       description: "Elaborate full-coverage royal designs",        icon: "👑", featured: true,  popular: false, sortOrder: 7  },
  { name: "Floral & Mandala",   slug: "floral-mandala",     description: "Lotus, roses & mandala patterns",              icon: "🌸", featured: false, popular: true,  sortOrder: 8  },
  { name: "Festival Mehndi",    slug: "festival-mehndi",    description: "Teej, Karwa Chauth & Diwali special",          icon: "🪔", featured: true,  popular: true,  sortOrder: 9  },
  { name: "Engagement Mehndi",  slug: "engagement-mehndi",  description: "Roka & ring ceremony henna",                  icon: "💎", featured: false, popular: false, sortOrder: 10 },
  { name: "Party Mehndi",       slug: "party-mehndi",       description: "Quick & trendy party patterns",                icon: "🎉", featured: false, popular: true,  sortOrder: 11 },
  { name: "Kids Mehndi",        slug: "kids-mehndi",        description: "Fun & safe designs for children",              icon: "🧸", featured: false, popular: false, sortOrder: 12 },
  { name: "Glitter Mehndi",     slug: "glitter-mehndi",     description: "Sparkling henna with glitter finish",          icon: "💫", featured: false, popular: false, sortOrder: 13 },
  { name: "White Mehndi",       slug: "white-mehndi",       description: "Modern white henna designs",                  icon: "🕊️", featured: false, popular: false, sortOrder: 14 },
  { name: "Custom Design",      slug: "custom-design",      description: "Bespoke personalised henna art",              icon: "🖌️", featured: false, popular: false, sortOrder: 15 }
];

async function seedCategories() {
  console.log("Seeding mehndi categories...");
  try {
    await db.sequelize.authenticate();

    let created = 0, updated = 0;
    for (const cat of MEHNDI_CATEGORIES) {
      const [record, wasCreated] = await db.Category.findOrCreate({
        where: { slug: cat.slug },
        defaults: { ...cat, status: "ACTIVE" }
      });
      if (!wasCreated) {
        await record.update({ ...cat, status: record.status }); // preserve admin-set status
        updated++;
      } else {
        created++;
      }
    }

    console.log(`Done! Created: ${created}  Updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed categories:", err.message);
    process.exit(1);
  }
}

seedCategories();
