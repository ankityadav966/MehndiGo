import React, { useState, useEffect } from "react";
import { artistService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { Calendar, Clock, CreditCard, MessageSquare, Plus, Save, Settings, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatAdminDate, formatAdminTime } from "../utils/dateFormatter";

const UserDashboard = ({ showToast }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [profile, setProfile] = useState({ name: "", email: "", gender: "" });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");

  useEffect(() => {
    fetchUserData();

    // Socket.io for Real-time Notifications
    if (user?.id) {
      const token = localStorage.getItem("token");
      const socket = io("http://localhost:3000", {
        auth: { token },
        transports: ["websocket"]
      });

      socket.on("new_notification", (data) => {
        showToast(data.title + ": " + data.message, "info");
        // If the notification is a booking update, refresh data
        if (data.type === "BOOKING" || data.type === "PAYMENT") {
          fetchUserData();
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?.id]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const bookingsRes = await artistService.getBookings();
      setBookings(bookingsRes.data || []);
      
      const artistsRes = await artistService.getArtists();
      setArtists(artistsRes.data?.rows || artistsRes.data || []);

      const profileRes = await authService.getProfile();
      setProfile(profileRes.data || { name: "", email: "", gender: "" });
    } catch (e) {
      showToast("Error loading dashboard data: " + e.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await authService.updateProfile(profile);
      showToast("Profile updated successfully!", "success");
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setProfileSaving(false);
    }
  };

  // Standard checkout handler for Razorpay
  const handlePayment = async (booking) => {
    try {
      showToast("Redirecting to secure Razorpay gateway...", "info");
      const orderRes = await artistService.createOrder(booking.id);
      const orderData = orderRes.data || orderRes;
      const { order_id, amount, currency } = orderData;

      if (!order_id) {
        throw new Error("Order ID not returned from server");
      }

      const keyId = orderData.key_id || orderData.key || orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "";

      const options = {
        key: keyId,
        amount: amount,
        currency: currency || "INR",
        name: "MehndiGo",
        description: `Payment for Booking #${booking.booking_code || booking.id}`,
        order_id: order_id,
        handler: async function (response) {
          try {
            showToast("Verifying payment signature...", "info");
            const verifyRes = await artistService.verifyPayment({
              booking_id: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            showToast("Payment completed and verified successfully!", "success");
            fetchDashboardData();
          } catch (err) {
            showToast("Payment verification error: " + err.message, "danger");
          }
        },
        prefill: {
          name: profile?.name || "",
          email: profile?.email || "",
          contact: profile?.phone || ""
        },
        theme: {
          color: "#E11D48"
        },
        modal: {
          ondismiss: function () {
            showToast("Payment process cancelled.", "warning");
          }
        }
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please refresh the page.");
      }

      const razorpayModal = new window.Razorpay(options);

      razorpayModal.on("payment.failed", function (response) {
        console.error("Razorpay Payment Failed:", response.error);
        showToast(`Payment failed: ${response.error.description || response.error.reason}`, "danger");
      });

      razorpayModal.open();
    } catch (e) {
      showToast("Payment initialization failed: " + e.message, "danger");
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", color: "var(--text-secondary)" }}>
          User Panel
        </h3>
        <button
          className={`sidebar-link btn-secondary ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Calendar style={{ width: "18px" }} /> Bookings Tracker
        </button>
        <button
          className={`sidebar-link btn-secondary ${activeTab === "explore" ? "active" : ""}`}
          onClick={() => setActiveTab("explore")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <User style={{ width: "18px" }} /> Explore Artists
        </button>
        <button
          className={`sidebar-link btn-secondary ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Settings style={{ width: "18px" }} /> Account Settings
        </button>
        <div style={{ marginTop: "auto" }}>
          <button className="btn btn-secondary" onClick={logout} style={{ width: "100%", justifyContent: "center" }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {loading ? (
          <div>
            <div className="skeleton" style={{ height: "40px", width: "40%", marginBottom: "2rem" }} />
            <div className="skeleton" style={{ height: "200px", width: "100%" }} />
          </div>
        ) : activeTab === "bookings" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Welcome, {profile.name}!</h1>
                <p style={{ color: "var(--text-secondary)" }}>View, pay and manage your mehndi bookings below.</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate("/")}>
                <Plus style={{ width: "16px" }} /> Book New Artist
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <Calendar style={{ width: "48px", height: "48px", strokeWidth: 1.5, marginBottom: "1rem", color: "var(--accent-color)" }} />
                <h3>No Appointments Yet</h3>
                <p style={{ marginTop: "0.25rem", marginBottom: "1.5rem" }}>You haven't scheduled any mehndi appointments yet.</p>
                <button className="btn btn-primary" onClick={() => navigate("/")}>Browse Artists</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {bookings.map((booking) => {
                  const startTimeVal = booking.slot?.start_time || booking.booking_date || booking.created_at;
                  return (
                    <div key={booking.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{booking.service?.specialization_name}</span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>({booking.booking_code})</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <User style={{ width: "14px" }} /> Artist: {booking.artist?.user?.name || "Assigning..."}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Calendar style={{ width: "14px" }} /> {formatAdminDate(startTimeVal)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Clock style={{ width: "14px" }} /> {formatAdminTime(startTimeVal)}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                          Address: {booking.address}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Amount</div>
                          <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--accent-color)" }}>₹{booking.total_price}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Booking status</div>
                          <span className={`badge badge-${booking.booking_status.toLowerCase()}`}>{booking.booking_status}</span>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {booking.booking_status === "CONFIRMED" && booking.payment_status === "PENDING" && (
                            <button className="btn btn-primary" onClick={() => handlePayment(booking)}>
                              <CreditCard style={{ width: "16px" }} /> Pay Now
                            </button>
                          )}
                          {booking.payment_status === "PAID" && (
                            <button className="btn btn-secondary" onClick={() => showToast(`Invoice sent to ${profile.email || 'your email'}`, 'success')}>
                              <FileText style={{ width: "16px" }} /> Invoice
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/chat`, { state: { receiverId: booking.artist?.user?.id, receiverName: booking.artist?.user?.name } })}
                            disabled={!booking.artist?.user?.id}
                          >
                            <MessageSquare style={{ width: "16px" }} /> Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "explore" ? (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Explore All Artists</h1>
            {artists.length === 0 ? (
              <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <h3>No Artists Available</h3>
                <p>There are no approved artists to display right now.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {artists.map((artist) => (
                  <div key={artist.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      {artist.selfie_image ? (
                        <img src={`http://localhost:3000/${artist.selfie_image.replace(/\\/g, '/')}`} alt={artist.user?.name} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--background-alt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User style={{ width: "24px" }} />
                        </div>
                      )}
                      <div>
                        <h3 style={{ margin: 0 }}>{artist.user?.name || "Unknown"}</h3>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{artist.city}, {artist.state}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                      <p style={{ margin: "0 0 0.5rem 0" }}><strong>Experience:</strong> {artist.experience_years} years</p>
                      <p style={{ margin: "0" }}><strong>Rating:</strong> {artist.average_rating ? `${artist.average_rating}/5` : "No ratings yet"}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate(`/?artistId=${artist.id}`)} style={{ marginTop: "auto" }}>
                      View Details & Book
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Profile Information</h1>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "500px" }}>
              <form onSubmit={handleProfileSave}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={profile.email || ""}
                    placeholder="Enter email e.g. name@example.com"
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-control"
                    value={profile.gender || ""}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={profileSaving}>
                  <Save style={{ width: "16px" }} /> {profileSaving ? "Saving..." : "Save Preferences"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;
