import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { formatRelativeTime } from "../utils/dateFormatter";
// For simplicity, using authService for notifications or a unified notification endpoint
// But since the API requires role-based endpoints, we might just rely on socket.io events
// and store them in state for this dropdown.

const NotificationDropdown = ({ showToast }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.id) {
      const socket = io("http://localhost:3000");
      socket.emit("join", user.id);

      socket.on("new_notification", (data) => {
        setNotifications((prev) => [
          {
            id: Date.now(),
            title: data.title,
            message: data.message,
            is_read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        if (showToast) showToast(data.title + ": " + data.message, "info");
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user?.id, showToast]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notification-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
      <button
        className="btn btn-secondary"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "0.4rem",
          borderRadius: "50%",
          display: "flex",
          position: "relative",
          background: "transparent",
          border: "none",
        }}
        title="Notifications"
      >
        <Bell style={{ width: "20px", height: "20px", color: "var(--text-primary)" }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "var(--danger-color)",
              color: "white",
              fontSize: "0.65rem",
              fontWeight: "bold",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-panel notification-menu"
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            width: "320px",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "1rem",
            zIndex: 2000,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-color)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-secondary)" }}>
              <Bell style={{ width: "24px", height: "24px", opacity: 0.5, marginBottom: "0.5rem" }} />
              <p style={{ fontSize: "0.9rem", margin: 0 }}>You have no notifications.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: n.is_read ? "transparent" : "var(--bg-tertiary)",
                    borderLeft: n.is_read ? "none" : "3px solid var(--accent-color)",
                  }}
                >
                  <h5 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", fontWeight: 700 }}>{n.title}</h5>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{n.message}</p>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem", display: "block" }}>
                    {formatRelativeTime(n.created_at || n.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
