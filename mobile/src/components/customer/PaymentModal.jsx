import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OptimizedImage from "../OptimizedImage";
import Colors from "../../../constants/Colors";
import { resolveImage } from "../../../utils/imageHelper";

const PaymentModal = ({
  visible,
  booking,
  onClose,
  onPay,
  getModalBookingDate,
  getModalBookingTime,
  getModalPackageText
}) => {
  if (!booking) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Icon */}
          <View style={styles.modalHeaderIconContainer}>
            <Ionicons name="time-outline" size={30} color={Colors.primary} />
          </View>

          <Text style={styles.modalTitle}>Remaining Payment Pending</Text>
          <Text style={styles.modalSubtitle}>Please clear the remaining dues to complete your booking.</Text>

          <View style={{ width: "100%" }}>
            {/* Artist Info Card */}
            <View style={styles.modalArtistCard}>
              <OptimizedImage
                source={{ uri: resolveImage(booking.artist?.user?.profile_image) || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
                style={styles.modalArtistPhoto}
              />
              <View style={styles.modalArtistMeta}>
                <Text style={styles.modalArtistName}>
                  {booking.artist?.user?.name || booking.artist?.business_name || "Mehndi Specialist"}
                </Text>
                <Text style={styles.modalArtistCategory}>
                  {booking.service?.specialization_name || booking.service?.category || "Mehndi Specialist"}
                </Text>

                <View style={styles.modalArtistStats}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="star" size={13} color="#FFB800" />
                    <Text style={styles.modalStatItemText}>
                      {Number(booking.artist?.avg_rating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.modalDivider}>•</Text>
                  <Text style={styles.modalStatItemText}>
                    {booking.artist?.experience_years || 4} Yrs Exp
                  </Text>
                  <Text style={styles.modalDivider}>•</Text>
                  <Text style={styles.modalStatItemText} numberOfLines={1}>
                    {booking.artist?.city || booking.artist?.locality || "Jaipur"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Booking Info Card */}
            <View style={styles.modalBookingDetailsCard}>
              <View style={styles.modalDetailRow}>
                <Ionicons name="receipt-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.modalDetailLabel}>Booking ID:</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>
                  #{booking.booking_code || (`MG-${String(booking.id).padStart(6, "0")}`)}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.modalDetailLabel}>Date & Time:</Text>
                <Text style={styles.modalDetailValue}>
                  {(() => {
                    const dateStr = getModalBookingDate ? getModalBookingDate(booking) : null;
                    const timeStr = getModalBookingTime ? getModalBookingTime(booking) : null;
                    if (dateStr && timeStr) return `${dateStr} at ${timeStr}`;
                    if (dateStr) return dateStr;
                    if (timeStr) return timeStr;
                    return "Confirmed Schedule";
                  })()}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Ionicons name="flower-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.modalDetailLabel}>Service:</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>
                  {booking.service?.specialization_name || booking.selected_art_title || "Mehndi Service"}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Ionicons name="ribbon-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.modalDetailLabel}>Package:</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>
                  {getModalPackageText ? getModalPackageText(booking) : ""}
                </Text>
              </View>

              <View style={[styles.modalDetailRow, { alignItems: "flex-start" }]}>
                <Ionicons name="pin-outline" size={14} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                <Text style={styles.modalDetailLabel}>Address:</Text>
                <Text style={[styles.modalDetailValue, { flex: 1 }]} numberOfLines={2}>
                  {booking.address || booking.landmark || "Customer Location Details"}
                </Text>
              </View>
            </View>

            {/* Billing Summary Box */}
            {(() => {
              const remBal = Number(booking.remaining_amount || booking.remainingAmount || 0);
              const totalAmt = Number(
                booking.customer_total_amount ||
                booking.total_amount ||
                booking.totalAmount ||
                booking.total_price ||
                booking.final_amount ||
                booking.finalAmount ||
                (remBal > 0 ? remBal + Number(booking.advance_paid || 0) : 0)
              );
              const advPaid = Number(
                booking.advance_paid ||
                booking.advance_amount ||
                booking.required_advance ||
                Math.max(0, totalAmt - remBal)
              );

              return (
                <View style={styles.modalBillingSummary}>
                  <View style={styles.modalBillRow}>
                    <Text style={styles.modalBillLabel}>Total Amount</Text>
                    <Text style={styles.modalBillValue}>₹{totalAmt}</Text>
                  </View>
                  <View style={styles.modalBillRow}>
                    <Text style={styles.modalBillLabel}>Advance Paid</Text>
                    <Text style={[styles.modalBillValue, { color: "#2E7D32" }]}>-₹{advPaid}</Text>
                  </View>
                  <View style={styles.modalDividerLine} />
                  <View style={styles.modalBillRow}>
                    <Text style={[styles.modalBillLabel, { fontWeight: "700", color: Colors.text }]}>Remaining Balance</Text>
                    <Text style={[styles.modalBillValue, { fontWeight: "800", color: Colors.primary, fontSize: 15 }]}>
                      ₹{remBal}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Actions */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalLaterBtn}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.modalLaterBtnText}>Pay Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalPayBtn}
              activeOpacity={0.8}
              onPress={onPay}
            >
              <Text style={styles.modalPayBtnText}>Pay Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  modalArtistCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  modalArtistPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  modalArtistMeta: {
    flex: 1,
  },
  modalArtistName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  modalArtistCategory: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
    marginBottom: 6,
  },
  modalArtistStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalStatItemText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  modalDivider: {
    fontSize: 12,
    color: "#DDD",
    marginHorizontal: 6,
  },
  modalBookingDetailsCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    gap: 12,
  },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalDetailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
    width: 90,
  },
  modalDetailValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600",
    flex: 1,
  },
  modalBillingSummary: {
    backgroundColor: Colors.primary + "0A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    marginBottom: 24,
  },
  modalBillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalBillLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  modalBillValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
  modalDividerLine: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 12,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalLaterBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalLaterBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  modalPayBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalPayBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default PaymentModal;
