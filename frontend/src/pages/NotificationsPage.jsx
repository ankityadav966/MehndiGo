import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ArrowLeft, Calendar, DollarSign, Tag, Info, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { artistService, adminService, authService } from "../services/api";
import { formatRelativeTime } from "../utils/dateFormatter";

const NotificationsPage = ({ showToast }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, BOOKINGS, SYSTEM

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let res;
      const role = String(user?.role || "").toUpperCase();
      if (role === "ARTIST") {
        res = await artistService.getNotifications();
      } else if (role === "ADMIN") {
        res = await adminService.getNotifications();
      } else {
        res = await authService.getProfile().catch(() => ({}));
      }

      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.notifications)
        ? res.data.notifications
        : Array.isArray(res?.notifications)
        ? res.notifications
        : Array.isArray(res)
        ? res
        : [];

      setNotifications(list);
    } catch (err) {
      if (showToast) showToast("Failed to load notifications", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.role]);

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (showToast) showToast("All notifications marked as read", "success");
    } catch (err) {
      if (showToast) showToast("Failed to mark notifications as read", "danger");
    }
  };

  const markSingleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const getNotifIcon = (type) => {
    const t = String(type || "").toUpperCase();
    if (t.includes("BOOKING")) return <Calendar style={{ width: "20px", height: "20px", color: "var(--accent-color)" }} />;
    if (t.includes("PAYMENT") || t.includes("CASH") || t.includes("WALLET")) return <DollarSign style={{ width: "20px", height: "20px", color: "var(--success-color)" }} />;
    if (t.includes("PROMO") || t.includes("COUPON")) return <Tag style={{ width: "20px", height: "20px", color: "#ffc107" }} />;
    if (t.includes("ALERT") || t.includes("ERROR")) return <AlertCircle style={{ width: "20px", height: "20px", color: "var(--danger-color)" }} />;
    return <Info style={{ width: "20px", height: "20px", color: "var(--text-secondary)" }} />;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    if (filter === "BOOKINGS") return String(n.type || "").toUpperCase().includes("BOOKING");
    if (filter === "SYSTEM") return !String(n.type || "").toUpperCase().includes("BOOKING");
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ padding: "2rem 1rem", maxWidth: "900px", margin: "0 auto", minHeight: "80vh" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center" }}
            title="Go Back"
          >
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell style={{ width: "24px", height: "24px", color: "var(--accent-color)" }} />
              Notifications Center
            </h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Stay updated on client bookings, payments, and system updates.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={fetchNotifications}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
          >
            <RefreshCw style={{ width: "16px", height: "16px" }} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
            >
              <CheckCheck style={{ width: "16px", height: "16px" }} /> Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
        {[
          { key: "ALL", label: `All Alerts (${notifications.length})` },
          { key: "UNREAD", label: `Unread (${unreadCount})` },
          { key: "BOOKINGS", label: "Bookings & Orders" },
          { key: "SYSTEM", label: "System & Promos" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`btn ${filter === tab.key ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "0.4rem 1rem", borderRadius: "20px", fontSize: "0.85rem" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)" }}>
          <RefreshCw className="spin" style={{ width: "32px", height: "32px", marginBottom: "1rem" }} />
          <p>Loading notification history...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <Bell style={{ width: "48px", height: "48px", opacity: 0.3, marginBottom: "1rem" }} />
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>All Caught Up!</h3>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>No notifications match the selected filter criteria.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredNotifications.map((notif) => {
            const isUnread = !notif.is_read;
            return (
              <div
                key={notif.id || notif._id}
                onClick={() => markSingleRead(notif.id || notif._id)}
                className="glass-panel"
                style={{
                  padding: "1.25rem",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  background: isUnread ? "var(--bg-tertiary)" : "transparent",
                  borderLeft: isUnread ? "4px solid var(--accent-color)" : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div
                  style={{
                    padding: "0.6rem",
                    borderRadius: "12px",
                    background: isUnread ? "rgba(230, 0, 76, 0.1)" : "var(--background-alt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {getNotifIcon(notif.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: isUnread ? 800 : 600, color: "var(--text-primary)" }}>
                      {notif.title}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatRelativeTime(notif.created_at || notif.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {notif.message || notif.body}
                  </p>
                </div>

                {isUnread && (
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-color)", marginTop: "0.5rem" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
