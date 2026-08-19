import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { verifyUserOtp, registerVerifyOtp, sendOtp, registerSendOtp } from "../../services/auth";
import { secureStorage } from "../../utils/storage";
import { useAuth } from "../../context/AuthContext";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function OtpScreen({ navigation, route }) {
  const { name, email, phone, role, isRegistering } = route.params || {};
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const { dispatch } = useAuth();
  const { setArtistProfileCompleted } = useArtistOnboarding();
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = async () => {
    if (resending || timer > 0) return;
    setError("");
    setResending(true);
    try {
      let res;
      if (isRegistering) {
        res = await registerSendOtp(name, email, phone, role);
      } else {
        res = await sendOtp(email);
      }
      setTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      if (global.showToast) {
        global.showToast(`New OTP sent to ${email || "your email"}`, "success");
      }
    } catch (e) {
      console.log("Resend OTP error:", e);
      const msg = e?.response?.data?.message || e.message || "Failed to resend OTP. Please try again.";
      setError(msg);
      if (global.showToast) {
        global.showToast(msg, "error");
      }
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    // Focus first input box on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (text, index) => {
    const cleanText = String(text || "").replace(/[^0-9]/g, "");
    if (cleanText.length > 1) {
      const pastedDigits = cleanText.slice(0, 6).split("");
      const newOtp = ["", "", "", "", "", ""];
      pastedDigits.forEach((digit, idx) => {
        if (idx < 6) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      setError("");
      const nextIndex = Math.min(pastedDigits.length - 1, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanText;
    setOtp(newOtp);
    setError("");
    if (cleanText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    setError("");
    const otpStr = otp.join("");
    if (otpStr.length < 6) {
      setError("Please enter the complete OTP");
      return;
    }

    if (!email) {
      navigation.reset({
        index: 0,
        routes: [{ name: "RoleSelection" }],
      });
      return;
    }

    setLoading(true);
    try {
      let data;
      if (isRegistering) {
        data = await registerVerifyOtp(email, otpStr, name, phone, role);
      } else {
        data = await verifyUserOtp(email, otpStr);
      }
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem("pendingReferralCode");
      } catch (err) {
        console.log("Failed to clear stored referral code:", err.message);
      }
      const token = await secureStorage.getAccessToken();
      console.log("[ROLE TRACE 4] /register-verify-otp response:", JSON.stringify(data, null, 2));
      console.log("[ROLE TRACE 5] data.user.role from API response:", data.user?.role, "| Route param role:", role);

      const rawRole = data.user?.role || role || "";
      const userRole = (String(rawRole).toUpperCase() === "ARTIST") ? "ARTIST" : "USER";

      await secureStorage.setUserRole(userRole);
      if (data.user) {
        await secureStorage.setUserData({ ...data.user, role: userRole });
      }
      console.log("[ROLE TRACE 6] Role saved in secureStorage:", userRole);

      if (userRole === "ARTIST") {
        let profileCompleted = false;
        try {
          const { getArtistDetails } = require("../../services/artist");
          const profile = await getArtistDetails();
          if (profile) {
            profileCompleted = true;
            await secureStorage.setArtistProfileCompleted(true);
            await secureStorage.setArtistOnboardingDone(true);
            setArtistProfileCompleted(true);
          } else {
            setArtistProfileCompleted(false);
          }
        } catch (e) {
          console.log("Failed to fetch artist details on login:", e.message);
          const localCompleted = await secureStorage.getArtistProfileCompleted();
          if (localCompleted) {
            profileCompleted = true;
            setArtistProfileCompleted(true);
          } else {
            setArtistProfileCompleted(false);
          }
        }
      }

      console.log("[ROLE TRACE 7] Role passed in LOGIN dispatch:", userRole);
      dispatch({
        type: "LOGIN",
        payload: {
          user: data.user ? { ...data.user, role: userRole } : { role: userRole },
          token: token || data.token,
          role: userRole,
        },
      });
    } catch (error) {
      console.log("Otp Verification error:", error);
      const message =
        error?.response?.data?.message || error.message || "Invalid OTP. Please try again.";
      setError(message);
      if (global.showToast) {
        global.showToast(message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const displayEmail = email ? email : "your registered email";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>Enter 6 digit code sent to</Text>
        <Text style={styles.emailText}>{displayEmail}</Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.otpBox, error ? styles.otpBoxError : null]}
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              editable={!loading}
            />
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={{ alignItems: "center", marginTop: 30 }}>
          {timer > 0 ? (
            <Text style={styles.resend}>
              Resend OTP in{" "}
              <Text style={styles.timer}>
                00:{timer.toString().padStart(2, "0")}
              </Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.timer}>Resend OTP</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.white, justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 30, fontWeight: "700", color: Colors.text },
  subtitle: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
  emailText: { marginTop: 15, fontSize: 15, fontWeight: "600", color: Colors.text },
  otpContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 35 },
  otpBox: { width: 50, height: 60, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, textAlign: "center", fontSize: 22, fontWeight: "700", color: Colors.text, backgroundColor: Colors.inputBackground },
  otpBoxError: { borderColor: Colors.error || "#FF3B30" },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, textAlign: "center", marginTop: 8 },
  resend: { textAlign: "center", marginTop: 30, color: Colors.textTertiary, fontSize: 14 },
  timer: { color: Colors.primary, fontWeight: "700" },
  button: { height: 55, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 30 },
  disabledButton: { opacity: 0.7 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
