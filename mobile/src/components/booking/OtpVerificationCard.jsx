import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return "registered email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}***@${domain}`;
};

export default function OtpVerificationCard({
  otpCode,
  customerEmail = null,
  isArtist = false,
  onVerify,
  onGenerate,
  onResend,
  loading = false,
  otpType = "CHECKIN", // "CHECKIN" or "CHECKOUT"
  errorMessage = null
}) {
  const [enteredOtp, setEnteredOtp] = useState("");

  const isCheckIn = otpType === "CHECKIN";
  const title = isCheckIn ? "Check-In PIN Sent to Email" : "Completion PIN Sent to Email";

  // CUSTOMER VIEW: Display Email Notification (No raw OTP digits/popup on app)
  if (!isArtist) {
    const masked = maskEmail(customerEmail);

    return (
      <View style={[styles.customerCard, !isCheckIn && styles.customerCardCheckout]}>
        <View style={styles.headerRow}>
          <View style={[styles.customerIconCircle, !isCheckIn && styles.customerIconCircleCheckout]}>
            <Ionicons name={isCheckIn ? "mail" : "mail-open"} size={18} color={isCheckIn ? "#059669" : "#701DDB"} />
          </View>
          <View style={styles.headerTextContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.customerTitle, !isCheckIn && styles.customerTitleCheckout]} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.statusBadge, !isCheckIn && styles.statusBadgeCheckout]}>
                <View style={[styles.pulseDot, !isCheckIn && styles.pulseDotCheckout]} />
                <Text style={[styles.statusBadgeText, !isCheckIn && styles.statusBadgeTextCheckout]}>EMAIL SENT</Text>
              </View>
            </View>
            <Text style={[styles.customerSubtitle, !isCheckIn && styles.customerSubtitleCheckout]} numberOfLines={2}>
              {isCheckIn
                ? "A 4-digit Check-In PIN has been sent to your email. Share it with your specialist upon arrival."
                : "A 4-digit Service Completion PIN has been sent to your email. Share it once the service is complete."}
            </Text>
          </View>
        </View>

        {/* Email Inbox Info Box */}
        <View style={[styles.emailInfoBox, !isCheckIn && styles.emailInfoBoxCheckout]}>
          <View style={styles.emailRow}>
            <Ionicons name="at-circle" size={15} color={isCheckIn ? "#059669" : "#701DDB"} style={{ marginRight: 6 }} />
            <Text style={[styles.emailAddressText, !isCheckIn && styles.emailAddressTextCheckout]} numberOfLines={1}>
              {customerEmail ? `Sent to: ${masked}` : "Sent to your registered email inbox"}
            </Text>
          </View>
          <Text style={[styles.emailHintText, !isCheckIn && styles.emailHintTextCheckout]}>
            {isCheckIn
              ? "Please check your inbox for the email with your 4-digit Check-In PIN."
              : "Please check your inbox for the email with your 4-digit Service Completion PIN."}
          </Text>
        </View>

        {/* Action & Resend Bar */}
        <View style={styles.footerRow}>
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={13} color={isCheckIn ? "#059669" : "#701DDB"} />
            <Text style={[styles.securityText, !isCheckIn && { color: "#5B21B6" }]} numberOfLines={1}>
              {isCheckIn ? "Share only when artist arrives at doorstep" : "Share only after mehndi application finishes"}
            </Text>
          </View>

          {(onResend || onGenerate) && (
            <TouchableOpacity
              style={[styles.resendBtn, !isCheckIn && styles.resendBtnCheckout]}
              onPress={onResend || onGenerate}
              disabled={loading}
              activeOpacity={0.75}
            >
              {loading ? (
                <ActivityIndicator size="small" color={isCheckIn ? "#059669" : "#701DDB"} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={12} color={isCheckIn ? "#059669" : "#701DDB"} style={{ marginRight: 4 }} />
                  <Text style={[styles.resendBtnText, !isCheckIn && { color: "#701DDB" }]}>Resend Email</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ARTIST VIEW: Input OTP provided by customer (4-digit PIN)
  const isComplete = enteredOtp.trim().length === 4;

  const handleVerify = () => {
    if (isComplete && onVerify) {
      onVerify(enteredOtp.trim(), otpType);
    }
  };

  const isVerifyDisabled = !isComplete || loading;

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
              ? "Ask the customer for their 4-digit PIN received on their registered email."
              : "Ask the customer for their 4-digit Completion PIN received on their registered email."}
          </Text>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.otpInput, errorMessage && styles.otpInputError]}
          value={enteredOtp}
          onChangeText={(val) => setEnteredOtp(val.replace(/[^0-9]/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="••••"
          placeholderTextColor="#9CA3AF"
          textAlign="center"
          autoFocus={true}
        />
        <View style={styles.pinHelperRow}>
          <Ionicons name="mail-outline" size={12} color="#64748B" />
          <Text style={styles.pinHelperText}>
            {isCheckIn
              ? "Customer received 4-digit PIN in their email inbox"
              : "Customer received 4-digit Completion PIN in their email"}
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
              {isCheckIn ? "Verify PIN & Start Service" : "Verify PIN & Complete Booking"}
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
  customerCardCheckout: {
    backgroundColor: "#FAF5FF",
    borderColor: "#DDD6FE",
    shadowColor: "#701DDB"
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  customerIconCircleCheckout: {
    backgroundColor: "#EDE9FE"
  },
  artistIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    fontSize: 13.5,
    fontWeight: "800",
    color: "#065F46"
  },
  customerTitleCheckout: {
    color: "#4C1D95"
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6EE7B7"
  },
  statusBadgeCheckout: {
    backgroundColor: "#EDE9FE",
    borderColor: "#C4B5FD"
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
    marginRight: 4
  },
  pulseDotCheckout: {
    backgroundColor: "#7C3AED"
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#065F46",
    letterSpacing: 0.4
  },
  statusBadgeTextCheckout: {
    color: "#5B21B6"
  },
  customerSubtitle: {
    fontSize: 11,
    color: "#047857",
    marginTop: 3,
    lineHeight: 15
  },
  customerSubtitleCheckout: {
    color: "#6D28D9"
  },
  emailInfoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  emailInfoBoxCheckout: {
    borderColor: "#DDD6FE"
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3
  },
  emailAddressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    flex: 1
  },
  emailAddressTextCheckout: {
    color: "#4C1D95"
  },
  emailHintText: {
    fontSize: 10.5,
    color: "#059669",
    lineHeight: 14
  },
  emailHintTextCheckout: {
    color: "#6D28D9"
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1
  },
  securityText: {
    fontSize: 10.5,
    color: "#047857",
    fontWeight: "600",
    flex: 1
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6EE7B7"
  },
  resendBtnCheckout: {
    backgroundColor: "#EDE9FE",
    borderColor: "#C4B5FD"
  },
  resendBtnText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "800"
  },
  inputWrapper: {
    alignItems: "center",
    marginVertical: 8
  },
  otpInput: {
    width: "100%",
    maxWidth: 260,
    height: 52,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 8,
    textAlign: "center"
  },
  otpInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2"
  },
  pinHelperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4
  },
  pinHelperText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500"
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 6
  },
  errorText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1
  },
  verifyBtn: {
    backgroundColor: "#701DDB",
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  verifyBtnDisabled: {
    backgroundColor: "#C4B5FD",
    shadowOpacity: 0
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.3
  }
});
