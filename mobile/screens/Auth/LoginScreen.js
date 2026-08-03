import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { sendOtp, checkEmail } from "../../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailChange = (text) => {
    setEmail(text);
    if (error) setError("");
  };

  const handleContinue = async () => {
    if (loading) return;

    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      const msg = "Please enter your email address";
      setError(msg);
      Alert.alert("Invalid Email", msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please enter a valid email address (e.g. user@example.com)";
      setError(msg);
      Alert.alert("Invalid Email", msg);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check account existence in Database (Read-only check, 0 OTPs sent)
      const checkRes = await checkEmail(trimmedEmail);
      const emailStatus = checkRes?.data || checkRes;

      if (emailStatus && emailStatus.exists) {
        // CASE A: EXISTING ACCOUNT -> Send Login OTP & Navigate to OTP Screen
        const otpRes = await sendOtp({ email: trimmedEmail });
        const otpData = otpRes?.data || otpRes;
        const otp = otpData.otp ? String(otpData.otp) : "";
        const existingRole = otpData.role || emailStatus.role || "USER";

        Alert.alert("Login OTP Sent", `Verification OTP has been sent to your email. (Dev code: ${otp})`);
        navigation.navigate("Otp", {
          email: trimmedEmail,
          role: existingRole,
          isRegistering: false,
          mode: "login",
          otp,
        });
      } else {
        // CASE B: NO ACCOUNT FOUND -> Toast error and stay on Login screen (NO auto signup, NO role ask)
        const msg = "No account found with this email. Please sign up first.";
        setError(msg);
        Alert.alert("Account Not Found", msg);
      }
    } catch (e) {
      console.log("[LOGIN ERROR]:", e);
      const msg = e?.response?.data?.message || e.message || "Failed to check email. Please try again.";
      setError(msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>MehndiGo</Text>
        <Text style={styles.subtitle}>Enter your email address to log in</Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={email}
            onChangeText={handleEmailChange}
            editable={!loading}
            style={[styles.input, loading && styles.disabledInput]}
            placeholder="Email Address"
            placeholderTextColor={Colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          disabled={loading}
          onPress={() => {
            setError("");
            navigation.navigate("Register");
          }}
        >
          <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.loginText}>Continue</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.white, paddingHorizontal: 24, justifyContent: "center" },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: -20,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 22, textAlign: "center" },
  inputContainer: { height: 54, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 8, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  disabledInput: { opacity: 0.6, color: Colors.textSecondary },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginBottom: 8, textAlign: "center" },
  loginButton: { height: 52, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 14 },
  disabledButton: { opacity: 0.7 },
  loginText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", marginBottom: 12, marginTop: 6 },
});
