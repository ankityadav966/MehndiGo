const dotenv = require("dotenv");
dotenv.config();
const cloudinary = require("../config/cloudinary");
const db = require("../models");

const files = [
  {
    slug: "bridal",
    name: "Bridal Mehndi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\bridal_mehndi_category_1784199831534.png"
  },
  {
    slug: "arabic",
    name: "Arabic Mehndi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\arabic_mehndi_category_1784199846833.png"
  },
  {
    slug: "indo-western",
    name: "Indo-Western Mehndi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\indowestern_mehndi_category_new_1784199997841.png"
  },
  {
    slug: "minimalist",
    name: "Minimalist Mehndi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\minimalist_mehndi_category_1784199874310.png"
  },
  {
    slug: "festive",
    name: "Festive Mehndi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\festive_mehndi_category_1784199889712.png"
  },
  {
    slug: "custom",
    name: "Custom Design",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\custom_mehndi_category_1784199904805.png"
  },
  {
    slug: "royal-bridal",
    name: "Royal Bridal Mehendi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\royal_bridal_category_1784200137071.png"
  },
  {
    slug: "traditional",
    name: "Traditional Mehendi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\traditional_category_1784200150958.png"
  },
  {
    slug: "floral",
    name: "Floral Mehendi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\floral_category_1784200164105.png"
  },
  {
    slug: "minimal",
    name: "Minimal Mehendi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\minimal_category_1784200176247.png"
  },
  {
    slug: "modern",
    name: "Modern Mehendi",
    path: "C:\\Users\\sonu\\.gemini\\antigravity-ide\\brain\\d63ca940-dab7-4659-88b5-181e143b7a24\\modern_category_1784200205244.png"
  }
];

async function uploadAndSeed() {
  try {
    console.log("Uploading files to Cloudinary...");
    for (const f of files) {
      console.log(`Uploading ${f.name} from ${f.path}...`);
      const result = await cloudinary.uploader.upload(f.path, {
        folder: "mehndigo/categories",
        public_id: f.slug,
        overwrite: true
      });
      console.log(`Uploaded! URL: ${result.secure_url}`);
      
      // Update Category in database
      const category = await db.Category.findOne({ where: { slug: f.slug } });
      if (category) {
        await category.update({
          image: result.secure_url,
          banner: result.secure_url
        });
        console.log(`Updated database category ${f.name} with new URL.`);
      }
    }
    console.log("All categories successfully uploaded and seeded!");
    process.exit(0);
  } catch (err) {
    console.error("Upload and seed failed:", err);
    process.exit(1);
  }
}

uploadAndSeed();
