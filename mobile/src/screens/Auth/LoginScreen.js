import React, { useEffect, useState } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { sendOtp } from "../../services/auth";

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState(route?.params?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (route?.params?.email) {
      setEmail(route.params.email);
    }
  }, [route?.params?.email]);

  const handleContinue = async () => {
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

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
      const res = await sendOtp(trimmedEmail);
      const data = res?.data || res;

      if (data) {
        if (global.showToast) {
          global.showToast(`Verification code sent to ${trimmedEmail}`, "success");
        }
        navigation.navigate("Otp", {
          email: trimmedEmail,
          role: data.role || "USER",
          isRegistering: false,
          flow: "LOGIN",
        });
      }
    } catch (e) {
      if (__DEV__) console.log("Send OTP Error:", e);
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "";
      
      if (
        status === 404 ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("please register") ||
        msg.toLowerCase().includes("register first")
      ) {
        // Direct seamless navigation to Register screen
        navigation.navigate("Register", { email: trimmedEmail });
      } else {
        setError(msg || "Failed to proceed. Please try again.");
        if (global.showToast) {
          global.showToast(msg || "Failed to proceed. Please try again.", "error");
        }
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
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>MehndiGo</Text>
          <Text style={styles.subtitle}>Enter your email address to continue</Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={100} 
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

          <TouchableOpacity
            style={{ marginTop: 20, marginBottom: 20 }}
            onPress={() => {
              const trimmedEmail = email.trim().toLowerCase();
              setError("");
              navigation.navigate("Register", { email: trimmedEmail });
            }}
          >
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    justifyContent: "center",
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  title: { fontSize: 30, fontWeight: "700", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, marginBottom: 25, textAlign: "center" },
  inputContainer: { height: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, marginBottom: 8, backgroundColor: Colors.inputBackground },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  errorText: { color: Colors.error || "#FF3B30", fontSize: 13, marginBottom: 8, marginLeft: 4, textAlign: "center", fontWeight: "500" },
  loginButton: { height: 55, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 6 },
  disabledButton: { opacity: 0.7 },
  loginText: { color: Colors.white, fontWeight: "700", fontSize: 16 },
  linkText: { color: Colors.primary, textAlign: "center", fontWeight: "600", fontSize: 14 },
});
