import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import UserDashboard from "./pages/UserDashboard";
import ArtistDashboard from "./pages/ArtistDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ChatPage from "./pages/ChatPage";
import SecretAdminLogin from "./pages/SecretAdminLogin";
import { Moon, Sun, MessageSquare, ShieldAlert, Award, User, LogIn, Sparkles } from "lucide-react";

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, user, theme, toggleTheme, logout } = useAuth();
  
  // Custom Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <Router>
      <div className="app-container">
        {/* Navigation Bar */}
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            <Sparkles style={{ width: "24px", height: "24px", color: "var(--accent-color)" }} />
            MehndiGo
          </Link>

          <div className="navbar-links">
            <Link to="/" className="nav-link">Directory</Link>
            
            {isAuthenticated && (
              <>
                {user?.role === "ADMIN" ? (
                  <Link to="/admin" className="nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <ShieldAlert style={{ width: "16px" }} /> Admin
                  </Link>
                ) : (
                  <Link to="/dashboard" className="nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <User style={{ width: "16px" }} /> My Panel
                  </Link>
                )}
                
                <Link to="/chat" className="nav-link" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <MessageSquare style={{ width: "16px" }} /> Messages
                </Link>
              </>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ padding: "0.4rem", borderRadius: "50%", display: "flex" }}
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun style={{ width: "18px", height: "18px", color: "#ffb300" }} />
              ) : (
                <Moon style={{ width: "18px", height: "18px", color: "#424242" }} />
              )}
            </button>

            {isAuthenticated ? (
              <button onClick={logout} className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }}>
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                <LogIn style={{ width: "16px" }} /> Sign In
              </Link>
            )}
          </div>
        </nav>

        {/* Global Toast Alert */}
        {toast && (
          <div
            className="glass-panel"
            style={{
              position: "fixed",
              top: "90px",
              right: "24px",
              zIndex: 3000,
              padding: "1rem 1.5rem",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              animation: "slideIn 0.3s ease",
              borderLeft: `5px solid ${
                toast.type === "success"
                  ? "var(--success-color)"
                  : toast.type === "danger"
                  ? "var(--danger-color)"
                  : toast.type === "warning"
                  ? "var(--warning-color)"
                  : "var(--accent-color)"
              }`,
            }}
          >
            <span>{toast.message}</span>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {/* Client Routes */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<LandingPage showToast={showToast} />} />
            <Route path="/login" element={<LoginPage showToast={showToast} />} />
            <Route path="/secret-admin-login" element={<SecretAdminLogin showToast={showToast} />} />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {user?.role === "ARTIST" ? (
                    <ArtistDashboard showToast={showToast} />
                  ) : user?.role === "ADMIN" ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <UserDashboard showToast={showToast} />
                  )}
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  {user?.role === "ADMIN" ? (
                    <AdminDashboard showToast={showToast} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )}
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage showToast={showToast} />
                </ProtectedRoute>
              }
            />

            {/* Catch all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
