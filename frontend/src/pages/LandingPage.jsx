import React, { useState, useEffect } from "react";
import { artistService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Star,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { formatAdminDate, formatAdminTime } from "../utils/dateFormatter";

const LandingPage = ({ showToast }) => {
  const { isAuthenticated, user } = useAuth();
  const [artists, setArtists] = useState([]);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rating");

  // Booking modal states
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [eventType, setEventType] = useState("Wedding");
  const [budget, setBudget] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Artist details modal states
  const [selectedArtistForDetails, setSelectedArtistForDetails] =
    useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (user?.role === "ARTIST") {
      fetchCustomerDirectory();
    } else {
      fetchArtists();
    }
  }, [sort, user]);

  const fetchCustomerDirectory = async () => {
    setLoading(true);
    try {
      const res = await artistService.getArtistBookings();
      setCustomerBookings(res.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    setLoading(true);
    try {
      // Fetch list of approved artists
      const res = await artistService.getArtists();
      setArtists(res.data.rows || res.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredArtists = artists.filter((artist) => {
    const searchLower = search.toLowerCase();
    const nameMatch = artist.user?.name?.toLowerCase().includes(searchLower);
    const bioMatch = artist.bio?.toLowerCase().includes(searchLower);
    const cityMatch = artist.city?.toLowerCase().includes(searchLower);
    const pinMatch = artist.pincode?.includes(searchLower);
    return nameMatch || bioMatch || cityMatch || pinMatch;
  });

  const openBookingModal = async (artist) => {
    if (!isAuthenticated) {
      showToast("Please login as a User to book an artist", "warning");
      return;
    }
    if (user.role !== "USER") {
      showToast("Only customers can book artists", "warning");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await artistService.getDetails(artist.id);
      setSelectedArtist(res.data);
      setSelectedService(null);
      setSelectedSlot(null);
    } catch (e) {
      showToast("Failed to fetch artist details: " + e.message, "danger");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewDetails = async (artist) => {
    setLoadingDetails(true);
    try {
      const res = await artistService.getDetails(artist.id);
      setSelectedArtistForDetails(res.data);
    } catch (e) {
      showToast("Failed to fetch artist details: " + e.message, "danger");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      showToast(
        "Please select a service and an available time slot",
        "warning",
      );
      return;
    }

    setBookingLoading(true);
    try {
      await artistService.createBooking({
        artist_id: selectedArtist.id,
        service_id: selectedService.id,
        slot_id: selectedSlot.id,
        address,
        notes: `[Event Type: ${eventType}] [Budget: ₹${budget}] ${notes}`,
      });
      showToast(
        "Booking created successfully! Check your dashboard.",
        "success",
      );
      setSelectedArtist(null);
      fetchArtists(); // refresh list
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      {user?.role === "ARTIST" ? (
        <>
          <div
            className="glass-panel"
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              marginBottom: "2rem",
              background:
                "linear-gradient(135deg, rgba(217, 125, 100, 0.1) 0%, rgba(200, 104, 80, 0.05) 100%)",
            }}
          >
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                marginBottom: "1rem",
              }}
            >
              Customer Directory
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--text-secondary)",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              View and manage your leads, requests, and customer information.
            </p>
          </div>

          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: "200px" }} />
              ))}
            </div>
          ) : customerBookings.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: "4rem",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              <BookOpen
                style={{
                  width: "48px",
                  height: "48px",
                  marginBottom: "1rem",
                  color: "var(--accent-color)",
                }}
              />
              <h3>No Customers Yet</h3>
              <p>You don't have any bookings or leads to display.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {customerBookings.map((booking) => {
                const user = booking.user || {};
                return (
                  <div
                    key={booking.id}
                    className="glass-panel"
                    style={{ padding: "1.5rem" }}
                  >
                    <h3 style={{ margin: "0 0 0.5rem 0" }}>
                      {user.name || "Customer"}
                    </h3>
                    <p
                      style={{
                        margin: "0 0 0.5rem 0",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {user.email || "No email provided"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid var(--border-color)",
                        paddingTop: "1rem",
                      }}
                    >
                      <span
                        className={`badge badge-${booking.booking_status.toLowerCase()}`}
                      >
                        {booking.booking_status}
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        ,1{booking.total_price}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Hero Banner */}
          <div
            className="glass-panel"
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              marginBottom: "2rem",
              background:
                "linear-gradient(135deg, rgba(217, 125, 100, 0.1) 0%, rgba(200, 104, 80, 0.05) 100%)",
            }}
          >
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 800,
                marginBottom: "1rem",
              }}
            >
              Book Professional{" "}
              <span className="text-accent">Mehndi Artists</span> Near You
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                maxWidth: "600px",
                margin: "0 auto 1.5rem",
              }}
            >
              Find top-rated, certified mehndi designers for weddings,
              festivals, and special occasions. Real-time availability & upfront
              pricing.
            </p>

            {/* Search Bar */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                maxWidth: "600px",
                margin: "0 auto",
                position: "relative",
              }}
            >
              <Search
                style={{
                  position: "absolute",
                  left: "15px",
                  top: "12px",
                  color: "var(--text-secondary)",
                  width: "20px",
                }}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, city, pincode, or bio..."
                value={search}
                onChange={handleSearch}
                style={{ paddingLeft: "3rem" }}
              />
              <select
                className="form-control"
                style={{ width: "160px" }}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="rating">Top Rated</option>
                <option value="latest">Newest</option>
              </select>
            </div>
          </div>

          <h2 style={{ marginBottom: "1rem", fontWeight: 700 }}>
            Available Artists
          </h2>

          {loading ? (
            <div className="card-grid">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="artist-card"
                  style={{ height: "360px" }}
                >
                  <div
                    className="skeleton"
                    style={{ height: "200px", width: "100%" }}
                  />
                  <div style={{ padding: "1.25rem" }}>
                    <div
                      className="skeleton"
                      style={{
                        height: "24px",
                        width: "60%",
                        marginBottom: "10px",
                      }}
                    />
                    <div
                      className="skeleton"
                      style={{
                        height: "16px",
                        width: "80%",
                        marginBottom: "10px",
                      }}
                    />
                    <div
                      className="skeleton"
                      style={{
                        height: "40px",
                        width: "40%",
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredArtists.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem",
                color: "var(--text-secondary)",
              }}
            >
              <p>
                No artists found matching your criteria. Try adjusting your
                search query.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {filteredArtists.map((artist) => (
                <div key={artist.id} className="artist-card">
                  <img
                    src={
                      artist.user?.profile_image ||
                      "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400"
                    }
                    alt={artist.user?.name}
                    className="artist-card-img"
                  />
                  <div className="artist-card-content">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                        {artist.user?.name}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ffb300",
                        }}
                      >
                        <Star style={{ fill: "#ffb300", width: "16px" }} />
                        <span
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {artist.avg_rating || "New"}
                        </span>
                      </div>
                    </div>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <MapPin style={{ width: "14px" }} /> {artist.city},{" "}
                      {artist.state} ({artist.pincode})
                    </p>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        lineBreak: "anywhere",
                        height: "60px",
                        overflow: "hidden",
                      }}
                    >
                      {artist.bio}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {artist.experience_years} Years Exp.
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="btn btn-secondary"
                          style={{
                            flexGrow: 1,
                            padding: "0.5rem",
                            minHeight: "36px",
                            fontSize: "0.85rem",
                          }}
                          onClick={() => handleViewDetails(artist)}
                          disabled={loadingDetails}
                        >
                          View Details
                        </button>
                        <button
                          className="btn btn-primary"
                          style={{
                            flexGrow: 1,
                            padding: "0.5rem",
                            minHeight: "36px",
                            fontSize: "0.85rem",
                          }}
                          onClick={() => openBookingModal(artist)}
                        >
                          Book Session
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Booking Modal */}
          {selectedArtist && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.6)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
              }}
            >
              <div
                className="glass-panel"
                style={{
                  width: "100%",
                  maxWidth: "600px",
                  background: "var(--bg-secondary)",
                  padding: "2rem",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setSelectedArtist(null)}
                  style={{
                    position: "absolute",
                    top: "1.5rem",
                    right: "1.5rem",
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  &times;
                </button>
                <h2 style={{ marginBottom: "1rem" }}>
                  Book appointment with {selectedArtist.user?.name}
                </h2>

                <form onSubmit={handleBookingSubmit}>
                  {/* Select Service */}
                  <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                    1. Select a Mehndi Service
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {selectedArtist.services?.length === 0 ? (
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                        }}
                      >
                        No services listed by this artist.
                      </p>
                    ) : (
                      selectedArtist.services?.map((svc) => (
                        <label
                          key={svc.id}
                          style={{
                            padding: "0.8rem",
                            border:
                              selectedService?.id === svc.id
                                ? "2px solid var(--accent-color)"
                                : "1px solid var(--border-color)",
                            borderRadius: "10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background:
                              selectedService?.id === svc.id
                                ? "var(--bg-tertiary)"
                                : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="service"
                            style={{ display: "none" }}
                            onChange={() => setSelectedService(svc)}
                          />
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {svc.specialization_name} ({svc.category})
                            </div>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {svc.description}
                            </div>
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              color: "var(--accent-color)",
                            }}
                          >
                            ₹{svc.minimum_price}
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  {/* Select Slot */}
                  <h4 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                    2. Choose Available Time Slot
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    {selectedArtist.slots?.length === 0 ? (
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.9rem",
                        }}
                      >
                        No availability slots set up by this artist.
                      </p>
                    ) : (
                      selectedArtist.slots?.map((slot) => {
                        const startTimeVal = slot.start_time || slot.slot_time || slot.date;
                        const isSelected = selectedSlot?.id === slot.id;
                        return (
                          <label
                            key={slot.id}
                            style={{
                              padding: "0.5rem 1rem",
                              border: isSelected
                                ? "2px solid var(--accent-color)"
                                : "1px solid var(--border-color)",
                              borderRadius: "20px",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              background: isSelected
                                ? "var(--bg-tertiary)"
                                : "var(--bg-primary)",
                              color: isSelected
                                ? "var(--accent-color)"
                                : "var(--text-primary)",
                              fontWeight: isSelected ? 600 : 500,
                            }}
                          >
                            <input
                              type="radio"
                              name="slot"
                              style={{ display: "none" }}
                              onChange={() => setSelectedSlot(slot)}
                            />
                            <Calendar
                              style={{ width: "12px", marginRight: "3px" }}
                            />
                            {formatAdminDate(startTimeVal)} -{" "}
                            <Clock style={{ width: "12px", margin: "0 3px" }} />
                            {formatAdminTime(startTimeVal)}
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Address */}
                  <div className="form-group">
                    <label className="form-label">
                      Event Location (Address)
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Enter full address for the venue..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  {/* Event Type & Budget */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">Event Type</label>
                      <select
                        className="form-control"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                      >
                        <option value="Wedding">Wedding</option>
                        <option value="Birthday">Birthday</option>
                        <option value="Festival">Festival</option>
                        <option value="Concert">Concert/Gig</option>
                        <option value="Corporate">Corporate Event</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Event Budget (INR)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 5000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="form-group">
                    <label className="form-label">
                      Special Notes / Requests (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Arabic theme, bridal patterns, specific hands height..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      marginTop: "1rem",
                    }}
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? "Reserving slot..." : "Confirm Booking"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Artist Profile Details Modal */}
          {selectedArtistForDetails && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.6)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
              }}
            >
              <div
                className="glass-panel"
                style={{
                  width: "100%",
                  maxWidth: "700px",
                  background: "var(--bg-secondary)",
                  padding: "2rem",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setSelectedArtistForDetails(null)}
                  style={{
                    position: "absolute",
                    top: "1.5rem",
                    right: "1.5rem",
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                >
                  &times;
                </button>

                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src={
                      selectedArtistForDetails.user?.profile_image ||
                      "https://images.unsplash.com/photo-1590502593747-42a996133562?q=80&w=400"
                    }
                    alt={selectedArtistForDetails.user?.name}
                    style={{
                      width: "90px",
                      height: "90px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid var(--accent-color)",
                    }}
                  />
                  <div>
                    <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
                      {selectedArtistForDetails.user?.name}
                    </h2>
                    <p
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                        marginTop: "0.25rem",
                      }}
                    >
                      <MapPin style={{ width: "14px" }} />{" "}
                      {selectedArtistForDetails.city},{" "}
                      {selectedArtistForDetails.state} (
                      {selectedArtistForDetails.pincode})
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        marginTop: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#ffb300",
                        }}
                      >
                        <Star style={{ fill: "#ffb300", width: "16px" }} />
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {selectedArtistForDetails.average_rating || "New"}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        •
                      </span>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {selectedArtistForDetails.experience_years} Years Exp.
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--bg-primary)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h4 style={{ marginBottom: "0.4rem", fontWeight: 700 }}>
                    About the Artist
                  </h4>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {selectedArtistForDetails.bio}
                  </p>
                </div>

                {/* Services catalog */}
                <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>
                  Mehndi Services Offered
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {selectedArtistForDetails.services?.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                      }}
                    >
                      No services listed by this artist.
                    </p>
                  ) : (
                    selectedArtistForDetails.services?.map((svc) => (
                      <div
                        key={svc.id}
                        style={{
                          padding: "0.8rem 1rem",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "var(--bg-primary)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {svc.specialization_name} ({svc.category})
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {svc.description}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "var(--accent-color)",
                          }}
                        >
                          ₹{svc.minimum_price}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Portfolio gallery view */}
                <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>
                  Portfolio Work Gallery
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {selectedArtistForDetails.portfolio?.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                        gridColumn: "1 / -1",
                      }}
                    >
                      No portfolio images uploaded by this artist.
                    </p>
                  ) : (
                    selectedArtistForDetails.portfolio?.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          position: "relative",
                          borderRadius: "8px",
                          overflow: "hidden",
                          aspectRatio: "1",
                          cursor: "pointer",
                          border: "1px solid var(--border-color)",
                        }}
                        onClick={() => setPreviewImage(item.image_url)}
                      >
                        <img
                          src={item.image_url}
                          alt={item.caption || "Mehndi design work"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        {item.caption && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              fontSize: "0.75rem",
                              padding: "0.3rem",
                              textAlign: "center",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.caption}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Reviews view */}
                <h4 style={{ marginBottom: "0.75rem", fontWeight: 700 }}>
                  Customer Reviews
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {selectedArtistForDetails.reviews?.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                      }}
                    >
                      No reviews submitted yet.
                    </p>
                  ) : (
                    selectedArtistForDetails.reviews?.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          paddingBottom: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            {r.user?.name || "Client"}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.2",
                              color: "#ffb300",
                            }}
                          >
                            <Star style={{ fill: "#ffb300", width: "14px" }} />
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                color: "var(--text-primary)",
                              }}
                            >
                              {r.rating}
                            </span>
                          </div>
                        </div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {r.comment}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ flexGrow: 1, justifyContent: "center" }}
                    onClick={() => setSelectedArtistForDetails(null)}
                  >
                    Close Profile
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flexGrow: 1, justifyContent: "center" }}
                    onClick={() => {
                      setSelectedArtistForDetails(null);
                      openBookingModal(selectedArtistForDetails);
                    }}
                  >
                    Book Session Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nested Portfolio Image Preview Lightbox Modal */}
          {previewImage && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.85)",
                zIndex: 1100,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
              }}
              onClick={() => setPreviewImage(null)}
            >
              <div
                style={{
                  position: "relative",
                  maxWidth: "90%",
                  maxHeight: "90%",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewImage(null)}
                  style={{
                    position: "absolute",
                    top: "-2.5rem",
                    right: 0,
                    background: "none",
                    border: "none",
                    color: "#fff",
                    fontSize: "2rem",
                    cursor: "pointer",
                  }}
                >
                  &times;
                </button>
                <img
                  src={previewImage}
                  alt="Mehndi design detail view"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    borderRadius: "12px",
                    objectFit: "contain",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LandingPage;
