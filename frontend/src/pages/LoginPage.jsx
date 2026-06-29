import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, KeyRound, ArrowRight, ChevronLeft } from "lucide-react";

const LoginPage = ({ showToast }) => {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState(""); // Phone or Email
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!identifier) {
      return showToast("Phone number or Email is required", "warning");
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = isEmail ? { email: identifier } : { phone: identifier };
      
      const res = await authService.login(payload);
      showToast(`OTP Sent successfully! (Check terminal/mock)`, "success");
      setUserRole(res.data?.role || res.role);
      setStep(2);
    } catch (err) {
      showToast(err.message || "Failed to send OTP. Account may not exist.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      return showToast("Verification code is required", "warning");
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const payload = { otp, ...(isEmail ? { email: identifier } : { phone: identifier }) };
      
      const res = await authService.verifyOtp(payload);
      loginSuccess(res.data.token, res.data.user);
      showToast(`Welcome back, ${res.data.user.name}!`, "success");
      
      if (res.data.user.role === "ADMIN") {
        navigate("/admin");
      } else if (res.data.user.role === "ARTIST") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      showToast(e.message || "Invalid verification code", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        padding: "2rem",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--bg-secondary)",
          padding: "2.5rem 2rem",
          borderRadius: "16px"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
            Welcome <span className="text-accent">Back</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {step === 1 ? "Sign in to your account" : "Enter the 6-digit verification code"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Email or Mobile Number</label>
              <div style={{ position: "relative" }}>
                <User
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "10px",
                    color: "var(--text-secondary)",
                    width: "16px",
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter email or mobile"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
              disabled={loading}
            >
              {loading ? "Requesting OTP..." : <>Continue <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label className="form-label">Enter 6-Digit OTP</label>
              <div style={{ position: "relative" }}>
                <KeyRound
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "10px",
                    color: "var(--text-secondary)",
                    width: "16px",
                  }}
                />
                <input
                  type="text"
                  maxLength="6"
                  className="form-control"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ paddingLeft: "2.5rem", letterSpacing: "8px", textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(1)}
              style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
              disabled={loading}
            >
              <ChevronLeft size={18} /> Go Back
            </button>
          </form>
        )}

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>
            Don't have an account? <Link to="/register" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "none" }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
