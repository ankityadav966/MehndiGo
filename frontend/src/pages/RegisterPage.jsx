import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, Lock, Mail, Phone, ShieldCheck, ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";

function RegisterPage({ showToast }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "USER"
  });
  
  const [otp, setOtp] = useState("");
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return showToast("Passwords do not match", "danger");
    }
    if (!formData.name || !formData.password) {
      return showToast("Name and Password are required", "danger");
    }
    if (!formData.phone && !formData.email) {
      return showToast("Please provide either Phone or Email", "danger");
    }
    
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role
      };
      const res = await authService.registerSendOtp(payload);
      showToast(res.message || "OTP sent successfully! (Check terminal for mock OTP)", "success");
      setStep(2);
    } catch (err) {
      showToast(err.message || "Failed to send OTP", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return showToast("Please enter OTP", "danger");

    setLoading(true);
    try {
      const payload = {
        otp,
        email: formData.email,
        phone: formData.phone
      };
      const res = await authService.registerVerifyOtp(payload);
      login(res.data.user, res.data.token);
      showToast("Registration Successful!", "success");
      
      if (res.data.user.role === "ARTIST") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      showToast(err.message || "Invalid OTP", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div className="auth-card glass-panel" style={{ maxWidth: "500px", width: "100%", padding: "2.5rem", borderRadius: "16px" }}>
        
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "var(--text-color)" }}>Create Account</h2>
          <p style={{ color: "var(--text-muted)" }}>Join Mehndi Go and explore beautiful designs.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <User className="input-icon" />
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" />
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Mobile Number</label>
              <div className="input-with-icon">
                <Phone className="input-icon" />
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your mobile number" className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" />
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" required className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <ShieldCheck className="input-icon" />
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" required className="form-control" />
              </div>
            </div>

            <div className="form-group">
              <label>Join As</label>
              <select name="role" value={formData.role} onChange={handleChange} required className="form-control" style={{ paddingLeft: "1rem" }}>
                <option value="USER">Customer</option>
                <option value="ARTIST">Mehndi Artist</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem", marginTop: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} disabled={loading}>
              {loading ? "Processing..." : (
                <>
                  Continue <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: "0 auto", marginBottom: "1rem" }} />
              <p>We've sent an OTP to your {formData.phone ? "Mobile" : "Email"}.</p>
            </div>

            <div className="form-group">
              <label>Enter OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" maxLength="6" required className="form-control" style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }} disabled={loading}>
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>
            
            <button type="button" className="btn btn-secondary" style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }} onClick={() => setStep(1)} disabled={loading}>
              <ChevronLeft size={18} /> Back
            </button>
          </form>
        )}

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "none" }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
