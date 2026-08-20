import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BookingAmountCard({ booking }) {
  if (!booking) return null;

  const totalAmount = Number(booking.total_amount || booking.final_amount || 0);
  const advanceAmount = Number(booking.advance_amount || booking.advance_paid || Math.round(totalAmount * 0.10));
  const remainingAmount = Number(booking.remaining_amount !== undefined ? booking.remaining_amount : (totalAmount - advanceAmount));
  const travelCharge = Number(booking.travel_charge || 0);
  const discountAmount = Number(booking.discount_amount || booking.coupon_discount || 0);
  const paymentStatus = String(booking.payment_status || "PENDING").toUpperCase();

  const isFullyPaid = paymentStatus === "PAID" || remainingAmount === 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconBox}>
            <Ionicons name="receipt" size={13} color="#701DDB" />
          </View>
          <Text style={styles.titleText} numberOfLines={1}>Payment Summary</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            isFullyPaid ? styles.statusPillPaid : styles.statusPillPending
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isFullyPaid ? "#059669" : "#D97706" }
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              isFullyPaid ? styles.statusPillTextPaid : styles.statusPillTextPending
            ]}
            numberOfLines={1}
          >
            {isFullyPaid ? "FULLY PAID" : paymentStatus === "PARTIAL" ? "10% ADVANCE PAID" : "PENDING"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Line Items */}
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>Service Charge</Text>
        <Text style={styles.value}>₹{(totalAmount + discountAmount - travelCharge).toLocaleString("en-IN")}</Text>
      </View>

      {discountAmount > 0 && (
        <View style={styles.row}>
          <View style={styles.discountLabelRow}>
            <Ionicons name="pricetag" size={11} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.discountLabel} numberOfLines={1}>
              Coupon {booking.coupon_code ? `(${booking.coupon_code})` : "Discount"}
            </Text>
          </View>
          <Text style={styles.discountValue}>- ₹{discountAmount.toLocaleString("en-IN")}</Text>
        </View>
      )}

      {travelCharge > 0 && (
        <View style={styles.row}>
          <View style={styles.travelRow}>
            <Ionicons name="car-outline" size={12} color="#701DDB" style={{ marginRight: 4 }} />
            <Text style={styles.label} numberOfLines={1}>Travel Allowance</Text>
          </View>
          <Text style={styles.value}>+ ₹{travelCharge.toLocaleString("en-IN")}</Text>
        </View>
      )}

      <View style={styles.dividerLight} />

      {/* Advance Paid Deposit */}
      <View style={styles.row}>
        <View style={styles.advanceRow}>
          <Text style={styles.labelBold} numberOfLines={1}>10% Advance</Text>
          <View style={styles.escrowBadge}>
            <Ionicons name="shield-checkmark" size={9} color="#059669" />
            <Text style={styles.escrowBadgeText}>Escrow</Text>
          </View>
        </View>
        <Text style={[styles.valueBold, { color: "#059669" }]} numberOfLines={1}>
          ₹{advanceAmount.toLocaleString("en-IN")} {paymentStatus !== "PENDING" ? "(Paid)" : "(Due)"}
        </Text>
      </View>

      {/* Remaining Amount */}
      <View style={styles.row}>
        <Text style={styles.labelBold} numberOfLines={1}>Remaining Balance</Text>
        <Text style={[styles.valueBold, { color: remainingAmount > 0 ? "#DC2626" : "#059669" }]} numberOfLines={1}>
          ₹{remainingAmount.toLocaleString("en-IN")} {isFullyPaid ? "(Settled)" : "(Pay at End)"}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Final Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel} numberOfLines={1}>Total Amount</Text>
        <View style={styles.totalValueContainer}>
          <Text style={styles.totalCurrency}>₹</Text>
          <Text style={styles.totalValue}>{totalAmount.toLocaleString("en-IN")}</Text>
        </View>
      </View>
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
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    flex: 1
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    flexShrink: 0
  },
  titleText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 1
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    gap: 4,
    flexShrink: 0
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  statusPillPaid: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  statusPillPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A"
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  statusPillTextPaid: {
    color: "#065F46"
  },
  statusPillTextPending: {
    color: "#92400E"
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 10
  },
  dividerLight: {
    height: 1,
    backgroundColor: "#F9FAFB",
    marginVertical: 6
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
    flexShrink: 1
  },
  value: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    flexShrink: 0
  },
  discountLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1
  },
  discountLabel: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "700",
    flexShrink: 1
  },
  discountValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#059669",
    flexShrink: 0
  },
  travelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1
  },
  advanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    flexShrink: 1
  },
  escrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    gap: 2,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    flexShrink: 0
  },
  escrowBadgeText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#059669"
  },
  labelBold: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#1F2937",
    flexShrink: 1
  },
  valueBold: {
    fontSize: 12.5,
    fontWeight: "800",
    flexShrink: 0
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1F2937",
    flexShrink: 1
  },
  totalValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0
  },
  totalCurrency: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#E91E63",
    marginRight: 2
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#E91E63"
  }
});
