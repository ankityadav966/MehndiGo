import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Phone, UserCheck, Shield, KeyRound } from "lucide-react";

const LoginPage = ({ showToast }) => {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = input details, 2 = verify OTP
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("USER");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      showToast("Phone number is required", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendOtp({ name, phone, role });
      showToast(`OTP Sent successfully: ${res.data.otp} (For testing)`, "success");
      setStep(2);
    } catch (e) {
      // If user exists, prompt to login directly
      if (e.message.includes("registered as")) {
        showToast(e.message, "danger");
      } else {
        // Try directly sending login request if they are registered
        try {
          const res = await authService.login({ phone, role });
          showToast(`OTP sent to your registered number: ${res.data?.otp || res.otp || ""} (For testing)`, "success");
          setStep(2);
        } catch (err) {
          showToast(err.message, "danger");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      showToast("Verification code is required", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyOtp({ phone, otp, role });
      loginSuccess(res.data.token, res.data.user);
      showToast("Welcome to Mehndi Go!", "success");
      
      if (res.data.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      showToast("Invalid verification code or role mismatch: " + e.message, "danger");
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
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>
            Mehndi <span className="text-accent">Go</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {step === 1 ? "Sign up or login via Phone OTP" : "Enter the 6-digit verification code"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Full Name (Only for signup)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ankit Yadav"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ position: "relative" }}>
                <Phone
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "10px",
                    color: "var(--text-secondary)",
                    width: "16px",
                  }}
                />
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Select Account Role</label>
              <div style={{ position: "relative" }}>
                <UserCheck
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "10px",
                    color: "var(--text-secondary)",
                    width: "16px",
                  }}
                />
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                >
                  <option value="USER">Customer / Client</option>
                  <option value="ARTIST">Talent / Artist</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              disabled={loading}
            >
              {loading ? "Requesting OTP..." : "Get Verification Code"}
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
                  placeholder="e.g. 123456"
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
              style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
              disabled={loading}
            >
              Go Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
