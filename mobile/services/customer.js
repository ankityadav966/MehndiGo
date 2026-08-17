import apiRequest from "./api";

export async function getHomeDashboard(latitude = null, longitude = null) {
  let endpoint = "/customer/home";
  if (latitude && longitude) {
    endpoint += `?latitude=${latitude}&longitude=${longitude}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function getCategories() {
  const res = await apiRequest("GET", "/customer/categories", null, true);
  return res?.data || res;
}

export async function getOffers() {
  const res = await apiRequest("GET", "/customer/offers", null, true);
  return res?.data || res;
}

export async function getNearbyArtists(latitude = null, longitude = null, radius = 50, page = 1, limit = 10) {
  let endpoint = `/customer/nearby-artists?page=${page}&limit=${limit}&radius=${radius}`;
  if (latitude && longitude) {
    endpoint += `&latitude=${latitude}&longitude=${longitude}`;
  }
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function searchArtists(query = "", filters = {}, sort = "nearest", latitude = null, longitude = null, page = 1, limit = 10) {
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
  return res?.data || res;
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

export async function fetchArtistReviews(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/reviews`, null, true);
  return res?.data || res;
}

export async function fetchArtistAvailability(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/availability`, null, true);
  return res?.data || res;
}

export async function fetchSimilarArtists(id) {
  const res = await apiRequest("GET", `/customer/artist/${id}/similar`, null, true);
  return res?.data || res;
}

export async function addArtistFavorite(artistId) {
  const res = await apiRequest("POST", "/customer/artist/favorite", { artistId }, true);
  return res?.data || res;
}

export async function removeArtistFavorite(artistId) {
  const res = await apiRequest("DELETE", `/customer/artist/favorite?artistId=${artistId}`, null, true);
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

export async function getCustomerDashboard() {
  const res = await apiRequest("GET", "/customer/dashboard", null, true);
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
  const res = await apiRequest("GET", "/customer/notifications", null, true);
  return res?.data || res;
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

export async function deleteCustomerAddress(addressId) {
  const res = await apiRequest("DELETE", `/customer/addresses/${addressId}`, null, true);
  return res?.data || res;
}

export async function submitSupportTicket(ticketData) {
  const res = await apiRequest("POST", "/customer/support/ticket", ticketData, true);
  return res?.data || res;
}

export async function getSupportTickets() {
  const res = await apiRequest("GET", "/customer/support/tickets", null, true);
  return res?.data || res;
}

export async function getSupportTicketDetails(id) {
  const res = await apiRequest("GET", `/customer/support/tickets/${id}`, null, true);
  return res?.data || res;
}

export async function replySupportTicket(id, replyData) {
  const res = await apiRequest("POST", `/customer/support/tickets/${id}/reply`, replyData, true);
  return res?.data || res;
}

export async function closeSupportTicket(id) {
  const res = await apiRequest("PUT", `/customer/support/tickets/${id}/close`, null, true);
  return res?.data || res;
}
