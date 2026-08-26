import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function CheckoutCard({
  booking,
  isArtist = false,
  onPayOnline,
  onPayCash,
  onConfirmCash,
  loading = false
}) {
  if (!booking) return null;

  const totalAmount = Number(booking.total_amount || booking.final_amount || 0);
  const advanceAmount = Number(booking.advance_amount || booking.advance_paid || Math.round(totalAmount * 0.10));
  const remainingAmount = Number(booking.remaining_amount !== undefined ? booking.remaining_amount : (totalAmount - advanceAmount));
  const rawMode = String(booking.payment_mode || booking.payment_method || "").toUpperCase();
  const isCashChosen = rawMode === "CASH" || rawMode === "CASH_ON_DELIVERY";
  const isFullyPaid = String(booking.payment_status || "").toUpperCase() === "PAID" || remainingAmount <= 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt" size={16} color="#DC2626" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
            {isArtist ? "Final Settlement Breakdown" : "Payment Due"}
          </Text>
          <Text style={styles.subtitleText} numberOfLines={2}>
            {isArtist
              ? (isCashChosen
                  ? "Customer selected Cash. Confirm receipt after taking physical cash."
                  : "Customer can pay online via UPI/Card or hand over physical cash.")
              : "Please choose your preferred method to pay the remaining balance."}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Itemized Breakdown */}
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>Total Service Charge</Text>
        <Text style={styles.value}>₹{totalAmount.toLocaleString("en-IN")}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.advanceLabelRow}>
          <Ionicons name="shield-checkmark" size={11} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.label} numberOfLines={1}>Advance Deposit Credited</Text>
        </View>
        <Text style={[styles.value, { color: "#059669" }]}>- ₹{advanceAmount.toLocaleString("en-IN")}</Text>
      </View>

      <View style={styles.divider} />

      {/* Due Balance Highlight Box */}
      <View style={styles.dueRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.dueLabel} numberOfLines={1}>Remaining Balance</Text>
          <Text style={styles.dueSublabel} numberOfLines={1}>
            {isFullyPaid
              ? "Status: Fully Paid ✓"
              : isCashChosen
                ? "Status: Customer Selected Cash"
                : "Status: Awaiting Payment Selection"}
          </Text>
        </View>
        <View style={styles.dueValueContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.dueValue}>{remainingAmount.toLocaleString("en-IN")}</Text>
        </View>
      </View>

      {/* Customer Action Buttons */}
      {!isArtist && remainingAmount > 0 && (
        <View style={styles.btnRow}>
          {onPayCash && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onPayCash}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="cash-outline" size={15} color="#1F2937" />
              <Text style={styles.secondaryBtnText}>Pay Cash</Text>
            </TouchableOpacity>
          )}

          {onPayOnline && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onPayOnline}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="card" size={15} color="#FFFFFF" />
              <Text style={styles.primaryBtnText} numberOfLines={1}>Pay Online (₹{remainingAmount})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Artist Action Buttons */}
      {isArtist && remainingAmount > 0 && (
        <View style={styles.artistActionContainer}>
          {!isCashChosen && (
            <View style={styles.awaitingNoticeBox}>
              <Ionicons name="time-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.awaitingNoticeText}>
                Awaiting customer payment (Online UPI or Cash Handover)
              </Text>
            </View>
          )}

          {onConfirmCash && (
            <TouchableOpacity
              style={[styles.confirmCashBtn, !isCashChosen && { backgroundColor: "#059669" }]}
              onPress={onConfirmCash}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmCashBtnText} numberOfLines={1} ellipsizeMode="tail">
                {isCashChosen
                  ? `Confirm Cash Received (₹${remainingAmount.toLocaleString("en-IN")})`
                  : `Customer Paid Cash? Confirm Receipt (₹${remainingAmount.toLocaleString("en-IN")})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1
  },
  titleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937"
  },
  subtitleText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8
  },
  advanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1
  },
  label: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "500",
    flexShrink: 1
  },
  value: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F2937",
    flexShrink: 0
  },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#FCE7F3"
  },
  dueLabel: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1F2937"
  },
  dueSublabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500"
  },
  dueValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
    marginRight: 2
  },
  dueValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#DC2626"
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    height: 46,
    borderRadius: 12,
    gap: 4
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937"
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E91E63",
    height: 46,
    borderRadius: 12,
    gap: 4,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  artistActionContainer: {
    marginTop: 12
  },
  awaitingNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10
  },
  awaitingNoticeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#4B5563"
  },
  confirmCashBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  confirmCashBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flexShrink: 1
  }
});
