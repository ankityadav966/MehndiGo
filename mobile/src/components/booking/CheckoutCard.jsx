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
  const paymentMethod = String(booking.payment_method || "").toLowerCase();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="card-outline" size={18} color="#DC2626" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.titleText}>
            {isArtist ? "Final Settlement Breakdown" : "Service Completed — Payment Required"}
          </Text>
          <Text style={styles.subtitleText}>
            {isArtist
              ? "Verify the balance collection before finalizing the booking."
              : "Please complete the remaining balance to finalize your service."}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Total Service Charge</Text>
        <Text style={styles.value}>₹{totalAmount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Advance Deposit Credited</Text>
        <Text style={[styles.value, { color: "#059669" }]}>- ₹{advanceAmount}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.dueRow}>
        <View>
          <Text style={styles.dueLabel}>Remaining Balance Due</Text>
          <Text style={styles.dueSublabel}>
            {paymentMethod === "cash" ? "Selected Cash Payment" : "Online / Cash Payment"}
          </Text>
        </View>
        <Text style={styles.dueValue}>₹{remainingAmount}</Text>
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
              <Ionicons name="cash-outline" size={16} color="#212121" />
              <Text style={styles.secondaryBtnText}>Pay Cash</Text>
            </TouchableOpacity>
          )}

          {onPayOnline && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onPayOnline}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="card" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Pay Online (₹{remainingAmount})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Artist Action Buttons */}
      {isArtist && (
        <View style={styles.artistActionContainer}>
          {onConfirmCash && (
            <TouchableOpacity
              style={styles.confirmCashBtn}
              onPress={onConfirmCash}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmCashBtnText}>Confirm Cash Received (₹{remainingAmount})</Text>
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FEE2E2",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center"
  },
  headerTextContainer: {
    marginLeft: 10,
    flex: 1
  },
  titleText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121"
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
    marginBottom: 6
  },
  label: {
    fontSize: 12,
    color: "#6B7280"
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
    color: "#212121"
  },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCE7F3"
  },
  dueLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#212121"
  },
  dueSublabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 1
  },
  dueValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#DC2626"
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    height: 46,
    borderRadius: 12,
    gap: 6
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E91E63",
    height: 46,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  artistActionContainer: {
    marginTop: 14
  },
  confirmCashBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    height: 48,
    borderRadius: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  confirmCashBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
