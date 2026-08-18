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
          <Ionicons name="receipt-outline" size={16} color="#701DDB" style={{ marginRight: 6 }} />
          <Text style={styles.titleText}>Payment Summary</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            isFullyPaid ? styles.statusPillPaid : styles.statusPillPending
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              isFullyPaid ? styles.statusPillTextPaid : styles.statusPillTextPending
            ]}
          >
            {isFullyPaid ? "FULLY PAID" : paymentStatus === "PARTIAL" ? "10% ADVANCE PAID" : "PAYMENT PENDING"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Line Items */}
      <View style={styles.row}>
        <Text style={styles.label}>Service Amount</Text>
        <Text style={styles.value}>₹{totalAmount + discountAmount - travelCharge}</Text>
      </View>

      {discountAmount > 0 && (
        <View style={styles.row}>
          <View style={styles.discountLabelRow}>
            <Ionicons name="pricetag" size={12} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.discountLabel}>
              Coupon Discount {booking.coupon_code ? `(${booking.coupon_code})` : ""}
            </Text>
          </View>
          <Text style={styles.discountValue}>- ₹{discountAmount}</Text>
        </View>
      )}

      {travelCharge > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Travel Allowance</Text>
          <Text style={styles.value}>+ ₹{travelCharge}</Text>
        </View>
      )}

      <View style={styles.dividerLight} />

      {/* Advance Paid Deposit */}
      <View style={styles.row}>
        <View style={styles.advanceRow}>
          <Text style={styles.labelBold}>10% Advance Deposit</Text>
          <View style={styles.escrowBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#059669" />
            <Text style={styles.escrowBadgeText}>Escrow Protected</Text>
          </View>
        </View>
        <Text style={[styles.valueBold, { color: "#059669" }]}>
          ₹{advanceAmount} {paymentStatus !== "PENDING" ? "(Paid)" : "(Due)"}
        </Text>
      </View>

      {/* Remaining Amount */}
      <View style={styles.row}>
        <Text style={styles.labelBold}>Remaining Balance</Text>
        <Text style={[styles.valueBold, { color: remainingAmount > 0 ? "#DC2626" : "#059669" }]}>
          ₹{remainingAmount} {isFullyPaid ? "(Settled)" : "(Pay After Service)"}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Final Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Booking Amount</Text>
        <Text style={styles.totalValue}>₹{totalAmount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center"
  },
  titleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1
  },
  statusPillPaid: {
    backgroundColor: "#D1FAE5",
    borderColor: "#A7F3D0"
  },
  statusPillPending: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A"
  },
  statusPillText: {
    fontSize: 10,
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
    marginVertical: 12
  },
  dividerLight: {
    height: 1,
    backgroundColor: "#F9FAFB",
    marginVertical: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  label: {
    fontSize: 13,
    color: "#6B7280"
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#212121"
  },
  discountLabelRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  discountLabel: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "600"
  },
  discountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669"
  },
  advanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  escrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2
  },
  escrowBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669"
  },
  labelBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  valueBold: {
    fontSize: 13,
    fontWeight: "800"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121"
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#E91E63"
  }
});
