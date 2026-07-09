import apiRequest from "./api";

export async function getLeads(filters = {}) {
  // Map parameters into query string
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const endpoint = `/artist/leads${queryString ? `?${queryString}` : ""}`;
  const res = await apiRequest("GET", endpoint, null, true);
  return res?.data || res;
}

export async function getLeadById(id) {
  const res = await apiRequest("GET", `/artist/leads/${id}`, null, true);
  return res?.data || res;
}

export async function acceptLead(bookingId) {
  const res = await apiRequest("PUT", "/artist/leads/accept", { booking_id: bookingId }, true);
  return res?.data || res;
}

export async function rejectLead(bookingId, reason) {
  const res = await apiRequest("PUT", "/artist/leads/reject", { booking_id: bookingId, reject_reason: reason }, true);
  return res?.data || res;
}

export async function viewLead(bookingId) {
  const res = await apiRequest("PUT", "/artist/leads/view", { booking_id: bookingId }, true);
  return res?.data || res;
}
