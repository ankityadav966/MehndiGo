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
  checkinOtp = null,
  checkoutOtp = null,
  customerEmail = null,
  isArtist = false,
  onVerify,
  onGenerate,
  onResend,
  loading = false,
  otpType = "CHECKIN", // "CHECKIN" or "CHECKOUT"
  errorMessage = null,
  isCheckInVerified = false,
  isServiceActive = false,
  isCheckout = false,
  isPending = false,
  isAccepted = false
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

  // =========================================================================
  // 1. CUSTOMER VIEW: Crystal-Clear Progressive PIN Lifecycle
  // =========================================================================
  if (!isArtist) {
    const masked = maskEmail(customerEmail);
    const resolvedCheckinOtp = checkinOtp || (!isCheckInVerified ? otpCode : null);
    const resolvedCheckoutOtp = checkoutOtp || (isCheckInVerified ? otpCode : null);

    // MODE A: Booking is Pending / Requested (Waiting for Artist Acceptance)
    if (isPending) {
      return (
        <View style={styles.pendingCustomerCard}>
          <View style={styles.headerRow}>
            <View style={styles.pendingIconCircle}>
              <Ionicons name="time" size={20} color="#D97706" />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.pendingTitle} numberOfLines={1}>
                  Awaiting Artist Acceptance
                </Text>
                <View style={styles.advanceBadge}>
                  <Text style={styles.advanceBadgeText}>10% ADVANCE PAID ✓</Text>
                </View>
              </View>
              <Text style={styles.pendingSubtitle}>
                Specialist is reviewing your booking request.
              </Text>
            </View>
          </View>

          <View style={styles.pendingNoticeBox}>
            <Ionicons name="information-circle" size={16} color="#B45309" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.pendingNoticeText}>
              Once the artist accepts your request, your <Text style={{ fontWeight: "700" }}>4-Digit Doorstep Check-In PIN</Text> will appear here and will be emailed to your inbox.
            </Text>
          </View>
        </View>
      );
    }

    // MODE B: Service Is Started / In Progress / Checkout (Completion PIN Active)
    if ((isCheckInVerified || isServiceActive || isCheckout) && resolvedCheckoutOtp) {
      const pinDigits = String(resolvedCheckoutOtp).split("");
      return (
        <View style={[styles.customerCard, styles.customerCardCheckout]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.customerIconCircle, styles.customerIconCircleCheckout]}>
              <Ionicons name="ribbon" size={20} color="#701DDB" />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.titleWithBadge}>
                <Text style={[styles.customerTitle, styles.customerTitleCheckout]} numberOfLines={1}>
                  Step 2: Service Completion PIN
                </Text>
                <View style={[styles.statusBadge, styles.statusBadgeCheckout]}>
                  <View style={[styles.pulseDot, styles.pulseDotCheckout]} />
                  <Text style={[styles.statusBadgeText, styles.statusBadgeTextCheckout]}>ACTIVE PIN</Text>
                </View>
              </View>
              <Text style={[styles.customerSubtitle, styles.customerSubtitleCheckout]} numberOfLines={2}>
                Share this PIN with your specialist ONLY AFTER mehndi application is fully finished.
              </Text>
            </View>
          </View>

          {/* 4-Digit Display Card */}
          <View style={styles.pinDisplayCardPurple}>
            <Text style={styles.pinDisplayLabelPurple}>YOUR 4-DIGIT COMPLETION PIN</Text>
            <View style={styles.pinDigitsRow}>
              {pinDigits.map((digit, idx) => (
                <View key={idx} style={styles.pinDigitTilePurple}>
                  <Text style={styles.pinDigitTextPurple}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.pinInstructionPurple}>
              Share this PIN with your specialist only after you are 100% satisfied with the completed design.
            </Text>
          </View>

          {/* Secure Email Delivery Info Box */}
          <View style={styles.emailInfoBoxPurple}>
            <View style={styles.emailRow}>
              <Ionicons name="mail-unread" size={16} color="#701DDB" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emailTitleTextPurple}>Also Dispatched to Email ✉️</Text>
                <Text style={styles.emailAddressTextPurple} numberOfLines={1}>
                  {masked}
                </Text>
              </View>
            </View>
          </View>

          {/* Step 1 Completed Status Bar */}
          <View style={styles.completedStepBar}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.completedStepText}>
              Step 1: Check-In Verified ✓ (Doorstep arrival confirmed)
            </Text>
          </View>
        </View>
      );
    }

    // MODE C: Artist Arrived (Check-In PIN Is Active!)
    if (resolvedCheckinOtp && !isCheckInVerified) {
      const pinDigits = String(resolvedCheckinOtp).split("");
      return (
        <View style={styles.customerCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.customerIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.customerTitle} numberOfLines={1}>
                  Step 1: Check-In PIN
                </Text>
                <View style={styles.statusBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.statusBadgeText}>SHARE AT DOORSTEP</Text>
                </View>
              </View>
              <Text style={styles.customerSubtitle} numberOfLines={2}>
                Share this 4-digit PIN with your artist when they arrive at your location to verify identity and start service.
              </Text>
            </View>
          </View>

          {/* 4-Digit Display Card */}
          <View style={styles.pinDisplayCardGreen}>
            <Text style={styles.pinDisplayLabelGreen}>YOUR 4-DIGIT CHECK-IN PIN</Text>
            <View style={styles.pinDigitsRow}>
              {pinDigits.map((digit, idx) => (
                <View key={idx} style={styles.pinDigitTileGreen}>
                  <Text style={styles.pinDigitTextGreen}>{digit}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.pinInstructionGreen}>
              Share this PIN in person when the specialist arrives at your doorstep.
            </Text>
          </View>

          {/* Secure Email Delivery Info Box */}
          <View style={styles.emailInfoBox}>
            <View style={styles.emailRow}>
              <Ionicons name="mail-unread" size={16} color="#059669" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emailTitleTextGreen}>Also Dispatched to Email ✉️</Text>
                <Text style={styles.emailAddressText} numberOfLines={1}>
                  {masked}
                </Text>
              </View>
            </View>
          </View>

          {/* Locked Upcoming Step 2 */}
          <View style={styles.lockedStepBar}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="lock-closed" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text style={styles.lockedStepTitle}>
                Step 2: Service Completion PIN
              </Text>
            </View>
            <Text style={styles.lockedStepDesc}>
              Will be activated automatically after specialist verifies Check-In and completes service.
            </Text>
          </View>
        </View>
      );
    }

    // Default: If no active OTP for the current state, return null so empty cards are never shown
    return null;
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
              ? "Ask the customer for the 4-digit PIN displayed on their app / email."
              : "Ask the customer for the 4-digit Completion PIN to finish booking."}
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
              ? "Customer received 4-digit PIN in their registered email inbox"
              : "Customer received 4-digit Completion PIN in their registered email inbox"}
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
  // Customer Pending State Card
  pendingCustomerCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2
  },
  pendingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E"
  },
  pendingSubtitle: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 16
  },
  advanceBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  advanceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309"
  },
  pendingNoticeBox: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "flex-start"
  },
  pendingNoticeText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 17,
    flex: 1
  },

  // Customer Check-In / Active Cards
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
    elevation: 2
  },
  customerCardCheckout: {
    backgroundColor: "#FAF5FF",
    borderColor: "#DDD6FE",
    shadowColor: "#701DDB"
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
  headerTextContainer: {
    flex: 1
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  customerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46"
  },
  customerTitleCheckout: {
    color: "#5B21B6"
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

  // 4-Digit Display Cards
  pinDisplayCardGreen: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#A7F3D0"
  },
  pinDisplayLabelGreen: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  pinDisplayCardPurple: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DDD6FE"
  },
  pinDisplayLabelPurple: {
    fontSize: 11,
    fontWeight: "800",
    color: "#701DDB",
    letterSpacing: 0.5,
    marginBottom: 8
  },
  pinDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginVertical: 4
  },
  pinDigitTileGreen: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#059669",
    justifyContent: "center",
    alignItems: "center"
  },
  pinDigitTextGreen: {
    fontSize: 22,
    fontWeight: "900",
    color: "#065F46"
  },
  pinDigitTilePurple: {
    width: 44,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FAF5FF",
    borderWidth: 1.5,
    borderColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center"
  },
  pinDigitTextPurple: {
    fontSize: 22,
    fontWeight: "900",
    color: "#5B21B6"
  },
  pinInstructionGreen: {
    fontSize: 11,
    color: "#047857",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 15
  },
  pinInstructionPurple: {
    fontSize: 11,
    color: "#6D28D9",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 15
  },

  // Notice & Status Bars
  emailInfoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D1FAE5"
  },
  emailInfoBoxPurple: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  emailTitleTextGreen: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 2
  },
  emailTitleTextPurple: {
    fontSize: 13,
    fontWeight: "800",
    color: "#5B21B6",
    marginBottom: 2
  },
  emailAddressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857"
  },
  emailAddressTextPurple: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6D28D9"
  },
  completedStepBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 9,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  completedStepText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    flex: 1
  },
  lockedStepBar: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  lockedStepTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B"
  },
  lockedStepDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
    lineHeight: 15
  },

  // Artist Card Styles
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
    elevation: 3
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
  artistTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B"
  },
  artistSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16
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
