/**
 * MEHNDI_CATEGORIES — Single source of truth across the entire app.
 *
 * Used by:
 *  - Artist: AddServiceScreen, EditServiceScreen (service category picker)
 *  - Artist: AddPortfolioScreen, EditPortfolioScreen (portfolio category picker)
 *  - Customer: HomeScreen (fallback category grid)
 *  - Customer: ArtistListingScreen (quick-filter chips + advanced filter modal)
 *
 * Keep this list in sync with the Categories seeded in the backend DB.
 */

export const MEHNDI_CATEGORIES = [
  { name: "Bridal Mehndi",      slug: "bridal-mehndi",      icon: "💍", description: "Full bridal henna for wedding day" },
  { name: "Arabic Mehndi",      slug: "arabic-mehndi",      icon: "🌿", description: "Flowing floral & geometric patterns" },
  { name: "Rajasthani Mehndi",  slug: "rajasthani-mehndi",  icon: "🏰", description: "Traditional Marwari jaali & peacock motifs" },
  { name: "Indo-Arabic Mehndi", slug: "indo-arabic-mehndi", icon: "✨", description: "Fusion of Indian & Arabic styles" },
  { name: "Portrait Mehndi",    slug: "portrait-mehndi",    icon: "🎨", description: "Realistic face/scene henna art" },
  { name: "Minimal Mehndi",     slug: "minimal-mehndi",     icon: "🤍", description: "Simple, elegant & modern henna" },
  { name: "Royal Mehndi",       slug: "royal-mehndi",       icon: "👑", description: "Elaborate full-coverage royal designs" },
  { name: "Floral & Mandala",   slug: "floral-mandala",     icon: "🌸", description: "Lotus, roses & mandala patterns" },
  { name: "Festival Mehndi",    slug: "festival-mehndi",    icon: "🪔", description: "Teej, Karwa Chauth & Diwali special" },
  { name: "Engagement Mehndi",  slug: "engagement-mehndi",  icon: "💎", description: "Roka & ring ceremony henna" },
  { name: "Party Mehndi",       slug: "party-mehndi",       icon: "🎉", description: "Quick & trendy party patterns" },
  { name: "Kids Mehndi",        slug: "kids-mehndi",        icon: "🧸", description: "Fun & safe designs for children" },
  { name: "Glitter Mehndi",     slug: "glitter-mehndi",     icon: "💫", description: "Sparkling henna with glitter finish" },
  { name: "White Mehndi",       slug: "white-mehndi",       icon: "🕊️", description: "Modern white henna designs" },
  { name: "Custom Design",      slug: "custom-design",      icon: "🖌️", description: "Bespoke personalised henna art" }
];

/** Flat list of category name strings — for dropdowns */
export const MEHNDI_CATEGORY_NAMES = MEHNDI_CATEGORIES.map((c) => c.name);

/** Quick-filter chip list for ArtistListingScreen */
export const QUICK_FILTER_CATEGORIES = [
  { label: "All Artists",    key: "all" },
  { label: "Bridal Mehndi", key: "bridal-mehndi",     category: "Bridal Mehndi" },
  { label: "Arabic Mehndi", key: "arabic-mehndi",     category: "Arabic Mehndi" },
  { label: "Rajasthani",    key: "rajasthani-mehndi", category: "Rajasthani Mehndi" },
  { label: "Royal Mehndi",  key: "royal-mehndi",      category: "Royal Mehndi" },
  { label: "Indo-Arabic",   key: "indo-arabic-mehndi",category: "Indo-Arabic Mehndi" },
  { label: "Portrait",      key: "portrait-mehndi",   category: "Portrait Mehndi" },
  { label: "Festival",      key: "festival-mehndi",   category: "Festival Mehndi" },
  { label: "Minimal",       key: "minimal-mehndi",    category: "Minimal Mehndi" },
  { label: "Kids Mehndi",   key: "kids-mehndi",       category: "Kids Mehndi" },
  { label: "Glitter",       key: "glitter-mehndi",    category: "Glitter Mehndi" },
  { label: "⭐ 4.5+ Rated", key: "top_rated" },
  { label: "Home Service",  key: "home_service" },
  { label: "Verified Only", key: "verified" }
];

/**
 * Fallback category grid for HomeScreen when API returns nothing.
 */
export const HOME_FALLBACK_CATEGORIES = MEHNDI_CATEGORIES.slice(0, 8).map((c, i) => ({
  id: i + 1,
  name: c.name,
  slug: c.slug,
  description: c.description,
  icon: c.icon
}));
