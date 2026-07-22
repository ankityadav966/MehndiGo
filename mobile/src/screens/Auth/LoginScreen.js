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
import { sendOtp, registerSendOtp } from "../../services/auth";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [role, setRole] = useState("USER");
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
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
      const res = await sendOtp(trimmedEmail, undefined);
      const data = res?.data || res;

      if (data.exists) {
        const otp = data.otp ? String(data.otp) : "";
        Alert.alert("Verification OTP", `OTP has been sent to your email. (Dev code: ${otp})`);
        navigation.navigate("Otp", {
          email: trimmedEmail,
          role: data.role || "USER",
          isRegistering: false,
          otp,
        });
      } else {
        setShowRegistration(true);
        Alert.alert("Create Account", "This email address is not registered. Please enter your details below to sign up.");
      }
    } catch (e) {
      console.log("Send OTP Error:", e);
      const msg = e?.response?.data?.message || e.message || "";
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("register")) {
        setShowRegistration(true);
        Alert.alert("Create Account", "This email address is not registered. Please enter your details below to sign up.");
      } else {
        setError(msg || "Failed to proceed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();


    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const res = await registerSendOtp(trimmedName, trimmedEmail, null, role);
      const data = res?.data || res;
      const otp = data.otp ? String(data.otp) : "";

      Alert.alert("Verification OTP", `OTP has been sent to your email. (Dev code: ${otp})`);
      navigation.navigate("Otp", {
        email: trimmedEmail,
        role,
        isRegistering: true,
        otp,
      });
    } catch (e) {
      console.log("Register Send OTP Error:", e);
      setError(e?.response?.data?.message || e.message || "Failed to send registration OTP. Please try again.");
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
        <Text style={styles.subtitle}>
          {showRegistration
            ? "Complete your profile to register"
            : "Enter your email address to continue"}
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            editable={!showRegistration}
            style={[styles.input, showRegistration && styles.disabledInput]}
            placeholder="Email Address"
            placeholderTextColor={Colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
          />
        </View>

        {showRegistration && (
          <>
            <View style={[styles.inputContainer, { marginTop: 8 }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.placeholder}
                maxLength={50}
              />
            </View>


            <Text style={styles.roleLabel}>I want to register as a</Text>
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
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          onPress={() => {
            setShowRegistration(!showRegistration);
            setName("");

            setError("");
          }}
        >
          <Text style={styles.linkText}>
            {showRegistration
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={showRegistration ? handleRegister : handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.loginText}>
              {showRegistration ? "Create Account" : "Continue"}
            </Text>
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
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: { fontSize: 30, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 25, textAlign: "center" },
  inputContainer: { height: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 4, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  disabledInput: { opacity: 0.6, color: Colors.textSecondary },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 12, marginBottom: 12, marginLeft: 4, textAlign: "center" },
  roleLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 12, marginTop: 12 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleCard: { flex: 1, height: 56, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, backgroundColor: Colors.inputBackground },
  selectedRoleCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "20" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.border, justifyContent: "center", alignItems: "center", marginRight: 10 },
  selectedRadio: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radioDot: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  roleText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  selectedRoleText: { color: Colors.primary, fontWeight: "700" },
  loginButton: { height: 55, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 15 },
  disabledButton: { opacity: 0.7 },
  loginText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", marginBottom: 12, marginTop: 5 },
});
