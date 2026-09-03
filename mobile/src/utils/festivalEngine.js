/**
 * Dynamic Indian Festival & Seasonal Offer Engine (Client-side Offline / Fallback Engine)
 * Primary source of truth is always the Cloudflare D1 Backend API (/customer/festivals/active).
 * This engine acts as a robust offline/cache fallback to guarantee zero UI layout shifts,
 * correct IST date calculations, verified festival theme metadata, and authentic local assets.
 */

export const FESTIVAL_ASSETS = {
  raksha_bandhan: require("../../assets/images/festivals/raksha_bandhan.png"),
  janmashtami: require("../../assets/images/festivals/janmashtami.png"),
  ganesh_chaturthi: require("../../assets/images/festivals/ganesh_chaturthi.png"),
  navratri: require("../../assets/images/festivals/navratri.png"),
  karwa_chauth: require("../../assets/images/festivals/karwa_chauth.png"),
  diwali: require("../../assets/images/festivals/diwali.png"),
  bridal: require("../../assets/images/categories/bridal.png"),
  traditional: require("../../assets/images/categories/traditional.png"),
  default: require("../../assets/images/festivals/raksha_bandhan.png")
};

/**
 * Returns static bundled local festival asset for a given festival record
 */
export function getFestivalAsset(festival) {
  if (!festival) return FESTIVAL_ASSETS.default;
  const str = `${festival.festival_code || ""} ${festival.slug || ""} ${festival.code || ""} ${festival.festival_name || ""} ${festival.festival || ""} ${festival.title || ""}`.toLowerCase();
  
  if (str.includes("raksha") || str.includes("rakhi")) return FESTIVAL_ASSETS.raksha_bandhan;
  if (str.includes("janmashtami") || str.includes("krishna") || str.includes("kanha")) return FESTIVAL_ASSETS.janmashtami;
  if (str.includes("ganesh") || str.includes("bappa") || str.includes("chaturthi")) return FESTIVAL_ASSETS.ganesh_chaturthi;
  if (str.includes("navratri") || str.includes("durga") || str.includes("dandiya") || str.includes("garba")) return FESTIVAL_ASSETS.navratri;
  if (str.includes("karwa") || str.includes("chauth")) return FESTIVAL_ASSETS.karwa_chauth;
  if (str.includes("diwali") || str.includes("deepavali") || str.includes("dhanteras") || str.includes("new_year") || str.includes("newyear") || str.includes("sankranti") || str.includes("shubh")) return FESTIVAL_ASSETS.diwali;
  if (str.includes("wedding") || str.includes("shaadi") || str.includes("bridal") || str.includes("teej")) return FESTIVAL_ASSETS.bridal;
  
  return FESTIVAL_ASSETS.default;
}

/**
 * Safely resolves banner image: local asset, clean remote URL, or verified static asset
 */
export function resolveFestivalBanner(item) {
  if (!item) return FESTIVAL_ASSETS.default;
  const rawUrl = item.banner_image || item.image_url || item.image;
  
  if (rawUrl && typeof rawUrl === "string") {
    // If it's a legacy or medical unsplash URL, immediately reject and use local festival asset
    if (rawUrl.includes("photo-1628155930542") || rawUrl.includes("unsplash.com")) {
      return getFestivalAsset(item);
    }
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return { uri: rawUrl };
    }
    if (rawUrl.startsWith("/")) {
      const { BASE_URL } = require("../services/api");
      const cleanBase = (BASE_URL || "").replace(/\/api\/v1\/?$/, "");
      return { uri: `${cleanBase}${rawUrl}` };
    }
  }
  
  return getFestivalAsset(item);
}

export const FALLBACK_FESTIVAL_CONFIGS = [
  {
    id: 1,
    festival_id: 1,
    festival: "Raksha Bandhan 🧵",
    festival_name: "Raksha Bandhan 🧵",
    festival_code: "raksha_bandhan",
    title: "Raksha Bandhan Henna Utsav 🧵",
    subtitle: "Flat 20% OFF on family & group mehndi bookings for Rakhi",
    description: "Special bridesmaid & family henna packages at your doorstep.",
    code: "RAKHI20",
    coupon_code: "RAKHI20",
    discount: "20% OFF",
    discount_text: "20% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 500,
    max_discount: 500,
    start_date: "2026-08-15",
    end_date: "2026-08-31",
    valid_from: "2026-08-15",
    valid_until: "2026-08-31",
    badge: "RAKHI SPECIAL 🧵",
    badge_text: "RAKHI SPECIAL 🧵",
    theme_color: "#B8860B",
    banner_image: "asset://festivals/raksha_bandhan.png",
    image_url: "asset://festivals/raksha_bandhan.png",
    monthStart: 8,
    dayStart: 15,
    monthEnd: 8,
    dayEnd: 31,
    priority: 95,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on all Mehndi bookings above ₹500. Max discount ₹500."
  },
  {
    id: 2,
    festival_id: 2,
    festival: "Krishna Janmashtami 🦚",
    festival_name: "Krishna Janmashtami 🦚",
    festival_code: "janmashtami",
    title: "Janmashtami Divine Henna 🦚",
    subtitle: "Flat 25% OFF on peacock & traditional mandala patterns",
    description: "Adorn your hands with sacred peacock, flute & floral motifs.",
    code: "KANHA25",
    coupon_code: "KANHA25",
    discount: "25% OFF",
    discount_text: "25% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 25,
    min_booking_amount: 700,
    max_discount: 600,
    start_date: "2026-08-25",
    end_date: "2026-09-08",
    valid_from: "2026-08-25",
    valid_until: "2026-09-08",
    badge: "JANMASHTAMI UTSAV 🦚",
    badge_text: "JANMASHTAMI UTSAV 🦚",
    theme_color: "#1E3A8A",
    banner_image: "asset://festivals/janmashtami.png",
    image_url: "asset://festivals/janmashtami.png",
    monthStart: 8,
    dayStart: 25,
    monthEnd: 9,
    dayEnd: 8,
    priority: 90,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on traditional and floral styles above ₹700."
  },
  {
    id: 3,
    festival_id: 3,
    festival: "Ganesh Chaturthi 🐘",
    festival_name: "Ganesh Chaturthi 🐘",
    festival_code: "ganesh_chaturthi",
    title: "Ganesh Chaturthi Special 🐘",
    subtitle: "Flat 20% OFF on festive doorstep mehndi bookings",
    description: "Welcome Bappa with auspicious modak, elephant & floral mehndi art.",
    code: "BAPPA20",
    coupon_code: "BAPPA20",
    discount: "20% OFF",
    discount_text: "20% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 600,
    max_discount: 500,
    start_date: "2026-09-05",
    end_date: "2026-09-22",
    valid_from: "2026-09-05",
    valid_until: "2026-09-22",
    badge: "GANESH UTSAV 🐘",
    badge_text: "GANESH UTSAV 🐘",
    theme_color: "#EA580C",
    banner_image: "asset://festivals/ganesh_chaturthi.png",
    image_url: "asset://festivals/ganesh_chaturthi.png",
    monthStart: 9,
    dayStart: 5,
    monthEnd: 9,
    dayEnd: 22,
    priority: 90,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on all festival bookings above ₹600."
  },
  {
    id: 4,
    festival_id: 4,
    festival: "Navratri & Durga Puja 💃",
    festival_name: "Navratri & Durga Puja 💃",
    festival_code: "navratri",
    title: "Navratri Dandiya Special 💃",
    subtitle: "Flat 25% OFF on stylish festive henna trails & back-hand patterns",
    description: "Dandiya-ready palms with gorgeous Khafif, Indo-Arabic & mirror motifs.",
    code: "GARBA25",
    coupon_code: "GARBA25",
    discount: "25% OFF",
    discount_text: "25% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 25,
    min_booking_amount: 800,
    max_discount: 750,
    start_date: "2026-09-25",
    end_date: "2026-10-18",
    valid_from: "2026-09-25",
    valid_until: "2026-10-18",
    badge: "NAVRATRI DHAMAKA 💃",
    badge_text: "NAVRATRI DHAMAKA 💃",
    theme_color: "#9333EA",
    banner_image: "asset://festivals/navratri.png",
    image_url: "asset://festivals/navratri.png",
    monthStart: 9,
    dayStart: 25,
    monthEnd: 10,
    dayEnd: 18,
    priority: 95,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on all bookings above ₹800. Max discount ₹750."
  },
  {
    id: 5,
    festival_id: 5,
    festival: "Karwa Chauth 🌙",
    festival_name: "Karwa Chauth 🌙",
    festival_code: "karwa_chauth",
    title: "Karwa Chauth Luxury Henna 🌙",
    subtitle: "Flat ₹500 OFF on full arm Marwari & portrait bridal mehndi",
    description: "Specialized Marwari, Jaal & Portrait Mehndi for the most romantic festival.",
    code: "KARWA500",
    coupon_code: "KARWA500",
    discount: "₹500 OFF",
    discount_text: "₹500 OFF",
    discount_type: "FLAT",
    discount_value: 500,
    min_booking_amount: 1500,
    max_discount: 500,
    start_date: "2026-10-15",
    end_date: "2026-11-05",
    valid_from: "2026-10-15",
    valid_until: "2026-11-05",
    badge: "KARWA CHAUTH ROYAL 🌙",
    badge_text: "KARWA CHAUTH ROYAL 🌙",
    theme_color: "#881337",
    banner_image: "asset://festivals/karwa_chauth.png",
    image_url: "asset://festivals/karwa_chauth.png",
    monthStart: 10,
    dayStart: 15,
    monthEnd: 11,
    dayEnd: 5,
    priority: 100,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on bridal & full-arm packages above ₹1500."
  },
  {
    id: 6,
    festival_id: 6,
    festival: "Diwali & Dhanteras 🪔",
    festival_name: "Diwali & Dhanteras 🪔",
    festival_code: "diwali",
    title: "Diwali Festive Special 🪔",
    subtitle: "Flat 25% OFF on doorstep festive henna services",
    description: "Light up your celebrations with breathtaking floral & mandala patterns.",
    code: "DIWALI25",
    coupon_code: "DIWALI25",
    discount: "25% OFF",
    discount_text: "25% OFF",
    discount_type: "PERCENTAGE",
    discount_value: 25,
    min_booking_amount: 1000,
    max_discount: 1000,
    start_date: "2026-10-25",
    end_date: "2026-11-20",
    valid_from: "2026-10-25",
    valid_until: "2026-11-20",
    badge: "DIWALI UTSAV 🪔",
    badge_text: "DIWALI UTSAV 🪔",
    theme_color: "#D97706",
    banner_image: "asset://festivals/diwali.png",
    image_url: "asset://festivals/diwali.png",
    monthStart: 10,
    dayStart: 25,
    monthEnd: 11,
    dayEnd: 20,
    priority: 100,
    target_type: "coupons",
    cta_text: "Book with Promo",
    cta_link: "Coupons",
    terms_conditions: "Valid on all bookings above ₹1000. Max discount ₹1000."
  }
];

/**
 * Helper to get current date in IST timezone (Asia/Kolkata)
 */
export function getISTDateString(d = new Date()) {
  try {
    const istStr = d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istStr);
    const yyyy = istDate.getFullYear();
    const mm = String(istDate.getMonth() + 1).padStart(2, "0");
    const dd = String(istDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch (_) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Get dynamic festival offers fallback based on current IST date (Rolling Window)
 * @param {Date} [currentDate]
 * @returns {Array} Exactly up to 4 active and upcoming festival banner objects
 */
export function getActiveFestivalOffers(currentDate = new Date()) {
  const istDateStr = getISTDateString(currentDate);
  const month = parseInt(istDateStr.slice(5, 7), 10);
  const day = parseInt(istDateStr.slice(8, 10), 10);

  const active = [];
  const upcoming = [];

  FALLBACK_FESTIVAL_CONFIGS.forEach((fest) => {
    let isActive = false;
    let isUpcoming = false;

    if (fest.monthStart <= fest.monthEnd) {
      if (month >= fest.monthStart && month <= fest.monthEnd) {
        if ((month > fest.monthStart || day >= fest.dayStart) && (month < fest.monthEnd || day <= fest.dayEnd)) {
          isActive = true;
        }
      } else if (month < fest.monthStart || (month === fest.monthStart && day < fest.dayStart)) {
        isUpcoming = true;
      }
    } else {
      // Year crossing (e.g. Dec to Jan)
      if (month >= fest.monthStart || month <= fest.monthEnd) {
        if (month === fest.monthStart && day >= fest.dayStart) isActive = true;
        else if (month === fest.monthEnd && day <= fest.dayEnd) isActive = true;
        else if (month > fest.monthStart || month < fest.monthEnd) isActive = true;
      }
    }

    if (isActive) {
      active.push({ ...fest, is_current_active: true, is_upcoming: false });
    } else if (isUpcoming) {
      upcoming.push({ ...fest, is_current_active: false, is_upcoming: true });
    }
  });

  active.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  upcoming.sort((a, b) => (a.valid_from || "").localeCompare(b.valid_from || "") || (b.priority || 0) - (a.priority || 0));

  const result = [...active, ...upcoming];
  if (result.length > 0) return result.slice(0, 4);

  return FALLBACK_FESTIVAL_CONFIGS.slice(0, 4);
}
