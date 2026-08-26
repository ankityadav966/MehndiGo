import apiRequest from "./api";

export async function getHomeDashboard(latitude = null, longitude = null) {
  let endpoint = "/customer/home";
  if (latitude && longitude) {
    endpoint += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function getCustomerDashboard() {
  const res = await apiRequest("GET", "/customer/dashboard", null, true);
  return res?.data || res;
}

export async function getCategories() {
  const res = await apiRequest("GET", "/customer/categories", null, true);
  return res?.data || res;
}

export async function getOffers() {
  const res = await apiRequest("GET", "/customer/festivals/active", null, true);
  return res?.data || res;
}
export async function getActiveFestivalBanners() {
  const res = await apiRequest("GET", "/customer/festivals/active", null, true);
  return res?.data || res;
}

export async function getNearbyArtists(latitude = null, longitude = null, radius = null, page = 1, limit = 15, filter = null) {
  let endpoint = `/customer/nearby-artists?page=${page}&limit=${limit}`;
  if (radius) {
    endpoint += `&radius=${radius}`;
  }
  if (latitude && longitude) {
    endpoint += `&latitude=${latitude}&longitude=${longitude}`;
  }
  if (filter) {
    endpoint += `&filter=${encodeURIComponent(filter)}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  if (res && res.data !== undefined) {
    const list = Array.isArray(res.data) ? res.data : (res.rows || []);
    const count = typeof res.count === 'number' ? res.count : (typeof res.total === 'number' ? res.total : list.length);
    return { rows: list, data: list, count, total: count, success: res.success !== false };
  }
  return res;
}

export async function searchArtists(query = "", filters = {}, sort = "nearest", latitude = null, longitude = null, page = 1, limit = 15) {
  let endpoint = `/customer/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}&sort=${sort}`;
  
  if (latitude && longitude) {
    endpoint += `&latitude=${latitude}&longitude=${longitude}`;
  }
  
  Object.keys(filters).forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      endpoint += `&${key}=${encodeURIComponent(filters[key])}`;
    }
  });

  const res = await apiRequest("GET", endpoint, null, true);
  if (res && res.data !== undefined) {
    const list = Array.isArray(res.data) ? res.data : (res.rows || []);
    const count = typeof res.count === 'number' ? res.count : (typeof res.total === 'number' ? res.total : list.length);
    return { rows: list, data: list, count, total: count, success: res.success !== false };
  }
  return res;
}

export async function getArtistById(artistId) {
  const res = await apiRequest("GET", `/customer/artists/${artistId}`, null, true);
  return res?.data || res;
}

export async function getTrendingArtists(latitude = null, longitude = null) {
  let endpoint = "/customer/trending-artists";
  if (latitude && longitude) {
    endpoint += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function getRecommendedArtists(latitude = null, longitude = null) {
  let endpoint = "/customer/recommended-artists";
  if (latitude && longitude) {
    endpoint += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function getSearchSuggestions(query = "") {
  const res = await apiRequest("GET", `/customer/search/suggestions?query=${encodeURIComponent(query)}`, null, true);
  return res?.data || res;
}

export async function getTrendingSearches() {
  const res = await apiRequest("GET", "/customer/trending-search", null, true);
  return res?.data || res;
}

export async function getRecentSearches() {
  const res = await apiRequest("GET", "/customer/recent-search", null, true);
  return res?.data || res;
}

export async function saveRecentSearch(query = "") {
  const res = await apiRequest("POST", "/customer/recent-search", { query }, true);
  return res?.data || res;
}

export async function deleteRecentSearch(queryId) {
  const res = await apiRequest("DELETE", `/customer/recent-search?queryId=${queryId}`, null, true);
  return res?.data || res;
}

export async function getFilterMetadata() {
  const res = await apiRequest("GET", "/customer/filter", null, true);
  return res?.data || res;
}

export async function getFavorites() {
  const res = await apiRequest("GET", "/customer/favorite", null, true);
  return res?.data || res;
}

export async function addFavorite(artistId) {
  const res = await apiRequest("POST", "/customer/favorite", { artistId }, true);
  return res?.data || res;
}

export async function removeFavorite(artistId) {
  const res = await apiRequest("DELETE", `/customer/favorite?artistId=${artistId}`, null, true);
  return res?.data || res;
}

export const removeArtistFavorite = removeFavorite;
export const addArtistFavorite = addFavorite;

// Singular artist profile queries
export async function fetchArtistProfile(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}`, null, true);
  return res?.data || res;
}

export async function fetchArtistServices(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/services`, null, true);
  return res?.data || res;
}

export async function fetchArtistPortfolio(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/portfolio`, null, true);
  return res?.data || res;
}

export async function fetchArtistReviews(id, page = 1, limit = 6) {
  const query = `?page=${page}&limit=${limit}`;
  const res = await apiRequest("GET", `/customer/artist/${id}/reviews${query}`, null, true);
  return res?.data || res;
}

export async function fetchArtistAvailability(id, date = null) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await apiRequest("GET", `/customer/artist/${id}/availability${query}`, null, true);
  return res?.data || res;
}

export async function fetchSimilarArtists(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/similar`, null, true);
  return res?.data || res;
}

// Customer Portfolio & Gallery Actions
export async function fetchPortfolios(query = "", filters = {}, page = 1, limit = 10) {
  let endpoint = `/customer/portfolio?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;
  
  Object.keys(filters).forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      endpoint += `&${key}=${encodeURIComponent(filters[key])}`;
    }
  });

  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function likePortfolioItem(portfolioId) {
  const res = await apiRequest("POST", "/customer/portfolio/like", { portfolioId }, true);
  return res?.data || res;
}

export async function unlikePortfolioItem(portfolioId) {
  const res = await apiRequest("DELETE", `/customer/portfolio/like?portfolioId=${portfolioId}`, null, true);
  return res?.data || res;
}

export async function savePortfolioItem(portfolioId) {
  const res = await apiRequest("POST", "/customer/portfolio/save", { portfolioId }, true);
  return res?.data || res;
}

export async function unsavePortfolioItem(portfolioId) {
  const res = await apiRequest("DELETE", `/customer/portfolio/save?portfolioId=${portfolioId}`, null, true);
  return res?.data || res;
}

export async function fetchSavedPortfolios() {
  const res = await apiRequest("GET", "/customer/portfolio/saved", null, true);
  return res?.data || res;
}

export async function getCustomerBookings() {
  const res = await apiRequest("GET", "/customer/bookings", null, true);
  return res?.data || res;
}

export async function getCustomerProfile() {
  const res = await apiRequest("GET", "/customer/profile", null, true);
  return res?.data || res;
}

export async function updateCustomerProfile(profileData) {
  const res = await apiRequest("PUT", "/customer/profile", profileData, true);
  return res?.data || res;
}

export async function getWalletDetails() {
  const res = await apiRequest("GET", "/wallet", null, true);
  return res?.data || res;
}

export async function getWalletTransactions() {
  const res = await apiRequest("GET", "/wallet/transactions", null, true);
  return res?.data || res || [];
}

export async function getCustomerWishlist() {
  const res = await apiRequest("GET", "/customer/wishlist", null, true);
  return res?.data || res;
}

export async function getCustomerCoupons() {
  const res = await apiRequest("GET", "/customer/coupons", null, true);
  return res?.data || res;
}

export async function getCustomerNotifications() {
  const notifMap = new Map();
  try {
    const res = await apiRequest("GET", "/admin/notifications", null, false).catch(() => ({}));
    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  try {
    const res = await apiRequest("GET", "/notifications", null, true).catch(() => ({}));
    const list = Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res?.data?.notifications) ? res.data.notifications : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])));
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  try {
    const res = await apiRequest("GET", "/customer/notifications", null, true).catch(() => ({}));
    const list = Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res?.data?.notifications) ? res.data.notifications : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])));
    list.forEach(n => { if (n && n.id) notifMap.set(n.id, n); });
  } catch (_) {}

  const combined = Array.from(notifMap.values());
  return { notifications: combined, data: { notifications: combined } };
}

export async function getCustomerAddresses() {
  const res = await apiRequest("GET", "/customer/addresses", null, true);
  return res?.data || res;
}

export async function getCustomerReviews() {
  const res = await apiRequest("GET", "/customer/reviews", null, true);
  return res?.data || res;
}

export async function saveCustomerAddress(addressData) {
  const res = await apiRequest("POST", "/customer/addresses", addressData, true);
  return res?.data || res;
}

export async function updateCustomerAddress(addressId, addressData) {
  const res = await apiRequest("PUT", `/customer/addresses/${addressId}`, addressData, true);
  return res?.data || res;
}

export async function setDefaultCustomerAddress(addressId) {
  const res = await apiRequest("PATCH", `/customer/addresses/${addressId}/default`, null, true);
  return res?.data || res;
}

export async function deleteCustomerAddress(addressId) {
  const res = await apiRequest("DELETE", `/customer/addresses/${addressId}`, null, true);
  return res?.data || res;
}

export async function changePassword(passwordData) {
  const res = await apiRequest("POST", "/customer/change-password", passwordData, true);
  return res?.data || res;
}

export async function deleteAccount(confirmationData) {
  const res = await apiRequest("DELETE", "/customer/account", confirmationData, true);
  return res?.data || res;
}


export async function submitSupportTicket(ticketData) {
  try {
    const res = await apiRequest("POST", "/support/ticket", ticketData, true);
    return res?.data || res;
  } catch (_) {
    const res = await apiRequest("POST", "/customer/support/ticket", ticketData, true);
    return res?.data || res;
  }
}

export async function getSupportTickets() {
  try {
    const res = await apiRequest("GET", "/support/tickets", null, true);
    return res?.data || res;
  } catch (_) {
    const res = await apiRequest("GET", "/customer/support/tickets", null, true);
    return res?.data || res;
  }
}

export async function getSupportTicketDetails(id) {
  try {
    const res = await apiRequest("GET", `/customer/support/tickets/${id}`, null, true);
    if (res?.data) return res.data;
    if (res?.id || res?.ticket_id) return res;
  } catch (_) {}

  const res = await apiRequest("GET", `/support/tickets/${id}`, null, true);
  return res?.data || res;
}

export async function replySupportTicket(id, replyData) {
  try {
    const res = await apiRequest("POST", `/customer/support/tickets/${id}/reply`, replyData, true);
    return res?.data || res;
  } catch (_) {
    const res = await apiRequest("POST", `/support/tickets/${id}/reply`, replyData, true);
    return res?.data || res;
  }
}

export async function closeSupportTicket(id) {
  try {
    const res = await apiRequest("PUT", `/support/tickets/${id}/close`, null, true);
    return res?.data || res;
  } catch (_) {
    const res = await apiRequest("PUT", `/customer/support/tickets/${id}/close`, null, true);
    return res?.data || res;
  }
}

export async function reopenSupportTicket(id) {
  try {
    const res = await apiRequest("POST", `/support/tickets/${id}/reopen`, null, true);
    return res?.data || res;
  } catch (_) {
    const res = await apiRequest("PUT", `/support/tickets/${id}/status`, { status: "OPEN" }, true);
    return res?.data || res;
  }
}

export async function markTicketAsRead(id) {
  return { success: true };
}

export async function getReels(page = 1, limit = 10) {
  try {
    const data = await apiRequest("GET", `/customer/reels?page=${page}&limit=${limit}`, null, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error fetching reels:", error);
    throw error;
  }
}

export async function getReelById(reelId) {
  try {
    const data = await apiRequest("GET", `/customer/reels/${reelId}`, null, true);
    return data?.data?.reel || data?.data || data?.reel || data;
  } catch (error) {
    console.error("Error fetching single reel:", error);
    throw error;
  }
}

export async function likePortfolio(id) {
  try {
    const data = await apiRequest("POST", "/customer/portfolio/like", { portfolio_id: id }, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error liking portfolio:", error);
    throw error;
  }
}

export async function unlikePortfolio(id) {
  try {
    const data = await apiRequest("DELETE", "/customer/portfolio/like", { portfolio_id: id }, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error unliking portfolio:", error);
    throw error;
  }
}

export async function commentPortfolio(id, text) {
  try {
    const data = await apiRequest("POST", `/customer/portfolio/${id}/comment`, { text }, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error commenting on portfolio:", error);
    throw error;
  }
}

export async function getPortfolioComments(id, page = 1, limit = 20) {
  try {
    const data = await apiRequest("GET", `/customer/portfolio/${id}/comments?page=${page}&limit=${limit}`, null, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

export async function deletePortfolioComment(commentId) {
  try {
    const data = await apiRequest("DELETE", `/customer/portfolio/comment/${commentId}`, null, true);
    return data?.data || data;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}

export async function addViewToPortfolio(id) {
  try {
    const data = await apiRequest("POST", `/customer/portfolio/${id}/view`, null, true);
    return data?.data || data;
  } catch (error) {
    console.warn("View tracking failed (ignored):", error);
    return false;
  }
}
