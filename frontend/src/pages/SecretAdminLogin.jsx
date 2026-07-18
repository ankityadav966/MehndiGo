import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Mail, KeyRound, ShieldAlert } from "lucide-react";

const SecretAdminLogin = ({ showToast }) => {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = enter credentials, 2 = enter OTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendAdminOtp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Email and Password are both required", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.adminSendOtp({ email, password });
      showToast(`Admin OTP Sent successfully: ${res.data?.otp || res.otp || ""} (For testing)`, "success");
      setStep(2);
    } catch (err) {
      showToast("Admin verification failed: " + err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdminOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      showToast("OTP is required", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.adminVerifyOtp({ email, otp });
      loginSuccess(res.data.token, res.data.user);
      showToast("Welcome, Administrator!", "success");
      navigate("/admin");
    } catch (e) {
      showToast("Verification failed: " + e.message, "danger");
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
          border: "1px solid var(--danger-color)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <ShieldAlert
            style={{
              width: "48px",
              height: "48px",
              color: "var(--danger-color)",
              margin: "0 auto 1rem",
            }}
          />
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
            Secret Admin Gateway
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            {step === 1 ? "Authorized Administrators Only" : "Enter Administrative OTP"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendAdminOtp}>
            <div className="form-group">
              <label className="form-label">Admin Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "10px",
                    color: "var(--text-secondary)",
                    width: "16px",
                  }}
                />
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Password</label>
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
                  type="password"
                  className="form-control"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-danger"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Send Admin OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAdminOtp}>
            <div className="form-group">
              <label className="form-label">Verification OTP</label>
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
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{
                    paddingLeft: "2.5rem",
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-danger"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              disabled={loading}
            >
              {loading ? "Verifying Admin Access..." : "Verify & Authorize"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SecretAdminLogin;
