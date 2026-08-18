import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function OtpVerificationCard({
  otpCode,
  isArtist = false,
  onVerify,
  loading = false,
  otpType = "CHECKIN", // "CHECKIN" or "CHECKOUT"
  errorMessage = null
}) {
  const [enteredOtp, setEnteredOtp] = useState("");

  const isCheckIn = otpType === "CHECKIN";
  const title = isCheckIn ? "Service Check-In OTP" : "Service Completion OTP";

  // CUSTOMER VIEW: Display OTP to be shared with artist
  if (!isArtist) {
    const pin = otpCode || "••••";
    return (
      <View style={styles.customerCard}>
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={18} color="#059669" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.customerTitle}>{title}</Text>
            <Text style={styles.customerSubtitle}>
              {isCheckIn
                ? "Share this 4-digit OTP with your artist upon arrival to begin the service."
                : "Share this OTP with your artist to confirm service completion."}
            </Text>
          </View>
        </View>

        <View style={styles.pinContainer}>
          {String(pin).split("").map((digit, idx) => (
            <View key={idx} style={styles.pinBox}>
              <Text style={styles.pinDigit}>{digit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={13} color="#059669" />
          <Text style={styles.securityText}>
            Never share this OTP before the artist arrives at your doorstep.
          </Text>
        </View>
      </View>
    );
  }

  // ARTIST VIEW: Input OTP provided by customer
  const handleVerify = () => {
    if (enteredOtp.trim().length === 4 && onVerify) {
      onVerify(enteredOtp.trim());
    }
  };

  return (
    <View style={styles.artistCard}>
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: "#EDE9FE" }]}>
          <Ionicons name="checkmark-done-circle" size={20} color="#701DDB" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.artistTitle}>Enter Customer OTP</Text>
          <Text style={styles.artistSubtitle}>
            {isCheckIn
              ? "Ask the customer for their 4-digit check-in PIN to start service."
              : "Enter the completion PIN to finalize service."}
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.otpInput}
        value={enteredOtp}
        onChangeText={(val) => setEnteredOtp(val.replace(/[^0-9]/g, "").slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="4-digit PIN"
        placeholderTextColor="#9CA3AF"
        textAlign="center"
        autoFocus={false}
      />

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.verifyBtn,
          (enteredOtp.length !== 4 || loading) && styles.verifyBtnDisabled
        ]}
        onPress={handleVerify}
        disabled={enteredOtp.length !== 4 || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.verifyBtnText}>Verify OTP & Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  artistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#701DDB",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1
  },
  customerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#065F46"
  },
  customerSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
    lineHeight: 16
  },
  artistTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121"
  },
  artistSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: 12
  },
  pinBox: {
    width: 52,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  pinDigit: {
    fontSize: 24,
    fontWeight: "900",
    color: "#065F46",
    letterSpacing: 2
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 6
  },
  securityText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "600"
  },
  otpInput: {
    height: 52,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    fontSize: 22,
    fontWeight: "800",
    color: "#212121",
    letterSpacing: 8,
    marginVertical: 10
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8
  },
  verifyBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center"
  },
  verifyBtnDisabled: {
    backgroundColor: "#9CA3AF"
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
