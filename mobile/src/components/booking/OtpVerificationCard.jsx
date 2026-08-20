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
  const title = isCheckIn ? "Service Check-In PIN" : "Service Completion PIN";
  const requiredLength = isCheckIn ? 4 : 6;

  // CUSTOMER VIEW: Display OTP to be shared with artist
  if (!isArtist) {
    const rawPin = String(otpCode || "");
    const pin = rawPin.length > 0 ? rawPin : "•".repeat(requiredLength);
    return (
      <View style={styles.customerCard}>
        <View style={styles.headerRow}>
          <View style={styles.customerIconCircle}>
            <Ionicons name="key" size={16} color="#059669" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.customerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.customerSubtitle} numberOfLines={2}>
              {isCheckIn
                ? `Share this ${requiredLength}-digit security PIN with your artist upon arrival to begin service.`
                : `Share this ${requiredLength}-digit PIN with your artist to confirm successful service completion.`}
            </Text>
          </View>
        </View>

        <View style={styles.pinContainer}>
          {pin.split("").slice(0, requiredLength).map((digit, idx) => (
            <View key={idx} style={styles.pinBox}>
              <Text style={styles.pinDigit}>{digit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={13} color="#059669" />
          <Text style={styles.securityText} numberOfLines={1}>
            Protected Check-in: Share only when artist is present.
          </Text>
        </View>
      </View>
    );
  }

  // ARTIST VIEW: Input OTP provided by customer
  const handleVerify = () => {
    if (enteredOtp.trim().length >= 4 && onVerify) {
      onVerify(enteredOtp.trim());
    }
  };

  const isVerifyDisabled = enteredOtp.trim().length < 4 || loading;

  return (
    <View style={styles.artistCard}>
      <View style={styles.headerRow}>
        <View style={styles.artistIconCircle}>
          <Ionicons name={isCheckIn ? "shield-checkmark" : "ribbon"} size={18} color="#701DDB" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.artistTitle} numberOfLines={1} ellipsizeMode="tail">
            {isCheckIn ? "Customer Check-In PIN" : "Service Completion PIN"}
          </Text>
          <Text style={styles.artistSubtitle} numberOfLines={2}>
            {isCheckIn
              ? "Ask the customer for their 4-digit check-in PIN to start service."
              : "Ask the customer for their 6-digit completion PIN to finalize booking."}
          </Text>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.otpInput, errorMessage && styles.otpInputError]}
          value={enteredOtp}
          onChangeText={(val) => setEnteredOtp(val.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder={isCheckIn ? "••••" : "••••••"}
          placeholderTextColor="#CBD5E1"
          textAlign="center"
          autoFocus={false}
        />
        <View style={styles.pinHelperRow}>
          <Ionicons name="information-circle-outline" size={12} color="#6B7280" />
          <Text style={styles.pinHelperText} numberOfLines={1}>
            {`Enter ${isCheckIn ? "4" : "6"} digits displayed on customer's app`}
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.errorText} numberOfLines={2}>{errorMessage}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.verifyBtn,
          isVerifyDisabled && styles.verifyBtnDisabled
        ]}
        onPress={handleVerify}
        disabled={isVerifyDisabled}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.verifyBtnText} numberOfLines={1} ellipsizeMode="tail">
              {isCheckIn ? "Verify PIN & Start Service" : "Verify & Complete Booking"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  customerCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  artistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10
  },
  customerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  artistIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1
  },
  customerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46"
  },
  customerSubtitle: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 15
  },
  artistTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937"
  },
  artistSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15
  },
  pinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 10
  },
  pinBox: {
    width: 48,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  pinDigit: {
    fontSize: 22,
    fontWeight: "900",
    color: "#065F46",
    letterSpacing: 2
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 4
  },
  securityText: {
    fontSize: 10.5,
    color: "#065F46",
    fontWeight: "600"
  },
  inputWrapper: {
    marginVertical: 6
  },
  otpInput: {
    height: 50,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2937",
    letterSpacing: 10,
    paddingHorizontal: 14
  },
  otpInputError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2"
  },
  pinHelperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    gap: 4
  },
  pinHelperText: {
    fontSize: 10.5,
    color: "#6B7280",
    fontWeight: "500"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: 8,
    gap: 4
  },
  errorText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1
  },
  verifyBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 12,
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  verifyBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0
  },
  verifyBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flexShrink: 1
  }
});
