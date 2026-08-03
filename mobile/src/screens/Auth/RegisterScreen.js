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
import { registerSendOtp, checkEmail } from "../../services/auth";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState(null); // Must be explicitly selected ("USER" or "ARTIST")
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (text) => {
    setName(text);
    if (error) setError("");
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (error) setError("");
  };

  const handleRegister = async () => {
    if (loading) return;

    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      const msg = "Please enter your full name";
      setError(msg);
      Alert.alert("Required Field", msg);
      return;
    }

    if (!trimmedEmail) {
      const msg = "Please enter your email address";
      setError(msg);
      Alert.alert("Required Field", msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please enter a valid email address (e.g. user@example.com)";
      setError(msg);
      Alert.alert("Invalid Email", msg);
      return;
    }

    if (!selectedRole || (selectedRole !== "USER" && selectedRole !== "ARTIST")) {
      const msg = "Please select whether you want to use MehendiGo as a Customer or Artist";
      setError(msg);
      Alert.alert("Role Required", msg);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check if email is ALREADY registered (Read-only check, 0 OTPs sent)
      const checkRes = await checkEmail(trimmedEmail);
      const emailStatus = checkRes?.data || checkRes;

      if (emailStatus && emailStatus.exists) {
        // CASE A: EMAIL ALREADY EXISTS -> Toast error and stay on Register screen (NO duplicate OTP, NO auto login)
        const msg = "An account already exists with this email. Please log in.";
        setError(msg);
        Alert.alert("Account Already Exists", msg);
      } else {
        // CASE B: NEW EMAIL -> Send Registration OTP & Navigate to OTP Verification Screen
        const res = await registerSendOtp({ name: trimmedName, email: trimmedEmail, role: selectedRole });
        const data = res?.data || res;
        const otp = data.otp ? String(data.otp) : "";

        Alert.alert("Registration OTP Sent", `Verification OTP has been sent to your email. (Dev code: ${otp})`);
        navigation.navigate("Otp", {
          name: trimmedName,
          email: trimmedEmail,
          role: selectedRole,
          isRegistering: true,
          mode: "register",
          otp,
        });
      }
    } catch (e) {
      console.log("[REGISTER ERROR]:", e);
      const msg = e?.response?.data?.message || e.message || "Failed to process registration. Please try again.";
      setError(msg);
      Alert.alert("Registration Error", msg);
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Fill in your details to sign up</Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            editable={!loading}
            style={[styles.input, loading && styles.disabledInput]}
            placeholder="Full Name"
            placeholderTextColor={Colors.placeholder}
            maxLength={50}
          />
        </View>

        <View style={[styles.inputContainer, { marginTop: 6 }]}>
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

        <Text style={styles.roleLabel}>I want to use MehendiGo as</Text>
        
        <View style={styles.roleRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={loading}
            style={[styles.roleCard, selectedRole === "USER" && styles.selectedRoleCard]}
            onPress={() => {
              setSelectedRole("USER");
              setError("");
            }}
          >
            <View style={[styles.radio, selectedRole === "USER" && styles.selectedRadio]}>
              {selectedRole === "USER" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text style={[styles.roleText, selectedRole === "USER" && styles.selectedRoleText]}>
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={loading}
            style={[styles.roleCard, selectedRole === "ARTIST" && styles.selectedRoleCard]}
            onPress={() => {
              setSelectedRole("ARTIST");
              setError("");
            }}
          >
            <View style={[styles.radio, selectedRole === "ARTIST" && styles.selectedRadio]}>
              {selectedRole === "ARTIST" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text style={[styles.roleText, selectedRole === "ARTIST" && styles.selectedRoleText]}>
              Artist
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          disabled={loading}
          onPress={() => {
            setError("");
            navigation.navigate("Login");
          }}
        >
          <Text style={styles.linkText}>Already have an account? Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.registerText}>Register & Send OTP</Text>
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
    marginBottom: 14,
    marginTop: -16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: { fontSize: 26, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 16, textAlign: "center" },
  inputContainer: { height: 52, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 4, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  disabledInput: { opacity: 0.6, color: Colors.textSecondary },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginBottom: 8, textAlign: "center" },
  roleLabel: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8, marginTop: 10 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  roleCard: { flex: 1, height: 52, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: Colors.inputBackground },
  selectedRoleCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "20" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, justifyContent: "center", alignItems: "center", marginRight: 8 },
  selectedRadio: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioDot: { color: Colors.white, fontWeight: "700", fontSize: 11 },
  roleText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  selectedRoleText: { color: Colors.primary, fontWeight: "700" },
  registerButton: { height: 52, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 10 },
  disabledButton: { opacity: 0.7 },
  registerText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", marginBottom: 10, marginTop: 4 },
});
