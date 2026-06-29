import React, { useState, useEffect } from "react";
import { adminService } from "../services/api";
import { Check, X, ShieldAlert, Users, Award, ShieldCheck, Eye, Calendar, DollarSign, MessageSquare, Bell, Send, Activity, Clock, BarChart2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

const AdminDashboard = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [pendingArtists, setPendingArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // Changed default to overview
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtists: 0,
    totalBookings: 0,
    pendingArtistsCount: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    remainingAmount: 0
  });

  // Broadcast system notifications state
  const [targetUserId, setTargetUserId] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifSending, setNotifSending] = useState(false);

  // Document viewer modal states
  const [viewDoc, setViewDoc] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await adminService.getStats();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      // Fetch tab-specific data
      if (activeTab === "pending") {
        const pendingRes = await adminService.getPendingArtists();
        setPendingArtists(pendingRes.data || []);
      } else if (activeTab === "users") {
        const usersRes = await adminService.getUsers();
        setUsers(usersRes.data?.rows || usersRes.data || []);
      } else if (activeTab === "artists") {
        const artistsRes = await adminService.getArtists();
        setArtists(artistsRes.data || []);
      } else if (activeTab === "bookings") {
        const bookingsRes = await adminService.getBookings();
        setBookings(bookingsRes.data || []);
      } else if (activeTab === "ledger") {
        const paymentsRes = await adminService.getPayments();
        setPayments(paymentsRes.data || []);
      } else if (activeTab === "chats") {
        const chatsRes = await adminService.getChats();
        setChats(chatsRes.data || []);
      } else if (activeTab === "notifications") {
        const notifsRes = await adminService.getNotifications();
        setNotifications(notifsRes.data || []);
        
        // Also fetch all users so admin can select target user
        const usersListRes = await adminService.getUsers();
        const artistListRes = await adminService.getArtists();
        
        const combined = [
          ...(usersListRes.data?.rows || usersListRes.data || []),
          ...(artistListRes.data || []).map(a => a.user).filter(Boolean)
        ];
        
        // Deduplicate
        const unique = [];
        const seen = new Set();
        combined.forEach(u => {
          if (u?.id && !seen.has(u.id)) {
            seen.add(u.id);
            unique.push(u);
          }
        });
        setUsers(unique);
      }
    } catch (e) {
      showToast("Error loading admin data: " + e.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminService.approveArtist(id);
      showToast("Artist verification approved successfully!", "success");
      setPendingArtists(pendingArtists.filter((a) => a.id !== id));
      fetchAdminData();
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason) {
      showToast("Rejection reason is required", "warning");
      return;
    }
    try {
      await adminService.rejectArtist(rejectId, rejectReason);
      showToast("Artist verification rejected", "success");
      setPendingArtists(pendingArtists.filter((a) => a.id !== rejectId));
      setRejectId(null);
      setRejectReason("");
      fetchAdminData();
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!targetUserId || !notifTitle || !notifMessage) {
      showToast("All fields are required to send notification", "warning");
      return;
    }

    setNotifSending(true);
    try {
      await adminService.sendSystemNotification({
        user_id: targetUserId,
        title: notifTitle,
        message: notifMessage
      });
      showToast("System notification dispatched successfully!", "success");
      setNotifTitle("");
      setNotifMessage("");
      // Refresh list
      const notifsRes = await adminService.getNotifications();
      setNotifications(notifsRes.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setNotifSending(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar" style={{ minWidth: "260px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", color: "var(--text-secondary)" }}>
          Admin Panel
        </h3>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <BarChart2 style={{ width: "18px" }} /> Dashboard Overview
        </button>
        
        <button
          className={`sidebar-link btn-secondary ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <ShieldAlert style={{ width: "18px" }} /> Verification Queue ({stats.pendingArtistsCount})
        </button>
        
        <button
          className={`sidebar-link btn-secondary ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Users style={{ width: "18px" }} /> Customers ({stats.totalUsers})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "artists" ? "active" : ""}`}
          onClick={() => setActiveTab("artists")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Award style={{ width: "18px" }} /> Artists Directory ({stats.totalArtists})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Calendar style={{ width: "18px" }} /> Bookings Ledger ({stats.totalBookings})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => setActiveTab("ledger")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <DollarSign style={{ width: "18px" }} /> Financial Ledger
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <MessageSquare style={{ width: "18px" }} /> Chat Activity Stream
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Bell style={{ width: "18px" }} /> Dispatch Broadcaster
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Stats Cards Grid (Showing critical metrics including revenue) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(108, 92, 231, 0.1)", color: "#6c5ce7", padding: "0.5rem", borderRadius: "8px" }}>
              <Users style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Customers</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalUsers}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(253, 121, 168, 0.1)", color: "#fd79a8", padding: "0.5rem", borderRadius: "8px" }}>
              <Award style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Artists</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalArtists}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(0, 184, 148, 0.1)", color: "#00b894", padding: "0.5rem", borderRadius: "8px" }}>
              <Calendar style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Bookings</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalBookings}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--success-color)" }}>
            <div style={{ background: "rgba(46, 204, 113, 0.1)", color: "var(--success-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Revenue</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--success-color)" }}>₹{stats.totalRevenue}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--warning-color)" }}>
            <div style={{ background: "rgba(241, 196, 15, 0.1)", color: "var(--warning-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Pending</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--warning-color)" }}>₹{stats.pendingAmount}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--accent-color)" }}>
            <div style={{ background: "rgba(217, 125, 100, 0.1)", color: "var(--accent-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Remaining</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-color)" }}>₹{stats.remainingAmount}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div>
            <div className="skeleton" style={{ height: "40px", width: "30%", marginBottom: "2rem" }} />
            <div className="skeleton" style={{ height: "200px", width: "100%" }} />
          </div>
        ) : (
          <>
            {/* Tab 0: Overview & Analytics */}
            {activeTab === "overview" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Platform Analytics Overview</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  Monitor key metrics, revenue trends, and recent platform activity.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                  {/* Revenue Chart */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>Revenue Trend (Mock)</h3>
                    <div style={{ height: "300px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[
                          { name: 'Mon', revenue: 4000 }, { name: 'Tue', revenue: 3000 },
                          { name: 'Wed', revenue: 2000 }, { name: 'Thu', revenue: 2780 },
                          { name: 'Fri', revenue: 1890 }, { name: 'Sat', revenue: 2390 },
                          { name: 'Sun', revenue: 3490 }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" />
                          <YAxis stroke="var(--text-secondary)" />
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="revenue" stroke="var(--success-color)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Users vs Artists Pie Chart */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>User Distribution</h3>
                    <div style={{ height: "300px" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Customers', value: stats.totalUsers || 1 },
                              { name: 'Artists', value: stats.totalArtists || 1 }
                            ]}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" paddingAngle={5} dataKey="value"
                          >
                            <Cell fill="var(--accent-color)" />
                            <Cell fill="#00b894" />
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Activity style={{ width: "20px" }} /> Recent Platform Activity
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Mock Timeline Events */}
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                      <div style={{ position: "absolute", left: "15px", top: "30px", bottom: "-15px", width: "2px", background: "var(--border-color)", zIndex: 0 }}></div>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(108, 92, 231, 0.2)", color: "#6c5ce7", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <Users style={{ width: "16px" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>New User Registration</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>A new customer signed up on the platform.</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock style={{ width: "12px" }} /> 10 mins ago</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                      <div style={{ position: "absolute", left: "15px", top: "30px", bottom: "-15px", width: "2px", background: "var(--border-color)", zIndex: 0 }}></div>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(0, 184, 148, 0.2)", color: "#00b894", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <Calendar style={{ width: "16px" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Booking Completed</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Booking #BKG-8472 was marked as completed.</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock style={{ width: "12px" }} /> 1 hour ago</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(241, 196, 15, 0.2)", color: "var(--warning-color)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                        <ShieldAlert style={{ width: "16px" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Artist Verification Submitted</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Priya Sharma submitted documents for verification.</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "flex", alignItems: "center", gap: "0.2rem" }}><Clock style={{ width: "12px" }} /> 2 hours ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 1: Verification Queue */}
            {activeTab === "pending" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Artist Verification Queue</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  Audit document uploads and verify mehndi artist accounts on Mehndi Go.
                </p>

                {pendingArtists.length === 0 ? (
                  <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    <ShieldCheck style={{ width: "48px", height: "48px", color: "var(--success-color)", margin: "0 auto 1rem" }} />
                    <h3>All Clear!</h3>
                    <p style={{ marginTop: "0.25rem" }}>There are no pending verification requests at this time.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {pendingArtists.map((artist) => (
                      <div key={artist.id} className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                          <div>
                            <h3 style={{ fontWeight: 700 }}>{artist.user?.name}</h3>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Phone: {artist.user?.phone} | Email: {artist.user?.email || "N/A"}
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Experience: {artist.experience_years} Years
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Address: {artist.location}, {artist.city}, {artist.state} ({artist.pincode})
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-start" }}>
                            <button className="btn btn-primary" onClick={() => handleApprove(artist.id)}>
                              <Check style={{ width: "16px" }} /> Approve Verification
                            </button>
                            <button className="btn btn-danger" onClick={() => setRejectId(artist.id)}>
                              <X style={{ width: "16px" }} /> Reject Profile
                            </button>
                          </div>
                        </div>

                        <div style={{ background: "var(--bg-primary)", padding: "1rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Professional Bio:</span>
                          <p style={{ marginTop: "0.25rem", fontSize: "0.95rem" }}>{artist.bio}</p>
                        </div>

                        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Aadhaar Front Copy
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.aadhaar_front)}>
                              <Eye style={{ width: "16px" }} /> View Aadhaar Front
                            </button>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Aadhaar Back Copy
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.aadhaar_back)}>
                              <Eye style={{ width: "16px" }} /> View Aadhaar Back
                            </button>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Selfie Verification
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.selfie_image)}>
                              <Eye style={{ width: "16px" }} /> View Selfie Image
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Customer Directory */}
            {activeTab === "users" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Customer Directory</h1>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>User ID</th>
                        <th style={{ padding: "1rem" }}>Name</th>
                        <th style={{ padding: "1rem" }}>Phone Number</th>
                        <th style={{ padding: "1rem" }}>Email</th>
                        <th style={{ padding: "1rem" }}>Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem" }}>#{u.id}</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{u.name}</td>
                          <td style={{ padding: "1rem" }}>{u.phone}</td>
                          <td style={{ padding: "1rem" }}>{u.email || "N/A"}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge ${u.is_verified ? "badge-success" : "badge-secondary"}`}>
                              {u.is_verified ? "Yes" : "No"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Artist Directory */}
            {activeTab === "artists" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Artist Directory</h1>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Profile ID</th>
                        <th style={{ padding: "1rem" }}>Name</th>
                        <th style={{ padding: "1rem" }}>Experience</th>
                        <th style={{ padding: "1rem" }}>Location</th>
                        <th style={{ padding: "1rem" }}>Rating</th>
                        <th style={{ padding: "1rem" }}>Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {artists.map((a) => (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem" }}>#{a.id}</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{a.user?.name || "N/A"}</td>
                          <td style={{ padding: "1rem" }}>{a.experience_years} Years</td>
                          <td style={{ padding: "1rem" }}>{a.city}, {a.state}</td>
                          <td style={{ padding: "1rem", fontWeight: 700, color: "var(--accent-color)" }}>★ {a.avg_rating || "New"}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge badge-${a.verification_status.toLowerCase()}`}>
                              {a.verification_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Bookings Tracker */}
            {activeTab === "bookings" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Bookings Tracker</h1>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Booking Code</th>
                        <th style={{ padding: "1rem" }}>Customer</th>
                        <th style={{ padding: "1rem" }}>Artist</th>
                        <th style={{ padding: "1rem" }}>Price</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{b.booking_code}</td>
                          <td style={{ padding: "1rem" }}>{b.user?.name}</td>
                          <td style={{ padding: "1rem" }}>{b.artist?.user?.name || `Artist #${b.artist_id}`}</td>
                          <td style={{ padding: "1rem", color: "var(--accent-color)", fontWeight: 700 }}>₹{b.total_price}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge badge-${b.booking_status.toLowerCase()}`}>
                              {b.booking_status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge badge-${b.payment_status.toLowerCase()}`}>
                              {b.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 5: Financial Ledger (Revenue, Transactions, Remaining) */}
            {activeTab === "ledger" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Financial Ledger & Transactions</h1>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Revenue</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)" }}>₹{stats.totalRevenue || 0}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Pending Amount</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--warning-color)" }}>₹{stats.pendingAmount || 0}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Remaining Amount</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--info-color)" }}>₹{stats.remainingAmount || 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Transaction ID</th>
                        <th style={{ padding: "1rem" }}>Booking Code</th>
                        <th style={{ padding: "1rem" }}>Client</th>
                        <th style={{ padding: "1rem" }}>Artist</th>
                        <th style={{ padding: "1rem" }}>Paid Amount</th>
                        <th style={{ padding: "1rem" }}>Method</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{p.razorpay_payment_id || p.transaction_id || `TXN-${p.id}`}</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{p.booking?.booking_code}</td>
                          <td style={{ padding: "1rem" }}>{p.booking?.user?.name || "Client"}</td>
                          <td style={{ padding: "1rem" }}>{p.booking?.artist?.user?.name || "Artist"}</td>
                          <td style={{ padding: "1rem", color: "var(--success-color)", fontWeight: 700 }}>₹{p.amount}</td>
                          <td style={{ padding: "1rem" }}>{p.payment_method}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge ${p.status === "SUCCESS" ? "badge-success" : p.status === "FAILED" ? "badge-danger" : "badge-secondary"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem" }}>{p.paid_at ? new Date(p.paid_at).toLocaleString() : new Date(p.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 6: Chat Activity Monitor */}
            {activeTab === "chats" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>In-App Chat Monitoring</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Monitor platform messaging history and dialogue logs for security audits.
                </p>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Sender</th>
                        <th style={{ padding: "1rem" }}>Receiver</th>
                        <th style={{ padding: "1rem" }}>Message Content</th>
                        <th style={{ padding: "1rem" }}>Seen Status</th>
                        <th style={{ padding: "1rem" }}>Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chats.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{c.sender?.name} ({c.sender?.role})</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{c.receiver?.name} ({c.receiver?.role})</td>
                          <td style={{ padding: "1rem", fontStyle: "italic" }}>"{c.message}"</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge ${c.is_read ? "badge-success" : "badge-secondary"}`}>
                              {c.is_read ? "Read" : "Sent"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem" }}>{new Date(c.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 7: Dispatch Broadcaster */}
            {activeTab === "notifications" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>System Alerts Broadcaster</h1>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
                  {/* Send Alert form */}
                  <div className="glass-panel" style={{ padding: "2rem", height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Dispatch Notification</h3>
                    <form onSubmit={handleSendNotification}>
                      <div className="form-group">
                        <label className="form-label">Recipient User</label>
                        <select className="form-control" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} required>
                          <option value="">Select Target User</option>
                          <option value="ALL">All Users & Artists</option>
                          <option value="ALL_USERS">All Users</option>
                          <option value="ALL_ARTISTS">All Artists</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alert Title</label>
                        <input type="text" className="form-control" placeholder="e.g. Schedule Update" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Notification Message</label>
                        <textarea className="form-control" rows="4" placeholder="Type notification details here..." value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} required />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={notifSending}>
                        <Send style={{ width: "16px" }} /> {notifSending ? "Dispatching..." : "Broadcast Alert"}
                      </button>
                    </form>
                  </div>

                  {/* Sent Alerts log */}
                  <div>
                    <h3 style={{ marginBottom: "1.2rem" }}>Broadcast Notification Log</h3>
                    {notifications.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)" }}>No notifications sent yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {notifications.map(n => (
                          <div key={n.id} className="glass-panel" style={{ padding: "1.2rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color: "var(--accent-color)" }}>{n.title}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>To: {n.user?.name} ({n.user?.role})</span>
                            </div>
                            <p style={{ fontSize: "0.9rem", marginTop: "0.4rem", color: "var(--text-secondary)" }}>{n.message}</p>
                            <div style={{ fontSize: "0.75rem", textAlign: "right", marginTop: "0.4rem", color: "var(--text-secondary)" }}>
                              {new Date(n.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Document Viewer Modal */}
        {viewDoc && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
              <button
                onClick={() => setViewDoc(null)}
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
                src={viewDoc}
                alt="Audit document upload"
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", objectFit: "contain", background: "var(--bg-secondary)" }}
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400"; // fallback
                  showToast("Image not available, showing fallback placeholder", "warning");
                }}
              />
            </div>
          </div>
        )}

        {/* Reject Dialog Prompt */}
        {rejectId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 1500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2rem", background: "var(--bg-secondary)" }}>
              <h3 style={{ marginBottom: "1rem" }}>Reason for Rejection</h3>
              <form onSubmit={handleRejectSubmit}>
                <div className="form-group">
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter document mismatch details or reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="submit" className="btn btn-danger" style={{ flexGrow: 1, justifyContent: "center" }}>
                    Submit Rejection
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setRejectId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
