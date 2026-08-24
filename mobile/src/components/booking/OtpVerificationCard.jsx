import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const maskEmail = (email) => {
  if (!email || typeof email !== "string" || !email.includes("@")) return "your registered email inbox";
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
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const isCheckIn = otpType === "CHECKIN";
  const title = isCheckIn ? "Check-In PIN Sent to Email" : "Completion PIN Sent to Email";

  // =========================================================================
  // 1. CUSTOMER VIEW: Display Email Notification ONLY (NO Resend Button on App)
  // =========================================================================
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

        {/* Security Notice Footer (No Resend Button for Customer) */}
        <View style={styles.footerRow}>
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={13} color={isCheckIn ? "#059669" : "#701DDB"} />
            <Text style={[styles.securityText, !isCheckIn && { color: "#5B21B6" }]} numberOfLines={1}>
              {isCheckIn ? "Share only when artist arrives at doorstep" : "Share only after mehndi application finishes"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // =========================================================================
  // 2. ARTIST VIEW: 4-digit PIN Input + Exclusive Resend PIN Button for Artist
  // =========================================================================
  const isComplete = enteredOtp.trim().length === 4;

  const handleVerify = () => {
    if (isComplete && onVerify) {
      onVerify(enteredOtp.trim(), otpType);
    }
  };

  const handleArtistResend = () => {
    if (resendCooldown > 0 || loading) return;
    if (onResend || onGenerate) {
      const fn = onResend || onGenerate;
      fn();
      setResendCooldown(60);
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
              ? "Ask the customer for the 4-digit PIN received on their registered email."
              : "Ask the customer for the 4-digit Completion PIN received on their registered email."}
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

      {/* Artist-Exclusive Resend Button */}
      {(onResend || onGenerate) && (
        <View style={styles.artistResendRow}>
          <TouchableOpacity
            style={[styles.artistResendBtn, resendCooldown > 0 && styles.artistResendBtnDisabled]}
            onPress={handleArtistResend}
            disabled={resendCooldown > 0 || loading}
            activeOpacity={0.75}
          >
            <Ionicons
              name="paper-plane-outline"
              size={13}
              color={resendCooldown > 0 ? "#94A3B8" : "#701DDB"}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.artistResendBtnText, resendCooldown > 0 && { color: "#94A3B8" }]}>
              {resendCooldown > 0
                ? `Resend Email (${resendCooldown}s)`
                : isCheckIn
                ? "Resend Check-In PIN to Customer Email"
                : "Resend Completion PIN to Customer Email"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    alignItems: "center"
  },
  customerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  customerIconCircleCheckout: {
    backgroundColor: "#EDE9FE"
  },
  artistIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  headerTextContainer: {
    flex: 1
  },
  customerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46"
  },
  customerTitleCheckout: {
    color: "#5B21B6"
  },
  artistTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B"
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8
  },
  statusBadgeCheckout: {
    backgroundColor: "#EDE9FE"
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
    marginRight: 4
  },
  pulseDotCheckout: {
    backgroundColor: "#701DDB"
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46"
  },
  statusBadgeTextCheckout: {
    color: "#5B21B6"
  },
  customerSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
    lineHeight: 16
  },
  customerSubtitleCheckout: {
    color: "#6D28D9"
  },
  artistSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16
  },
  emailInfoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5"
  },
  emailInfoBoxCheckout: {
    borderColor: "#EDE9FE"
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  emailAddressText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46"
  },
  emailAddressTextCheckout: {
    color: "#5B21B6"
  },
  emailHintText: {
    fontSize: 11,
    color: "#059669",
    lineHeight: 15
  },
  emailHintTextCheckout: {
    color: "#7C3AED"
  },
  footerRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(5, 150, 105, 0.15)"
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center"
  },
  securityText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
    marginLeft: 4
  },
  inputWrapper: {
    marginTop: 12,
    alignItems: "center"
  },
  otpInput: {
    width: "100%",
    height: 48,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 10,
    color: "#0F172A",
    textAlign: "center"
  },
  otpInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2"
  },
  pinHelperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  pinHelperText: {
    fontSize: 11,
    color: "#64748B",
    marginLeft: 4
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  errorText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B91C1C",
    marginLeft: 6,
    flex: 1
  },
  verifyBtn: {
    flexDirection: "row",
    height: 46,
    backgroundColor: "#701DDB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3
  },
  verifyBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  artistResendRow: {
    marginTop: 10,
    alignItems: "center"
  },
  artistResendBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3E8FF"
  },
  artistResendBtnDisabled: {
    backgroundColor: "#F1F5F9"
  },
  artistResendBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#701DDB"
  }
});
