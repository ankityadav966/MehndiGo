import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendOtp } from "../../services/auth";
import Alert from "../../utils/Alert";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    setError("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const otpRes = await sendOtp(trimmedEmail);
      const data = otpRes?.data || otpRes;
      if (data) {
        Alert.alert("Verification OTP 📩", `A 6-digit verification code has been sent to ${trimmedEmail}. Please check your inbox.`);
        navigation.navigate("Otp", {
          email: trimmedEmail,
          role: data.role || "USER",
          isRegistering: false,
          flow: "FORGOT_PASSWORD",
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your registered email address to receive an OTP</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={styles.emailInput}
                placeholder="e.g. customer@gmail.com"
                placeholderTextColor="#CCC"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.disabledBtn]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendBtnText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.linkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 10 },
  backBtn: { marginRight: 15 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 26, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 8, marginBottom: 35 },
  errorText: { color: "#EF4444", fontSize: 13, marginBottom: 12, textAlign: "center" },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 14, color: "#555", marginBottom: 8, fontWeight: "500" },
  emailRow: { flexDirection: "row", alignItems: "center" },
  emailInput: {
    flex: 1, height: 50, borderWidth: 1, borderColor: "#E2E6ED", borderRadius: 12,
    paddingHorizontal: 16, fontSize: 15, color: "#111", backgroundColor: "#F2F4F7",
  },
  sendBtn: {
    height: 52, borderRadius: 12, backgroundColor: "#F7146B",
    justifyContent: "center", alignItems: "center", marginTop: 10,
  },
  disabledBtn: { opacity: 0.7 },
  sendBtnText: { color: "#FFF", fontWeight: "600", fontSize: 16 },
  linksRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 30,
  },
  linkText: { fontSize: 14, color: "#F7146B", fontWeight: "600" },
});
