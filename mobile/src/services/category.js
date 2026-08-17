import apiRequest from "./api";

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Bridal Mehndi", slug: "bridal", description: "Intricate bridal & wedding designs", starting_price: 2100 },
  { id: 2, name: "Arabic Mehndi", slug: "arabic", description: "Bold floral & flowing trails", starting_price: 500 },
  { id: 3, name: "Indo-Arabic Fusion", slug: "indo-arabic", description: "Blend of Indian & Arabic artistry", starting_price: 700 },
  { id: 4, name: "Traditional Mehndi", slug: "traditional", description: "Classic marwari, peacocks & motifs", starting_price: 800 },
  { id: 5, name: "Floral & Jaal", slug: "floral", description: "Delicate mesh & floral vines", starting_price: 600 },
  { id: 6, name: "Minimalist Modern", slug: "minimal", description: "Contemporary chic & minimalist arts", starting_price: 400 },
  { id: 7, name: "Finger Mehndi", slug: "finger", description: "Intricate ring & finger artwork", starting_price: 250 },
  { id: 8, name: "Full Hand Bridal", slug: "full-hand", description: "Full forearm & palm coverage", starting_price: 1500 },
  { id: 9, name: "Feet & Anklet Mehndi", slug: "leg", description: "Feet, bridal payal & ankle motifs", starting_price: 800 },
  { id: 10, name: "Kids Mehndi", slug: "kids", description: "Cute, quick & organic Mehndi for kids", starting_price: 200 },
  { id: 11, name: "Groom Mehndi", slug: "groom", description: "Subtle & elegant groom designs", starting_price: 500 },
  { id: 12, name: "Engagement / Roka", slug: "engagement", description: "Special engagement celebration designs", starting_price: 1100 }
];

export async function getLiveCategories() {
  // 1. Query live Cloudflare Worker category endpoint
  try {
    const res = await apiRequest("GET", "/mehndigo/category/list", null, false);
    const list = res?.data || res?.categories || (Array.isArray(res) ? res : null);
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (_) {}

  // 2. Return curated default categories fallback
  return DEFAULT_CATEGORIES;
}
