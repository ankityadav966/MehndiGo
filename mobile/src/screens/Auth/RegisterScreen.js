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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { sendOtp } from "../../services/auth";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [apiError, setApiError] = useState("");

  const handleRegister = async () => {
    setNameError("");
    setEmailError("");
    setMobileError("");
    setApiError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    let trimmedPhone = mobile.trim();
    if (trimmedPhone && !trimmedPhone.startsWith("+")) {
      trimmedPhone = `+91${trimmedPhone}`;
    }

    if (!trimmedName) {
      setNameError("Please enter your name");
      return;
    }

    if (!trimmedEmail) {
      setEmailError("Please enter your email");
      return;
    }

    if (!trimmedPhone || trimmedPhone.length < 10) {
      setMobileError("Please enter a valid mobile number");
      return;
    }

    setLoading(true);
    try {
      const otpRes = await sendOtp(trimmedName, trimmedEmail, trimmedPhone, role);
      const otp = otpRes?.data?.otp ? String(otpRes.data.otp) : "";
      navigation.navigate("Otp", {
        phone: trimmedPhone,
        name: trimmedName,
        email: trimmedEmail,
        role,
        otp,
      });
    } catch (error) {
      console.log("Register Screen sendOtp error:", error);
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to send OTP. Please try again.";
      setApiError(message);
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register to continue</Text>

        <View style={[styles.inputContainer, nameError ? styles.inputError : null]}>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setNameError("");
            }}
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={Colors.placeholder}
          />
        </View>
        {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

        <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
            }}
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={Colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <View style={[styles.inputContainer, mobileError ? styles.inputError : null]}>
          <TextInput
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              setMobileError("");
            }}
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor={Colors.placeholder}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}

        {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

        <Text style={styles.roleLabel}>I want to</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.roleCard,
              role === "USER" && styles.selectedRoleCard,
            ]}
            onPress={() => setRole("USER")}
          >
            <View
              style={[styles.radio, role === "USER" && styles.selectedRadio]}
            >
              {role === "USER" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text
              style={[
                styles.roleText,
                role === "USER" && styles.selectedRoleText,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.roleCard,
              role === "ARTIST" && styles.selectedRoleCard,
            ]}
            onPress={() => setRole("ARTIST")}
          >
            <View
              style={[styles.radio, role === "ARTIST" && styles.selectedRadio]}
            >
              {role === "ARTIST" && <Text style={styles.radioDot}>✓</Text>}
            </View>
            <Text
              style={[
                styles.roleText,
                role === "ARTIST" && styles.selectedRoleText,
              ]}
            >
              Mehendi Artist
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.registerText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.loginLink}>Already have an account? Login</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: { fontSize: 30, fontWeight: "700", color: Colors.text },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 35,
  },
  inputContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 4,
    backgroundColor: Colors.inputBackground,
  },
  inputError: {
    borderColor: Colors.error || "#FF3B30",
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  errorText: {
    color: Colors.error || "#FF3B30",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  roleCard: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: Colors.inputBackground,
  },
  selectedRoleCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + "20",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedRadio: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioDot: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  roleText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  selectedRoleText: { color: Colors.primary, fontWeight: "700" },
  registerButton: {
    height: 55,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: { opacity: 0.7 },
  registerText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  loginLink: {
    textAlign: "center",
    marginTop: 30,
    color: Colors.primary,
    fontWeight: "600",
  },
});
