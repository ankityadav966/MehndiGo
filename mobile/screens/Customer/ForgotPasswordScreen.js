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

export default function ForgotPasswordScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    setError("");
    if (!phone.trim() || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      // Mock API call
      await new Promise((r) => setTimeout(r, 1000));
      navigation.navigate("Otp", { email: "", mobile: phone, name: "", password: "" });
    } catch (e) {
      setError("Failed to send OTP. Please try again.");
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
          <Text style={styles.subtitle}>Enter your registered mobile number</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
                <Ionicons name="chevron-down" size={14} color="#666" />
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="9876543210"
                placeholderTextColor="#CCC"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
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
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.linkText}>Register</Text>
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
  phoneRow: { flexDirection: "row", alignItems: "center" },
  countryCode: {
    height: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1,
    borderColor: "#E2E6ED", flexDirection: "row", alignItems: "center",
    marginRight: 10, backgroundColor: "#F2F4F7",
  },
  countryCodeText: { fontSize: 15, fontWeight: "600", color: "#111", marginRight: 4 },
  phoneInput: {
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
  linkSeparator: { marginHorizontal: 14, color: "#DDD", fontSize: 14 },
});
