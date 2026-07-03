
import React, { useState, useEffect } from "react";
import { artistService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { Plus, Trash2, Calendar, Check, X, FileText, Bell, BarChart2, DollarSign, Award, Clock, Image, Settings } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const ArtistDashboard = ({ showToast }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Portfolio states
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [portfolioCaption, setPortfolioCaption] = useState("");
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Edit profile settings states
  const [editBio, setEditBio] = useState("");
  const [editExperience, setEditExperience] = useState(1);
  const [editLocation, setEditLocation] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Registration/Setup profile state
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState(1);
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [aadhaarFront, setAadhaarFront] = useState(null);
  const [aadhaarBack, setAadhaarBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [dob, setDob] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  // Service state
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Bridal");
  const [servicePrice, setServicePrice] = useState(1000);
  const [serviceDuration, setServiceDuration] = useState(60);
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceLoading, setServiceLoading] = useState(false);

  // Add Slot state
  const [slotDate, setSlotDate] = useState("");
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Socket.io for Real-time Notifications
    if (user?.id) {
      const socket = io("http://localhost:3000");
      socket.emit("join", user.id);

      socket.on("new_notification", (data) => {
        showToast(data.title + ": " + data.message, "info");
        // Prepend to notifications list
        setNotifications(prev => [{
          id: Date.now(), // temporary id
          title: data.title,
          message: data.message,
          is_read: false,
          createdAt: new Date().toISOString()
        }, ...prev]);
        
        // If the notification is a booking update, refresh data
        if (data.type === "BOOKING" || data.type === "PAYMENT") {
          fetchDashboardData();
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profile
      const profRes = await artistService.getMyDetails();
      setProfile(profRes.data);
      
      if (profRes.data) {
        setEditBio(profRes.data.bio || "");
        setEditExperience(profRes.data.experience_years || 1);
        setEditLocation(profRes.data.location || "");
        setEditCity(profRes.data.city || "");
        setEditState(profRes.data.state || "");
        setEditPincode(profRes.data.pincode || "");
      }
      
      if (profRes.data && profRes.data.verification_status === "APPROVED") {
        // 2. Fetch services, slots, bookings, notifications
        const svcsRes = await artistService.getServices();
        setServices(svcsRes.data || []);
        
        const slotsRes = await artistService.getSlots();
        setSlots(slotsRes.data || []);
        
        const bookingsRes = await artistService.getArtistBookings();
        setBookings(bookingsRes.data || []);
        
        const notifRes = await artistService.getNotifications();
        setNotifications(notifRes.data || []);

        const portRes = await artistService.getPortfolio();
        setPortfolio(portRes.data || []);
      }
    } catch (e) {
      if (e.message.includes("not found")) {
        setProfile(null); // Need setup
      } else {
        showToast("Error loading artist data: " + e.message, "danger");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e) => {
    e.preventDefault();
    if (!aadhaarFront || !aadhaarBack || !selfie) {
      showToast("Please upload all verification documents", "warning");
      return;
    }

    setSetupLoading(true);
    const formData = new FormData();
    formData.append("bio", bio);
    formData.append("experience_years", experience);
    formData.append("location", location);
    formData.append("city", city);
    formData.append("state", state);
    formData.append("pincode", pincode);
    formData.append("home_service", "true");
    formData.append("salon_service", "false");
    formData.append("dob", dob);
    formData.append("aadhaar_number", aadhaarNumber);
    formData.append("aadhaar_front", aadhaarFront);
    formData.append("aadhaar_back", aadhaarBack);
    formData.append("selfie_image", selfie);

    try {
      await artistService.createProfile(formData);
      showToast("Verification profile submitted successfully!", "success");
      fetchDashboardData();
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setServiceLoading(true);
    try {
      const payload = {
        specialization_name: serviceName,
        category: serviceCategory,
        minimum_price: servicePrice,
        duration_minutes: serviceDuration,
        description: serviceDesc,
      };

      if (editingServiceId) {
        await artistService.updateService(editingServiceId, payload);
        showToast("Service updated successfully!", "success");
      } else {
        await artistService.createService(payload);
        showToast("Service added successfully!", "success");
      }

      setServiceName("");
      setServiceDesc("");
      setEditingServiceId(null);
      // reload services
      const svcsRes = await artistService.getServices();
      setServices(svcsRes.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setServiceLoading(false);
    }
  };

  const handleEditService = (svc) => {
    setEditingServiceId(svc.id);
    setServiceName(svc.specialization_name);
    setServiceCategory(svc.category);
    setServicePrice(svc.minimum_price);
    setServiceDuration(svc.duration_minutes);
    setServiceDesc(svc.description || "");
    window.scrollTo(0, 0);
  };

  const cancelEditService = () => {
    setEditingServiceId(null);
    setServiceName("");
    setServiceCategory("Bridal");
    setServicePrice(1000);
    setServiceDuration(60);
    setServiceDesc("");
  };

  const handleDeleteService = async (id) => {
    try {
      await artistService.deleteService(id);
      showToast("Service deleted", "success");
      setServices(services.filter((s) => s.id !== id));
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setSlotLoading(true);
    try {
      await artistService.createSlot({
        date: slotDate,
        start_time: slotStart,
        end_time: slotEnd,
      });
      showToast("Availability slot added!", "success");
      setSlotDate("");
      setSlotStart("");
      setSlotEnd("");
      // reload slots
      const slotsRes = await artistService.getSlots();
      setSlots(slotsRes.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setSlotLoading(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await artistService.deleteSlot(id);
      showToast("Slot removed", "success");
      setSlots(slots.filter((s) => s.id !== id));
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleBookingStatus = async (id, status) => {
    try {
      await artistService.updateBookingStatus(id, {
        booking_status: status,
        cancel_reason: status === "CANCELLED" ? "Declined by artist" : undefined,
      });
      showToast(`Booking updated to ${status}!`, "success");
      // reload bookings
      const bookingsRes = await artistService.getArtistBookings();
      setBookings(bookingsRes.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await artistService.markAsRead(id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleUploadPortfolioImage = async (e) => {
    e.preventDefault();
    if (!portfolioFile) {
      showToast("Please select an image file to upload", "warning");
      return;
    }
    setPortfolioLoading(true);
    const formData = new FormData();
    formData.append("portfolio_image", portfolioFile);
    formData.append("caption", portfolioCaption);

    try {
      await artistService.uploadPortfolioImage(formData);
      showToast("Portfolio image uploaded successfully!", "success");
      setPortfolioFile(null);
      setPortfolioCaption("");
      // reload portfolio
      const portRes = await artistService.getPortfolio();
      setPortfolio(portRes.data || []);
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handleDeletePortfolioImage = async (id) => {
    try {
      await artistService.deletePortfolio(id);
      showToast("Portfolio image deleted", "success");
      setPortfolio(portfolio.filter(p => p.id !== id));
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const handleUpdateProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await artistService.updateArtistProfile({
        bio: editBio,
        experience_years: editExperience,
        location: editLocation,
        city: editCity,
        state: editState,
        pincode: editPincode
      });
      showToast("Profile settings updated successfully!", "success");
      fetchDashboardData();
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setProfileSaving(false);
    }
  };

  // Prepare chart data (mock mapping of bookings revenue over dates)
  const chartData = bookings
    .filter((b) => b.booking_status === "COMPLETED" || b.payment_status === "PAID")
    .map((b) => ({
      date: new Date(b.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      earnings: b.total_price,
    }));

  const totalEarnings = bookings
    .filter((b) => b.booking_status === "COMPLETED" || b.payment_status === "PAID")
    .reduce((sum, b) => sum + b.total_price, 0);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", color: "var(--text-secondary)" }}>
          Artist Panel
        </h3>
        
        {profile?.verification_status === "APPROVED" && (
          <>
            <button className={`sidebar-link btn-secondary ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <BarChart2 style={{ width: "18px" }} /> Dashboard Overview
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "bookings" ? "active" : ""}`} onClick={() => setActiveTab("bookings")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Calendar style={{ width: "18px" }} /> Client Bookings
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "services" ? "active" : ""}`} onClick={() => setActiveTab("services")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Plus style={{ width: "18px" }} /> Manage Services
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "slots" ? "active" : ""}`} onClick={() => setActiveTab("slots")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Clock style={{ width: "18px" }} /> Availability Slots
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <BarChart2 style={{ width: "18px" }} /> Revenue Analytics
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "notifications" ? "active" : ""}`} onClick={() => setActiveTab("notifications")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Bell style={{ width: "18px" }} /> Inbox Alerts
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "portfolio" ? "active" : ""}`} onClick={() => setActiveTab("portfolio")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Image style={{ width: "18px" }} /> Portfolio Gallery
            </button>
            <button className={`sidebar-link btn-secondary ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")} style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}>
              <Settings style={{ width: "18px" }} /> Profile Settings
            </button>
          </>
        )}

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
            <div className="skeleton" style={{ height: "40px", width: "45%", marginBottom: "2rem" }} />
            <div className="skeleton" style={{ height: "240px", width: "100%" }} />
          </div>
        ) : !profile ? (
          // Need Profile setup
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "1rem" }}>Set Up Artist Verification Profile</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              To list your mehndi services, you must provide government Aadhaar documents and verification photos.
            </p>
            
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px" }}>
              <form onSubmit={handleProfileSetup}>
                <div className="form-group">
                  <label className="form-label">Professional Bio</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe your mehndi styling specializations, styles, wedding experiences..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={dob} onChange={(e) => setDob(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aadhaar 12-Digit Number</label>
                    <input type="text" maxLength="12" className="form-control" placeholder="12-digit number" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Address/Location Area</label>
                    <input type="text" className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-control" value={city} onChange={(e) => setCity(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-control" value={state} onChange={(e) => setState(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input type="text" className="form-control" value={pincode} onChange={(e) => setPincode(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label className="form-label">Aadhaar Front Copy (Image)</label>
                  <input type="file" accept="image/*" onChange={(e) => setAadhaarFront(e.target.files[0])} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Aadhaar Back Copy (Image)</label>
                  <input type="file" accept="image/*" onChange={(e) => setAadhaarBack(e.target.files[0])} required />
                </div>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label">Selfie Photo for Identity Matching</label>
                  <input type="file" accept="image/*" onChange={(e) => setSelfie(e.target.files[0])} required />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={setupLoading}>
                  {setupLoading ? "Uploading credentials..." : "Submit Verification Profile"}
                </button>
              </form>
            </div>
          </div>
        ) : profile.verification_status === "PENDING" ? (
          // Verification Pending
          <div className="glass-panel" style={{ padding: "4rem", textAlign: "center" }}>
            <Award style={{ width: "64px", height: "64px", color: "var(--warning-color)", margin: "0 auto 1.5rem" }} />
            <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Verification Pending Approval</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
              Our administrators are currently auditing your uploaded Aadhaar identity cards and selfie verification. We will notify you via SMS/in-app alert once approved!
            </p>
          </div>
        ) : profile.verification_status === "REJECTED" ? (
          // Verification Rejected
          <div className="glass-panel" style={{ padding: "4rem", textAlign: "center", borderLeft: "6px solid var(--danger-color)" }}>
            <Award style={{ width: "64px", height: "64px", color: "var(--danger-color)", margin: "0 auto 1.5rem" }} />
            <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>Verification Rejected</h2>
            <p style={{ color: "var(--danger-color)", fontWeight: 600, marginBottom: "0.5rem" }}>Reason: {profile.rejection_reason}</p>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 1.5rem" }}>
              Please re-register or contact support to correct your documents.
            </p>
            <button className="btn btn-primary" onClick={() => fetchDashboardData()}>Re-check Profile</button>
          </div>
        ) : activeTab === "overview" ? (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Dashboard Overview</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Summary of your business performance.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Bookings</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800 }}>{bookings.length}</div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Pending</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--warning-color)" }}>
                  {bookings.filter(b => b.booking_status === "PENDING").length}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Accepted</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--info-color)" }}>
                  {bookings.filter(b => b.booking_status === "CONFIRMED").length}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Completed</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--success-color)" }}>
                  {bookings.filter(b => b.booking_status === "COMPLETED").length}
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Earnings</h3>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)" }}>
                  ₹{bookings.filter(b => b.booking_status === "COMPLETED" || b.payment_status === "PAID").reduce((sum, b) => sum + b.total_price, 0)}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Profile Completion</h3>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Setup Complete</span>
                  <span>100%</span>
                </div>
                <div style={{ height: "10px", background: "var(--background-alt)", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%", background: "var(--success-color)" }}></div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Unread Notifications</h3>
                <div style={{ fontSize: "2.5rem", fontWeight: 800 }}>{notifications.filter(n => !n.is_read).length}</div>
              </div>
            </div>
          </div>
        ) : activeTab === "bookings" ? (
          // Main approved artist bookings list
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Artist Booking Dashboard</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Accept and update scheduling states for your clients.</p>

            <div className="card-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <DollarSign style={{ width: "32px", height: "32px", color: "var(--success-color)" }} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Revenue</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>₹{totalEarnings}</div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Calendar style={{ width: "32px", height: "32px", color: "var(--accent-color)" }} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Active Appointments</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                    {bookings.filter((b) => b.booking_status === "CONFIRMED" || b.booking_status === "PENDING").length}
                  </div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Award style={{ width: "32px", height: "32px", color: "#ffc107" }} />
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Average Ratings</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{profile.avg_rating || "New"} Stars</div>
                </div>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <FileText style={{ width: "48px", height: "48px", color: "var(--accent-color)", margin: "0 auto 1rem" }} />
                <p>No bookings received from users yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {bookings.map((booking) => {
                  const start = new Date(booking.slot?.start_time);
                  return (
                    <div key={booking.id} className="glass-panel" style={{ padding: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{booking.service?.specialization_name}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Client: {booking.user?.name} ({booking.user?.phone})</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Address: {booking.address}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "1rem", marginTop: "0.3rem" }}>
                          <span>Date: {start.toLocaleDateString()}</span>
                          <span>Time: {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Payment</div>
                          <span style={{ fontWeight: 600 }}>{booking.payment_status}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Status</div>
                          <span className={`badge badge-${booking.booking_status.toLowerCase()}`}>{booking.booking_status}</span>
                        </div>

                        {booking.booking_status === "PENDING" && (
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button className="btn btn-primary" onClick={() => handleBookingStatus(booking.id, "CONFIRMED")} style={{ padding: "0.4rem" }}>
                              <Check style={{ width: "16px" }} />
                            </button>
                            <button className="btn btn-danger" onClick={() => handleBookingStatus(booking.id, "CANCELLED")} style={{ padding: "0.4rem" }}>
                              <X style={{ width: "16px" }} />
                            </button>
                          </div>
                        )}
                        {booking.booking_status === "CONFIRMED" && (
                          <button className="btn btn-primary" onClick={() => handleBookingStatus(booking.id, "COMPLETED")}>
                            Complete Service
                          </button>
                        )}
                        <button className="btn btn-secondary" onClick={() => navigate("/chat", { state: { receiverId: booking.user?.id, receiverName: booking.user?.name } })}>
                          Chat
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "services" ? (
          // Services Management tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Services Catalog</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
              {/* Form Add/Edit Service */}
              <div className="glass-panel" style={{ padding: "1.5rem", alignSelf: "start" }}>
                <h3 style={{ marginBottom: "1rem" }}>{editingServiceId ? "Edit Mehndi Service" : "Add Mehndi Service"}</h3>
                <form onSubmit={handleSaveService}>
                  <div className="form-group">
                    <label className="form-label">Service / Specialization Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Full Bridal Rajkumari Mehndi" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mehndi Category</label>
                    <select className="form-control" value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)}>
                      <option value="Bridal">Bridal</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Indo-Western">Indo-Western</option>
                      <option value="Minimalist">Minimalist</option>
                      <option value="Floral">Floral</option>
                      <option value="Modern Portrait">Modern Portrait</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Price (INR)</label>
                      <input type="number" min="100" className="form-control" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration (Mins)</label>
                      <input type="number" min="15" className="form-control" value={serviceDuration} onChange={(e) => setServiceDuration(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description Details</label>
                    <input type="text" className="form-control" placeholder="e.g. Intricate patterns covering front and back hands..." value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={serviceLoading}>
                      {editingServiceId ? "Update Catalog" : "Add to Catalog"}
                    </button>
                    {editingServiceId && (
                      <button type="button" className="btn btn-secondary" onClick={cancelEditService} disabled={serviceLoading}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List of Services */}
              <div>
                {services.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>Your service catalog is currently empty.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {services.map((svc) => (
                      <div key={svc.id} className="glass-panel" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{svc.specialization_name}</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{svc.category} • {svc.duration_minutes} Mins</div>
                          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{svc.description}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{ fontWeight: 700, color: "var(--accent-color)" }}>₹{svc.minimum_price}</span>
                          <button className="btn btn-secondary" onClick={() => handleEditService(svc)} style={{ padding: "0.4rem" }}>
                            Edit
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDeleteService(svc.id)} style={{ padding: "0.4rem" }}>
                            <Trash2 style={{ width: "16px" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "slots" ? (
          // Slots scheduling management tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Availability Slots</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Define Free Slot</h3>
                <form onSubmit={handleAddSlot}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-control" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-control" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={slotLoading}>
                    Add Time Window
                  </button>
                </form>
              </div>

              <div>
                {slots.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No availability windows defined. Add one on the left.</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                    {slots.map((s) => {
                      const start = new Date(s.start_time);
                      return (
                        <div key={s.id} className="glass-panel" style={{ padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "1rem", background: s.is_booked ? "var(--bg-tertiary)" : "var(--bg-secondary)" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{start.toLocaleDateString()}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          {s.is_booked ? (
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-color)" }}>Booked</span>
                          ) : (
                            <button className="btn btn-danger" onClick={() => handleDeleteSlot(s.id)} style={{ padding: "0.3rem", borderRadius: "50%" }}>
                              <Trash2 style={{ width: "12px" }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "analytics" ? (
          // Analytics charts tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Revenue Analytics</h1>
            <div className="glass-panel" style={{ padding: "2rem", height: "400px" }}>
              {chartData.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyItems: "center", height: "100%", justifyContent: "center", color: "var(--text-secondary)" }}>
                  Completing a paid service updates the analytics charts automatically.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip contentStyle={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
                    <Line type="monotone" dataKey="earnings" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ) : activeTab === "notifications" ? (
          // Notifications Inbox alerts tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Inbox Alerts</h1>
            {notifications.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>No notification alerts in your inbox.</p>
            ) : (
              <div>
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${!notif.is_read ? "unread" : ""}`}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{notif.title}</div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{notif.message}</p>
                    </div>
                    {!notif.is_read && (
                      <button className="btn btn-secondary" onClick={() => handleMarkAsRead(notif.id)} style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "portfolio" ? (
          // Portfolio management tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Portfolio Gallery</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Upload New Design</h3>
                <form onSubmit={handleUploadPortfolioImage}>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Design Photo</label>
                    <input type="file" accept="image/*" onChange={(e) => setPortfolioFile(e.target.files[0])} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label className="form-label">Caption / Tag (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bridal Front Hand Peacock Pattern"
                      value={portfolioCaption}
                      onChange={(e) => setPortfolioCaption(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={portfolioLoading}>
                    {portfolioLoading ? "Uploading..." : "Upload Photo"}
                  </button>
                </form>
              </div>

              <div>
                {portfolio.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)" }}>No designs uploaded yet. Use the upload panel on the left.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                    {portfolio.map((p) => (
                      <div key={p.id} className="glass-panel" style={{ padding: "0.5rem", position: "relative", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <img
                          src={p.image_url}
                          alt={p.caption || "Mehndi design"}
                          style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px" }}
                        />
                        {p.caption && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {p.caption}
                          </div>
                        )}
                        <button
                          className="btn btn-danger"
                          style={{ padding: "0.3rem", fontSize: "0.8rem", width: "100%", justifyContent: "center" }}
                          onClick={() => handleDeletePortfolioImage(p.id)}
                        >
                          <Trash2 style={{ width: "14px", marginRight: "3px" }} /> Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Profile settings tab
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Profile Settings</h1>
            <div className="glass-panel" style={{ padding: "2rem", maxWidth: "600px" }}>
              <form onSubmit={handleUpdateProfileSubmit}>
                <div className="form-group">
                  <label className="form-label">Professional Bio</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address/Location Area</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save Settings"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtistDashboard;
