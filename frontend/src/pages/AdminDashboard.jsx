import React, { useState, useEffect } from "react";
import { adminService } from "../services/api";
import { Check, X, ShieldAlert, Users, Award, ShieldCheck, Eye, Calendar, DollarSign, MessageSquare, Bell, Send, Tag, Gift, TrendingUp, Plus, Trash } from "lucide-react";

const AdminDashboard = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [pendingArtists, setPendingArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Coupons Manager States
  const [coupons, setCoupons] = useState([]);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponFormData, setCouponFormData] = useState({
    code: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    max_discount: "",
    min_booking_value: "",
    expires_at: "",
    is_active: true,
    first_booking_only: false
  });

  // Referral Campaigns States
  const [campaigns, setCampaigns] = useState([]);
  const [referralAnalytics, setReferralAnalytics] = useState({
    totalSignups: 0,
    completedInvites: 0,
    payoutAmount: 0,
    conversionRate: 0
  });
  const [campaignFormData, setCampaignFormData] = useState({
    title: "",
    referrer_reward: "",
    referred_reward: "",
    is_active: true
  });

  // Business Intelligence Analytics States
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [analyticsRevenue, setAnalyticsRevenue] = useState(null);
  const [analyticsBookings, setAnalyticsBookings] = useState(null);
  const [analyticsCustomers, setAnalyticsCustomers] = useState(null);
  const [analyticsArtists, setAnalyticsArtists] = useState(null);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    startDate: "",
    endDate: "",
    city: "",
    artistId: ""
  });
  
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
  }, [activeTab, analyticsFilters.startDate, analyticsFilters.endDate, analyticsFilters.city, analyticsFilters.artistId]);

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
        if (pendingArtists.length > 0) return;
        const pendingRes = await adminService.getPendingArtists();
        setPendingArtists(pendingRes.data || []);
      } else if (activeTab === "users") {
        if (users.length > 0) return;
        const usersRes = await adminService.getUsers();
        setUsers(usersRes.data?.rows || usersRes.data || []);
      } else if (activeTab === "artists") {
        if (artists.length > 0) return;
        const artistsRes = await adminService.getArtists();
        setArtists(artistsRes.data || []);
      } else if (activeTab === "bookings") {
        if (bookings.length > 0) return;
        const bookingsRes = await adminService.getBookings();
        setBookings(bookingsRes.data || []);
      } else if (activeTab === "ledger") {
        if (payments.length > 0) return;
        const paymentsRes = await adminService.getPayments();
        setPayments(paymentsRes.data || []);
      } else if (activeTab === "chats") {
        if (chats.length > 0) return;
        const chatsRes = await adminService.getChats();
        setChats(chatsRes.data || []);
      } else if (activeTab === "notifications") {
        if (notifications.length > 0) return;
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
      } else if (activeTab === "coupons") {
        const couponsRes = await adminService.getCoupons();
        setCoupons(couponsRes.data || []);
      } else if (activeTab === "referrals") {
        const [campRes, analyRes] = await Promise.all([
          adminService.getReferralCampaigns(),
          adminService.getReferralAnalytics()
        ]);
        setCampaigns(campRes.data || []);
        setReferralAnalytics(analyRes.data || { totalSignups: 0, completedInvites: 0, payoutAmount: 0, conversionRate: 0 });
      } else if (activeTab === "analytics") {
        const params = {
          startDate: analyticsFilters.startDate || undefined,
          endDate: analyticsFilters.endDate || undefined,
          city: analyticsFilters.city || undefined,
          artistId: analyticsFilters.artistId || undefined
        };
        const [dash, rev, bks, cust, art] = await Promise.all([
          adminService.getAnalyticsDashboard(params),
          adminService.getAnalyticsRevenue(params),
          adminService.getAnalyticsBookings(params),
          adminService.getAnalyticsCustomers(params),
          adminService.getAnalyticsArtists(params)
        ]);
        setAnalyticsStats(dash.data);
        setAnalyticsRevenue(rev.data);
        setAnalyticsBookings(bks.data);
        setAnalyticsCustomers(cust.data);
        setAnalyticsArtists(art.data);
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

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...couponFormData,
        discount_value: parseInt(couponFormData.discount_value) || 0,
        discount_percentage: couponFormData.discount_type === "PERCENTAGE" ? (parseInt(couponFormData.discount_value) || 0) : 0,
        max_discount: parseInt(couponFormData.max_discount) || 0,
        min_booking_value: parseInt(couponFormData.min_booking_value) || 0,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        showToast("Coupon updated successfully", "success");
      } else {
        await adminService.createCoupon(payload);
        showToast("Coupon created successfully", "success");
      }

      setEditingCoupon(null);
      setShowCouponForm(false);
      setCouponFormData({
        code: "",
        discount_type: "PERCENTAGE",
        discount_value: "",
        max_discount: "",
        min_booking_value: "",
        expires_at: "",
        is_active: true,
        first_booking_only: false
      });
      
      const couponsRes = await adminService.getCoupons();
      setCoupons(couponsRes.data || []);
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await adminService.deleteCoupon(id);
      showToast("Coupon deleted successfully", "success");
      setCoupons(coupons.filter(c => c.id !== id));
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createReferralCampaign(campaignFormData);
      showToast("Referral campaign created and activated!", "success");
      setCampaignFormData({
        title: "",
        referrer_reward: "",
        referred_reward: "",
        is_active: true
      });
      const campRes = await adminService.getReferralCampaigns();
      setCampaigns(campRes.data || []);
      const analyRes = await adminService.getReferralAnalytics();
      setReferralAnalytics(analyRes.data || { totalSignups: 0, completedInvites: 0, payoutAmount: 0, conversionRate: 0 });
    } catch (err) {
      showToast(err.message, "danger");
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

        <button
          className={`sidebar-link btn-secondary ${activeTab === "coupons" ? "active" : ""}`}
          onClick={() => setActiveTab("coupons")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Tag style={{ width: "18px" }} /> Coupons Manager
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "referrals" ? "active" : ""}`}
          onClick={() => setActiveTab("referrals")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Gift style={{ width: "18px" }} /> Referral Campaigns
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <TrendingUp style={{ width: "18px" }} /> BI Reports & Analytics
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

            {/* Tab 8: Coupons Manager */}
            {activeTab === "coupons" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Promotional Coupons</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Configure flat/percentage codes and restrict booking applications.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => {
                    setEditingCoupon(null);
                    setShowCouponForm(!showCouponForm);
                    setCouponFormData({
                      code: "",
                      discount_type: "PERCENTAGE",
                      discount_value: "",
                      max_discount: "",
                      min_booking_value: "",
                      expires_at: "",
                      is_active: true,
                      first_booking_only: false
                    });
                  }}>
                    <Plus style={{ width: "16px", marginRight: "4px" }} /> {showCouponForm ? "Hide Form" : "Create Coupon"}
                  </button>
                </div>

                {showCouponForm && (
                  <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>{editingCoupon ? "Edit Coupon Details" : "Create Promo Code"}</h3>
                    <form onSubmit={handleCouponSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <div className="form-group">
                        <label className="form-label">Coupon Code</label>
                        <input className="form-control" type="text" placeholder="e.g. WELCOME500" value={couponFormData.code} onChange={(e) => setCouponFormData({...couponFormData, code: e.target.value.toUpperCase()})} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Type</label>
                        <select className="form-control" value={couponFormData.discount_type} onChange={(e) => setCouponFormData({...couponFormData, discount_type: e.target.value})}>
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FLAT">Flat Rate (₹)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Value ({couponFormData.discount_type === "PERCENTAGE" ? "%" : "₹"})</label>
                        <input className="form-control" type="number" placeholder="Value" value={couponFormData.discount_value} onChange={(e) => setCouponFormData({...couponFormData, discount_value: e.target.value})} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Maximum Discount Cap (₹)</label>
                        <input className="form-control" type="number" placeholder="Cap Limit" value={couponFormData.max_discount} onChange={(e) => setCouponFormData({...couponFormData, max_discount: e.target.value})} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Minimum Booking Value Required (₹)</label>
                        <input className="form-control" type="number" placeholder="Minimum Value" value={couponFormData.min_booking_value} onChange={(e) => setCouponFormData({...couponFormData, min_booking_value: e.target.value})} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input className="form-control" type="date" value={couponFormData.expires_at ? couponFormData.expires_at.split("T")[0] : ""} onChange={(e) => setCouponFormData({...couponFormData, expires_at: e.target.value})} required />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2", display: "flex", gap: "2rem", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input type="checkbox" checked={couponFormData.first_booking_only} onChange={(e) => setCouponFormData({...couponFormData, first_booking_only: e.target.checked})} />
                          First Booking Only
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input type="checkbox" checked={couponFormData.is_active} onChange={(e) => setCouponFormData({...couponFormData, is_active: e.target.checked})} />
                          Active
                        </label>
                      </div>

                      <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem" }}>
                        <button type="submit" className="btn btn-primary">{editingCoupon ? "Save Changes" : "Save Coupon"}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCouponForm(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="glass-panel" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Offer Type</th>
                        <th>Value</th>
                        <th>Min Order</th>
                        <th>Used Count</th>
                        <th>Validity Limit</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                            No coupon codes configured yet.
                          </td>
                        </tr>
                      ) : (
                        coupons.map((coupon) => (
                          <tr key={coupon.id}>
                            <td style={{ fontWeight: 800 }}>{coupon.code}</td>
                            <td>{coupon.discount_type}</td>
                            <td>{coupon.discount_type === "PERCENTAGE" ? `${coupon.discount_percentage || coupon.discount_value}%` : `₹${coupon.discount_value}`}</td>
                            <td>₹{coupon.min_booking_value}</td>
                            <td>{coupon.used_count || 0}</td>
                            <td>{new Date(coupon.expires_at).toLocaleDateString()}</td>
                            <td>
                              <span className={`badge ${coupon.is_active && new Date(coupon.expires_at) > new Date() ? "badge-success" : "badge-danger"}`}>
                                {coupon.is_active && new Date(coupon.expires_at) > new Date() ? "Active" : "Expired / Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => {
                                  setEditingCoupon(coupon);
                                  setCouponFormData({
                                    code: coupon.code,
                                    discount_type: coupon.discount_type,
                                    discount_value: coupon.discount_value || coupon.discount_percentage,
                                    max_discount: coupon.max_discount,
                                    min_booking_value: coupon.min_booking_value,
                                    expires_at: coupon.expires_at,
                                    is_active: coupon.is_active,
                                    first_booking_only: coupon.first_booking_only
                                  });
                                  setShowCouponForm(true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}>Edit</button>
                                <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => handleDeleteCoupon(coupon.id)}>
                                  <Trash style={{ width: "14px" }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 9: Referrals Dashboard */}
            {activeTab === "referrals" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Referral Program Settings</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Configure growth campaigns and review referral conversion logs.</p>

                {/* Growth Analytics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Total Referrals</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--primary-color)" }}>{referralAnalytics.totalSignups}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Successful Invites</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--success-color)" }}>{referralAnalytics.completedInvites}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Reward Money Payout</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--accent-color)" }}>₹{referralAnalytics.payoutAmount}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Conversion Rate</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "#e67e22" }}>{referralAnalytics.conversionRate}%</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
                  {/* Campaign configuration form */}
                  <div className="glass-panel" style={{ padding: "1.5rem", height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Referral Campaign Config</h3>
                    <form onSubmit={handleCampaignSubmit}>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Campaign Title</label>
                        <input className="form-control" type="text" placeholder="e.g. Monsoon Refer Fest" value={campaignFormData.title} onChange={(e) => setCampaignFormData({...campaignFormData, title: e.target.value})} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Referrer Reward Cashback (₹)</label>
                        <input className="form-control" type="number" placeholder="Referrer gets" value={campaignFormData.referrer_reward} onChange={(e) => setCampaignFormData({...campaignFormData, referrer_reward: e.target.value})} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Referred Welcome Friend Cashback (₹)</label>
                        <input className="form-control" type="number" placeholder="Friend gets" value={campaignFormData.referred_reward} onChange={(e) => setCampaignFormData({...campaignFormData, referred_reward: e.target.value})} required />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginTop: "1rem" }}>
                        <input type="checkbox" checked={campaignFormData.is_active} onChange={(e) => setCampaignFormData({...campaignFormData, is_active: e.target.checked})} />
                        Activate immediately
                      </label>
                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1.5rem" }}>
                        Launch Growth Campaign
                      </button>
                    </form>
                  </div>

                  {/* Campaigns List history */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Referral Campaigns History</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Campaign Title</th>
                          <th>Referrer Reward</th>
                          <th>Friend Reward</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)" }}>
                              No campaigns logged yet.
                            </td>
                          </tr>
                        ) : (
                          campaigns.map((camp) => (
                            <tr key={camp.id}>
                              <td style={{ fontWeight: 600 }}>{camp.title}</td>
                              <td>₹{camp.referrer_reward}</td>
                              <td>₹{camp.referred_reward}</td>
                              <td>
                                <span className={`badge ${camp.is_active ? "badge-success" : "badge-secondary"}`}>
                                  {camp.is_active ? "Active" : "Archived"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 10: BI Business Intelligence Analytics */}
            {activeTab === "analytics" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>BI Reports & Business Analytics</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Audit real-time bookings trends, revenues category graphs, and customer retention metrics.</p>
                  </div>

                  {/* Exports panels */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => {
                      const params = {
                        reportType: "revenue",
                        startDate: analyticsFilters.startDate || undefined,
                        endDate: analyticsFilters.endDate || undefined,
                        city: analyticsFilters.city || undefined
                      };
                      window.open(`http://localhost:3000/analytics/export?reportType=revenue&startDate=${params.startDate || ""}&endDate=${params.endDate || ""}&city=${params.city || ""}`, "_blank");
                    }}>
                      Export Revenue CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      const params = {
                        reportType: "bookings",
                        startDate: analyticsFilters.startDate || undefined,
                        endDate: analyticsFilters.endDate || undefined,
                        city: analyticsFilters.city || undefined
                      };
                      window.open(`http://localhost:3000/analytics/export?reportType=bookings&startDate=${params.startDate || ""}&endDate=${params.endDate || ""}&city=${params.city || ""}`, "_blank");
                    }}>
                      Export Bookings CSV
                    </button>
                  </div>
                </div>

                {/* Filters Panel bar */}
                <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">Start Date</label>
                    <input className="form-control" type="date" value={analyticsFilters.startDate} onChange={(e) => setAnalyticsFilters({...analyticsFilters, startDate: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">End Date</label>
                    <input className="form-control" type="date" value={analyticsFilters.endDate} onChange={(e) => setAnalyticsFilters({...analyticsFilters, endDate: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">Filter by City</label>
                    <input className="form-control" type="text" placeholder="e.g. Panaji" value={analyticsFilters.city} onChange={(e) => setAnalyticsFilters({...analyticsFilters, city: e.target.value})} />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setAnalyticsFilters({...analyticsFilters, startDate: today, endDate: today});
                    }}>Today</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const end = new Date().toISOString().split("T")[0];
                      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                      setAnalyticsFilters({...analyticsFilters, startDate: start, endDate: end});
                    }}>Last 7 Days</button>
                    <button className="btn btn-secondary" onClick={() => {
                      setAnalyticsFilters({ startDate: "", endDate: "", city: "", artistId: "" });
                    }}>Reset</button>
                  </div>
                </div>

                {analyticsStats?.kpis && (
                  <div>
                    {/* CEO KPI Summary cards grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid var(--primary-color)" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Platform Profit (20%)</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>₹{analyticsStats.kpis.profit}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #00b894" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Completed Bookings</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsStats.kpis.completedBookings}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #ff7675" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Cancelled Bookings</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsStats.kpis.cancelledBookings}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #e67e22" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Avg Booking Value</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>₹{analyticsBookings?.avgBookingValue || 0}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #9b59b6" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Repeat Booking Rate</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsCustomers?.repeatBookingRate || 0}%</div>
                      </div>
                    </div>

                    {/* SVG Analytics Charts Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                      
                      {/* 1. Revenue Area/Line SVG Chart */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Revenue Growth Trend (7 Days)</h3>
                        <svg viewBox="0 0 500 200" style={{ width: "100%", height: "200px" }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4"/>
                              <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="70" x2="480" y2="70" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="120" x2="480" y2="120" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="170" x2="480" y2="170" stroke="#a4b0be" strokeWidth="1" />

                          {/* SVG Path calculation */}
                          {(() => {
                            const data = analyticsStats.chartsData || [];
                            if (data.length === 0) return null;
                            const maxVal = Math.max(...data.map(d => d.revenue), 1000);
                            const coords = data.map((d, index) => {
                              const x = 50 + index * 70;
                              const y = 170 - (d.revenue / maxVal) * 140;
                              return { x, y };
                            });

                            const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                            const areaPath = `${linePath} L ${coords[coords.length - 1].x} 170 L ${coords[0].x} 170 Z`;

                            return (
                              <>
                                <path d={areaPath} fill="url(#areaGrad)" />
                                <path d={linePath} fill="none" stroke="var(--primary-color)" strokeWidth="3" />
                                {coords.map((c, i) => (
                                  <g key={i}>
                                    <circle cx={c.x} cy={c.y} r="5" fill="#fff" stroke="var(--primary-color)" strokeWidth="3" />
                                    <text x={c.x} y="190" textAnchor="middle" style={{ fontSize: "10px", fill: "var(--text-secondary)" }}>{data[i].date}</text>
                                    <text x={c.x} y={c.y - 10} textAnchor="middle" style={{ fontSize: "9px", fontWeight: "bold", fill: "var(--text-secondary)" }}>₹{data[i].revenue}</text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      {/* 2. Donut Category Share Chart */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Revenue Share by Specialty Category</h3>
                        {analyticsRevenue?.byCategory && (
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <svg viewBox="0 0 200 200" style={{ width: "150px", height: "150px" }}>
                              {/* Simple donut shape fallback visualization */}
                              <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f2f6" strokeWidth="20" />
                              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--primary-color)" strokeWidth="20" strokeDasharray="300 400" />
                              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--accent-color)" strokeWidth="20" strokeDasharray="100 400" strokeDashoffset="-300" />
                            </svg>
                            <div style={{ flexGrow: 1, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {Object.entries(analyticsRevenue.byCategory).slice(0, 4).map(([cat, val], i) => (
                                <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: 600 }}>{cat}</span>
                                  <span style={{ color: "var(--text-secondary)" }}>₹{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hourly Heatmap & Top Spenders */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }}>
                      
                      {/* Peak Booking Hours Grid Heatmap */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Peak Booking Hours (Heatmap Distribution)</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "0.5rem" }}>
                          {analyticsBookings?.hourlyDistribution?.map((val, hour) => {
                            const maxVal = Math.max(...analyticsBookings.hourlyDistribution, 1);
                            const opacity = Math.max(0.1, val / maxVal);
                            const bg = `rgba(253, 121, 168, ${opacity})`;

                            return (
                              <div
                                key={hour}
                                style={{
                                  background: bg,
                                  color: opacity > 0.6 ? "#fff" : "var(--text-secondary)",
                                  padding: "0.75rem 0.25rem",
                                  borderRadius: "6px",
                                  textAlign: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold"
                                }}
                                title={`${val} bookings at ${hour}:00`}
                              >
                                {hour}h
                                <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "normal" }}>{val}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top Spending Customers */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Top Spending Customers</h3>
                        {analyticsCustomers?.topCustomers?.map((item, index) => (
                          <div key={index} style={{ display: "flex", justifyContent: "space-between", paddingVertical: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{item.user?.name || "Premium User"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.user?.email || "N/A"}</div>
                            </div>
                            <div style={{ fontWeight: 800, color: "var(--primary-color)" }}>₹{item.total_spend}</div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                )}
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
