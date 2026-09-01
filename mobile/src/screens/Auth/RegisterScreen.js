import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import Alert from "../../utils/Alert";
import { registerSendOtp, sanitizePhone } from "../../services/auth";

export default function RegisterScreen({ navigation, route }) {
  const { email: initialEmail } = route.params || {};
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const checkReferral = async () => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const code = await AsyncStorage.getItem("pendingReferralCode");
        if (code) {
          setReferralCode(code);
        }
      } catch (err) {
        if (__DEV__) console.log("Error reading referral code:", err.message);
      }
    };
    checkReferral();
  }, []);

  const handleRegister = async () => {
    if (loading) return;

    setError("");
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = sanitizePhone(phone);

    if (!trimmedName) {
      const msg = "Please enter your full name";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    if (!trimmedEmail) {
      const msg = "Please enter your email address";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please enter a valid email address";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    if (!cleanPhone) {
      const msg = "Please enter your mobile phone number";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    if (cleanPhone.length !== 10) {
      const msg = "Mobile number must be exactly 10 digits";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    if (!selectedRole) {
      const msg = "Please select a role";
      setError(msg);
      if (global.showToast) global.showToast(msg, "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await registerSendOtp(trimmedName, trimmedEmail, cleanPhone, selectedRole);
      const data = res?.data || res;
      if (global.showToast) {
        global.showToast(`Verification code sent to ${trimmedEmail}`, "success");
      }
      navigation.navigate("Otp", {
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanPhone,
        role: selectedRole,
        isRegistering: true,
        flow: "SIGNUP",
        referralCode: referralCode || "",
      });
    } catch (e) {
      if (__DEV__) console.log("[REGISTER ERROR]:", e);
      const msg = e?.response?.data?.message || e.message || "Failed to process registration. Please try again.";
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes("email address already registered") || lowerMsg.includes("email already registered")) {
        Alert.alert(
          "Email Already Registered 📩",
          `The email address ${trimmedEmail} is already registered.\n\nWould you like to log in instead?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Log In",
              onPress: () => navigation.navigate("Login", { email: trimmedEmail }),
            },
          ]
        );
        setError(`Email ${trimmedEmail} is already registered. Please log in.`);
      } else if (lowerMsg.includes("phone number already registered") || lowerMsg.includes("phone already registered")) {
        Alert.alert(
          "Phone Number Already Registered 📱",
          `The mobile number (${cleanPhone}) is already linked to another account.\n\nPlease enter a different phone number to complete registration.`,
          [{ text: "OK" }]
        );
        setError(`Phone number ${cleanPhone} is already registered. Please use another mobile number.`);
      } else {
        setError(msg);
        Alert.alert("Registration Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to continue</Text>

          {referralCode ? (
            <View style={styles.referralBadge}>
              <Ionicons name="gift-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.referralBadgeText}>Referral Code Applied: {referralCode}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError("");
              }}
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
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError("");
              }}
              editable={!loading}
              style={[styles.input, loading && styles.disabledInput]}
              placeholder="Email Address"
              placeholderTextColor={Colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
          </View>

          <View style={[styles.inputContainer, { marginTop: 6 }]}>
            <TextInput
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (error) setError("");
              }}
              editable={!loading}
              style={[styles.input, loading && styles.disabledInput]}
              placeholder="Mobile Phone Number (10 digits)"
              placeholderTextColor={Colors.placeholder}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <Text style={styles.roleLabel}>I want to register as a</Text>
          
          <View style={styles.roleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={loading}
              style={[styles.roleCard, selectedRole === "CUSTOMER" && styles.selectedRoleCard]}
              onPress={() => {
                setSelectedRole("CUSTOMER");
                if (error) setError("");
              }}
            >
              <View style={[styles.radio, selectedRole === "CUSTOMER" && styles.selectedRadio]}>
                {selectedRole === "CUSTOMER" && <Text style={styles.radioDot}>✓</Text>}
              </View>
              <Text style={[styles.roleText, selectedRole === "CUSTOMER" && styles.selectedRoleText]}>
                Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={loading}
              style={[styles.roleCard, selectedRole === "ARTIST" && styles.selectedRoleCard]}
              onPress={() => {
                setSelectedRole("ARTIST");
                if (error) setError("");
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
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.registerText}>Sign Up & Send OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            style={{ marginTop: 16, marginBottom: 20 }}
            onPress={() => {
              setError("");
              navigation.navigate("Login");
            }}
          >
            <Text style={styles.linkText}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 20,
  },
  title: { fontSize: 28, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 14, textAlign: "center" },
  referralBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    borderColor: Colors.primary,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  referralBadgeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  inputContainer: { height: 50, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 4, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  disabledInput: { opacity: 0.6, color: Colors.textSecondary },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginBottom: 8, textAlign: "center" },
  roleLabel: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8, marginTop: 8 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  roleCard: { flex: 1, height: 50, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: Colors.inputBackground },
  selectedRoleCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "20" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, justifyContent: "center", alignItems: "center", marginRight: 8 },
  selectedRadio: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioDot: { color: Colors.white, fontWeight: "700", fontSize: 11 },
  roleText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  selectedRoleText: { color: Colors.primary, fontWeight: "700" },
  registerButton: { height: 50, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 8 },
  disabledButton: { opacity: 0.7 },
  registerText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", marginBottom: 8, marginTop: 4 },
});
