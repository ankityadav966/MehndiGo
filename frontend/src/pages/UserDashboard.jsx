import React, { useState, useEffect } from "react";
import { artistService, authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { Calendar, Clock, CreditCard, MessageSquare, Plus, Save, Settings, User, FileText, Activity, BarChart2, Search, MapPin, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const UserDashboard = ({ showToast }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [profile, setProfile] = useState({ name: "", email: "", gender: "" });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // Changed default to overview

  // Explore Artists State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [page, setPage] = useState(1);
  const [totalArtists, setTotalArtists] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchUserData();

    // Socket.io for Real-time Notifications
    if (user?.id) {
      const socket = io("http://localhost:3000");
      socket.emit("join", user.id);

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

  useEffect(() => {
    if (activeTab === "explore") {
      fetchArtists();
    }
  }, [searchTerm, sortBy, page, activeTab]);

  const fetchArtists = async () => {
    try {
      const res = await artistService.getArtists({ search: searchTerm, sort: sortBy, page, limit });
      setArtists(res.data?.rows || []);
      setTotalArtists(res.data?.count || 0);
    } catch(e) {
      console.error(e);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const bookingsRes = await artistService.getBookings();
      setBookings(bookingsRes.data || []);
      
      const artistsRes = await artistService.getArtists({ page: 1, limit });
      setArtists(artistsRes.data?.rows || []);
      setTotalArtists(artistsRes.data?.count || 0);

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

  // Inline script loader for Razorpay
  const handlePayment = async (booking) => {
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!scriptLoaded) {
        showToast("Failed to load Razorpay SDK. Check network.", "danger");
        return;
      }

      // 2. Create Order
      const orderRes = await artistService.createOrder(booking.id);
      const order = orderRes.data;

      // 3. Configure Checkout Options
      const options = {
        key: "rzp_test_Sz3Oa0GdrWOAhW", // Testing Key ID from .env
        amount: order.amount,
        currency: "INR",
        name: "Mehndi Go",
        description: `Booking ref: ${booking.booking_code}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            await artistService.verifyPayment({
              booking_id: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            showToast("Payment verified successfully!", "success");
            fetchUserData(); // reload
          } catch (err) {
            showToast("Payment verification failed: " + err.message, "danger");
          }
        },
        prefill: {
          name: profile.name,
          email: profile.email,
        },
        theme: {
          color: "#d97d64",
        },
      };

      const paymentWindow = new window.Razorpay(options);
      paymentWindow.open();
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
          className={`sidebar-link btn-secondary ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <BarChart2 style={{ width: "18px" }} /> Dashboard Overview
        </button>
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
        ) : activeTab === "overview" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Welcome, {profile.name}!</h1>
                <p style={{ color: "var(--text-secondary)" }}>Here's an overview of your bookings and activities.</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate("/")}>
                <Plus style={{ width: "16px" }} /> Book New Artist
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Bookings</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>{bookings.length}</div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Spent</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)" }}>
                  ₹{bookings.filter(b => b.payment_status === "PAID").reduce((sum, b) => sum + b.total_price, 0)}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
              {/* Activity Timeline */}
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Activity style={{ width: "20px" }} /> Recent Updates
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {bookings.slice(0, 3).map((booking, idx, arr) => (
                    <div key={booking.id} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                      {idx !== arr.length - 1 && <div style={{ position: "absolute", left: "15px", top: "30px", bottom: "-15px", width: "2px", background: "var(--border-color)", zIndex: 0 }}></div>}
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: booking.booking_status === "CONFIRMED" ? "rgba(0, 184, 148, 0.2)" : "rgba(108, 92, 231, 0.2)", color: booking.booking_status === "CONFIRMED" ? "#00b894" : "#6c5ce7", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <Calendar style={{ width: "16px" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Booking {booking.booking_status.toLowerCase()}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          Your booking with {booking.artist?.user?.name || "Artist"} is {booking.booking_status.toLowerCase()}.
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <Clock style={{ width: "12px" }} /> {new Date(booking.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No recent activity.</p>}
                </div>
              </div>

              {/* Spending Chart */}
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1.5rem" }}>Spending Overview</h3>
                {bookings.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "150px", color: "var(--text-secondary)" }}>
                    No spending data available.
                  </div>
                ) : (
                  <div style={{ height: "200px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookings.map(b => ({
                        name: new Date(b.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
                        amount: b.total_price
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" />
                        <YAxis stroke="var(--text-secondary)" />
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="amount" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
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
                  const start = new Date(booking.slot?.start_time);
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
                            <Calendar style={{ width: "14px" }} /> {start.toLocaleDateString()}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Clock style={{ width: "14px" }} /> {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            
            <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
                <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "18px", color: "var(--text-secondary)" }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search by specialty, bio, or location..." 
                  style={{ paddingLeft: "2.8rem" }}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
              
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Sort by:</span>
                <select className="form-control" style={{ width: "auto" }} value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
                  <option value="rating">Top Rated</option>
                  <option value="latest">Newest First</option>
                </select>
              </div>
            </div>

            {artists.length === 0 ? (
              <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <h3>No Artists Found</h3>
                <p>Try adjusting your search filters.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                  {artists.map((artist) => (
                    <div key={artist.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        {artist.user?.profile_image ? (
                          <img src={`http://localhost:8000/${artist.user.profile_image.replace(/\\/g, '/')}`} alt={artist.user?.name} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User style={{ width: "24px" }} />
                          </div>
                        )}
                        <div>
                          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {artist.user?.name || "Unknown"}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                            <MapPin style={{ width: "12px" }} /> {artist.city || "Online"}, {artist.state}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <div style={{ background: "var(--bg-secondary)", padding: "0.5rem", borderRadius: "6px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Experience</div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{artist.experience_years} years</div>
                        </div>
                        <div style={{ background: "var(--bg-secondary)", padding: "0.5rem", borderRadius: "6px", textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rating</div>
                          <div style={{ fontWeight: 600, color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}>
                            <Star style={{ width: "14px", fill: "currentColor" }} /> {artist.avg_rating ? parseFloat(artist.avg_rating).toFixed(1) : "New"}
                          </div>
                        </div>
                      </div>
                      
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: "2.5rem" }}>
                        {artist.bio}
                      </p>

                      <button className="btn btn-primary" onClick={() => navigate(`/?artistId=${artist.id}`)} style={{ marginTop: "auto", width: "100%", justifyContent: "center" }}>
                        View Profile & Book
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalArtists > limit && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "2rem" }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ padding: "0.5rem" }}
                    >
                      <ChevronLeft style={{ width: "20px" }} />
                    </button>
                    <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                      Page {page} of {Math.ceil(totalArtists / limit)}
                    </span>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setPage(p => Math.min(Math.ceil(totalArtists / limit), p + 1))}
                      disabled={page === Math.ceil(totalArtists / limit)}
                      style={{ padding: "0.5rem" }}
                    >
                      <ChevronRight style={{ width: "20px" }} />
                    </button>
                  </div>
                )}
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
