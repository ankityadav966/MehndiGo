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
import { verifyUserOtp, registerVerifyOtp } from "../../services/auth";
import { secureStorage } from "../../utils/storage";
import { useAuth } from "../../context/AuthContext";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";

export default function OtpScreen({ navigation, route }) {
  const { email, role, otp: initialOtp, isRegistering } = route.params || {};
  const [otp, setOtp] = useState(initialOtp ? initialOtp.split("") : ["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const { dispatch } = useAuth();
  const { setArtistProfileCompleted } = useArtistOnboarding();
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (initialOtp && initialOtp.length === 6) {
      inputRefs.current[5]?.focus();
    }
  }, []);

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError("");
    if (text && index < 5) {
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
        data = await registerVerifyOtp(email, otpStr);
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
      console.log("Verify OTP Response Token:", token);
      console.log("Verify OTP Response Data:", JSON.stringify(data, null, 2));

      const userRole = data.user?.role || role;

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

      dispatch({
        type: "LOGIN",
        payload: {
          user: data.user,
          token: token || data.token,
          role: userRole,
        },
      });
    } catch (error) {
      console.log("Otp Verification error:", error);
      const message =
        error?.response?.data?.message || error.message || "Invalid OTP. Please try again.";
      setError(message);
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

        <Text style={styles.resend}>
          {timer > 0 ? (
            <>
              Resend OTP in{" "}
              <Text style={styles.timer}>
                00:{timer.toString().padStart(2, "0")}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTimer(30);
                setOtp(["", "", "", "", "", ""]);
                setError("");
                inputRefs.current[0]?.focus();
              }}
            >
              <Text style={styles.timer}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </Text>

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
