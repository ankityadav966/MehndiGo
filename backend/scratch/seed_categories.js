const db = require("../models");

const categories = [
  {
    name: "Bridal Mehndi",
    slug: "bridal",
    description: "Traditional and elaborate full-hand royal layouts for weddings.",
    image: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1590012357675-bc55909793fb?q=80&w=1200",
    icon: "flower-outline",
    featured: true,
    popular: true,
    status: "ACTIVE",
    sortOrder: 1
  },
  {
    name: "Arabic Mehndi",
    slug: "arabic",
    description: "Bold outlines with elegant flowing floral diagonal patterns.",
    image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=1200",
    icon: "star-outline",
    featured: true,
    popular: true,
    status: "ACTIVE",
    sortOrder: 2
  },
  {
    name: "Indo-Western Mehndi",
    slug: "indo-western",
    description: "Modern fusion of western geometries and classic Indian shading.",
    image: "https://images.unsplash.com/photo-1633376047516-9d6b118af9f5?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1633376047516-9d6b118af9f5?q=80&w=1200",
    icon: "ribbon-outline",
    featured: true,
    popular: false,
    status: "ACTIVE",
    sortOrder: 3
  },
  {
    name: "Minimalist Mehndi",
    slug: "minimalist",
    description: "Simple, delicate, and charming patterns for palms or fingers.",
    image: "https://images.unsplash.com/photo-1625231371864-b9c4a3c0a1f5?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1625231371864-b9c4a3c0a1f5?q=80&w=1200",
    icon: "heart-outline",
    featured: false,
    popular: true,
    status: "ACTIVE",
    sortOrder: 4
  },
  {
    name: "Festive Mehndi",
    slug: "festive",
    description: "Beautiful special designs for Teej, Eid, Diwali, and Karwa Chauth.",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665666?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1621605815971-fbc98d665666?q=80&w=1200",
    icon: "sparkles-outline",
    featured: false,
    popular: false,
    status: "ACTIVE",
    sortOrder: 5
  },
  {
    name: "Custom Design",
    slug: "custom",
    description: "Bespoke custom sketches tailored to your individual design idea.",
    image: "https://images.unsplash.com/photo-1598965402087-897a31840363?q=80&w=600",
    banner: "https://images.unsplash.com/photo-1598965402087-897a31840363?q=80&w=1200",
    icon: "brush-outline",
    featured: false,
    popular: false,
    status: "ACTIVE",
    sortOrder: 6
  }
];

async function seed() {
  try {
    console.log("Seeding categories...");
    for (const cat of categories) {
      await db.Category.upsert(cat);
    }
    console.log("Categories seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding categories failed:", error);
    process.exit(1);
  }
}

seed();
