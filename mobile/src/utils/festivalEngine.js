/**
 * Dynamic Indian Festival & Seasonal Offer Engine
 * Automatically determines active/upcoming Indian festivals based on current date
 * and provides production-ready themed banners, coupon codes, and offer validity.
 */

const FESTIVAL_CONFIGS = [
  {
    id: "fest-teej",
    key: "teej",
    name: "Teej Festival Special ✨",
    title: "Teej Henna Delight ✨",
    subtitle: "Get flat 25% OFF on traditional Teej & Sawan bridal patterns",
    description: "Celebrate Teej with intricate green henna trails & Marwari mandalas by verified artists.",
    code: "TEEJ25",
    discount: "25% OFF",
    discount_text: "25% OFF",
    image: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1000&q=80",
    monthStart: 7, // July
    dayStart: 15,
    monthEnd: 8,   // August
    dayEnd: 25,
    priority: 1
  },
  {
    id: "fest-rakhi",
    key: "raksha_bandhan",
    name: "Raksha Bandhan Offer 🧵",
    title: "Raksha Bandhan Henna Utsav 🧵",
    subtitle: "Flat 20% OFF on family & group mehndi bookings for Rakhi",
    description: "Special bridesmaid & family henna packages at your doorstep.",
    code: "RAKHI20",
    discount: "20% OFF",
    discount_text: "20% OFF",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1000&q=80",
    monthStart: 8, // August
    dayStart: 1,
    monthEnd: 8,   // August
    dayEnd: 31,
    priority: 2
  },
  {
    id: "fest-karwa",
    key: "karwa_chauth",
    name: "Karwa Chauth Special 🌙",
    title: "Karwa Chauth Luxury Henna 🌙",
    subtitle: "Flat ₹500 OFF on full arm Marwari & portrait bridal mehndi",
    description: "Book top-rated verified specialists with natural organic dark stain guarantee.",
    code: "KARWA500",
    discount: "₹500 OFF",
    discount_text: "₹500 OFF",
    image: "https://images.unsplash.com/photo-1582192732961-2364f55b1a3d?auto=format&fit=crop&w=1000&q=80",
    monthStart: 9, // October
    dayStart: 15,
    monthEnd: 11,  // November
    dayEnd: 10,
    priority: 1
  },
  {
    id: "fest-diwali",
    key: "diwali",
    name: "Diwali Shubh Henna 🪔",
    title: "Diwali Festive Special 🪔",
    subtitle: "Flat 25% OFF on doorstep festive henna services",
    description: "Adorn your hands with stunning floral mandalas this Diwali season.",
    code: "DIWALI25",
    discount: "25% OFF",
    discount_text: "25% OFF",
    image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=1000&q=80",
    monthStart: 10, // October/November
    dayStart: 20,
    monthEnd: 11,   // November
    dayEnd: 25,
    priority: 2
  },
  {
    id: "fest-wedding",
    key: "wedding_season",
    name: "Royal Wedding Season 👑",
    title: "Royal Bridal Ceremony 👑",
    subtitle: "Flat 20% OFF on exclusive bridal & portrait packages",
    description: "Bespoke bride & groom story henna crafted by master specialists.",
    code: "BRIDAL20",
    discount: "20% OFF",
    discount_text: "20% OFF",
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    monthStart: 11, // Nov - Feb & April - June (Default wedding season)
    dayStart: 1,
    monthEnd: 3,
    dayEnd: 31,
    priority: 3
  },
  {
    id: "fest-holi",
    key: "holi",
    name: "Holi Henna Festival 🌸",
    title: "Holi Spring Offer 🌸",
    subtitle: "Flat 15% OFF on modern & Indo-Arabic henna designs",
    description: "Graceful trails & modern minimalist patterns by top artists near you.",
    code: "HOLI15",
    discount: "15% OFF",
    discount_text: "15% OFF",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1000&q=80",
    monthStart: 3, // March
    dayStart: 1,
    monthEnd: 3,
    dayEnd: 31,
    priority: 2
  }
];

/**
 * Get active/upcoming dynamic festival offers based on current date
 * @param {Date} [currentDate]
 * @returns {Array} List of active festival offer objects
 */
export function getActiveFestivalOffers(currentDate = new Date()) {
  const month = currentDate.getMonth() + 1; // 1 - 12
  const day = currentDate.getDate();

  // Filter festivals active for current date window
  const active = FESTIVAL_CONFIGS.filter((fest) => {
    if (fest.monthStart <= fest.monthEnd) {
      if (month < fest.monthStart || month > fest.monthEnd) return false;
      if (month === fest.monthStart && day < fest.dayStart) return false;
      if (month === fest.monthEnd && day > fest.dayEnd) return false;
      return true;
    } else {
      // Crosses year boundary (e.g. Nov to Feb)
      if (month >= fest.monthStart || month <= fest.monthEnd) {
        if (month === fest.monthStart && day < fest.dayStart) return false;
        if (month === fest.monthEnd && day > fest.dayEnd) return false;
        return true;
      }
      return false;
    }
  });

  // Sort active festivals by priority
  active.sort((a, b) => a.priority - b.priority);

  // If no specific festival matches current day, return default curated seasonal offers (Wedding & Festive)
  if (active.length === 0) {
    return [
      FESTIVAL_CONFIGS.find(f => f.key === "wedding_season"),
      FESTIVAL_CONFIGS.find(f => f.key === "teej") || FESTIVAL_CONFIGS[0]
    ].filter(Boolean);
  }

  return active;
}
