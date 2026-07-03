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
  Image
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { sendOtp } from "../../services/auth";

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    setError("");
    let phone = mobile.trim();
    if (!phone) {
      setError("Please enter your mobile number");
      return;
    }
    if (phone.length < 10) {
      setError("Please enter a valid mobile number");
      return;
    }
    if (!phone.startsWith("+")) {
      phone = `+91${phone}`;
    }

    setLoading(true);
    try {
      const otpRes = await sendOtp(name, email, phone, role);
      const otp = otpRes?.data?.otp ? String(otpRes.data.otp) : "";
      Alert.alert("Development OTP", `Verification code is: ${otp}`);
      navigation.navigate("Otp", {
        phone,
        name,
        email,
        role,
        otp,
      });
    } catch (error) {
      console.log("Send OTP request error:", error);
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to send OTP. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const displayPhone = mobile
    ? mobile.startsWith("+")
      ? mobile
      : `+91${mobile}`
    : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              setError("");
            }}
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor={Colors.placeholder}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.roleLabel}>I am a</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.roleCard, role === "USER" && styles.selectedRoleCard]}
            onPress={() => setRole("USER")}
          >
            <View style={[styles.radio, role === "USER" && styles.selectedRadio]}>
              {role === "USER" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text style={[styles.roleText, role === "USER" && styles.selectedRoleText]}>
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.roleCard, role === "ARTIST" && styles.selectedRoleCard]}
            onPress={() => setRole("ARTIST")}
          >
            <View style={[styles.radio, role === "ARTIST" && styles.selectedRadio]}>
              {role === "ARTIST" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text style={[styles.roleText, role === "ARTIST" && styles.selectedRoleText]}>
              Mehendi Artist
            </Text>
          </TouchableOpacity>
        </View>

        {!showDetails ? (
          <TouchableOpacity onPress={() => setShowDetails(true)}>
            <Text style={styles.linkText}>New user? Add name & email (optional)</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.placeholder}
              />
            </View>
            <View style={[styles.inputContainer, { marginTop: 8 }]}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={Colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleSendOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.loginText}>Send OTP</Text>
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
    marginBottom: 24,
    marginTop: -40,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: { fontSize: 30, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 35 },
  inputContainer: { height: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 4, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginBottom: 12, marginLeft: 4 },
  roleLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 12, marginTop: 8 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleCard: { flex: 1, height: 56, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, backgroundColor: Colors.inputBackground },
  selectedRoleCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "20" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border, justifyContent: "center", alignItems: "center", marginRight: 10 },
  selectedRadio: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioDot: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  roleText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  selectedRoleText: { color: Colors.primary, fontWeight: "700" },
  loginButton: { height: 55, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 20 },
  disabledButton: { opacity: 0.7 },
  loginText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", marginBottom: 8 },
});
