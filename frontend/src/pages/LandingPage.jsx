import React, { useState, useEffect } from "react";
import { artistService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Star,
  MapPin,
  BookOpen
} from "lucide-react";
import ArtistProfileModal from "../components/ArtistProfileModal";
import BookingModal from "../components/BookingModal";

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
                    <p
                      style={{
                        margin: "0 0 1rem 0",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {user.phone || "No phone provided"}
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
          <BookingModal
            artist={selectedArtist}
            onClose={() => setSelectedArtist(null)}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            address={address}
            setAddress={setAddress}
            eventType={eventType}
            setEventType={setEventType}
            budget={budget}
            setBudget={setBudget}
            notes={notes}
            setNotes={setNotes}
            onSubmit={handleBookingSubmit}
            loading={bookingLoading}
          />

          {/* Artist Profile Details Modal */}
          <ArtistProfileModal
            artist={selectedArtistForDetails}
            onClose={() => setSelectedArtistForDetails(null)}
            onBook={(artist) => openBookingModal(artist)}
            setPreviewImage={setPreviewImage}
          />

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
