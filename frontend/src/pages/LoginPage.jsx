import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Mail, UserCheck, KeyRound, User, Phone } from "lucide-react";

const LoginPage = ({ showToast }) => {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Verify OTP
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("USER");
  const [otp, setOtp] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast("Email address is required", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast("Please enter a valid email address", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendOtp({ email: trimmedEmail });
      const data = res.data || res;

      if (data.exists) {
        showToast(`OTP Sent successfully. Code: ${data.otp || ""} (For testing)`, "success");
        setStep(2);
        setShowRegistration(false);
      } else {
        setShowRegistration(true);
        showToast("This email is not registered. Please enter your details below to sign up.", "info");
      }
    } catch (err) {
      showToast(err.message || "Failed to check email. Please try again.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Full Name is required for registration", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.registerSendOtp({
        name: trimmedName,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        role,
      });
      const data = res.data || res;
      showToast(`Verification code sent to your email. Code: ${data.otp || ""} (For testing)`, "success");
      setStep(2);
    } catch (err) {
      showToast(err.message || "Registration failed. Please try again.", "danger");
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
      let res;
      if (showRegistration) {
        res = await authService.registerVerifyOtp({ email: email.trim().toLowerCase(), otp });
      } else {
        res = await authService.verifyOtp({ email: email.trim().toLowerCase(), otp });
      }
      const data = res.data || res;

      loginSuccess(data.token, data.user);
      showToast("Welcome to MehndiGo!", "success");
      
      if (data.user.role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (e) {
      showToast("Invalid verification code: " + e.message, "danger");
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
            {step === 1 
              ? (showRegistration ? "Complete your profile to register" : "Enter your email address to continue")
              : "Enter the 6-digit verification code"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={showRegistration ? handleRegister : handleContinue}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
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
                  placeholder="e.g. user@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={showRegistration}
                  style={{ paddingLeft: "2.5rem" }}
                  required
                />
              </div>
            </div>

            {showRegistration && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
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
                      placeholder="e.g. Ankit Yadav"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ paddingLeft: "2.5rem" }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number (Optional)</label>
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
                      type="text"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ paddingLeft: "2.5rem" }}
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
                    </select>
                  </div>
                </div>
              </>
            )}

            {showRegistration && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowRegistration(false);
                  setName("");
                  setPhone("");
                }}
                style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              >
                Use a different email address
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
              disabled={loading}
            >
              {loading 
                ? (showRegistration ? "Registering..." : "Continuing...") 
                : (showRegistration ? "Create Account" : "Continue")}
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
