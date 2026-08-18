import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Share } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import moment from "moment";

export default function InvoiceCard({
  booking,
  visible = false,
  onClose
}) {
  if (!booking) return null;

  const totalAmount = Number(booking.total_amount || booking.final_amount || 0);
  const advanceAmount = Number(booking.advance_amount || booking.advance_paid || Math.round(totalAmount * 0.10));
  const remainingAmount = Number(booking.remaining_amount !== undefined ? booking.remaining_amount : (totalAmount - advanceAmount));
  const travelCharge = Number(booking.travel_charge || 0);
  const discountAmount = Number(booking.discount_amount || booking.coupon_discount || 0);
  const invoiceNumber = `INV-${booking.booking_code || booking.id || "RECEIPT"}`;
  const invoiceDate = booking.created_at ? moment(booking.created_at).format("DD MMM YYYY") : "Today";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `MehndiGo Invoice #${invoiceNumber}\nService: ${booking.service_name || "Mehndi Service"}\nTotal Paid: ₹${totalAmount}\nStatus: PAID\nThank you for choosing MehndiGo!`
      });
    } catch (_) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>MehndiGo Invoice</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#212121" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Invoice Meta */}
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Number</Text>
                <Text style={styles.metaValue}>#{invoiceNumber}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date of Issue</Text>
                <Text style={styles.metaValue}>{invoiceDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Status</Text>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID & SETTLED</Text>
                </View>
              </View>
            </View>

            {/* Billed To / From */}
            <View style={styles.partiesGrid}>
              <View style={styles.partyBox}>
                <Text style={styles.partyLabel}>Customer</Text>
                <Text style={styles.partyName}>{booking.customer_name || booking.user?.name || "Customer"}</Text>
                <Text style={styles.partyAddress} numberOfLines={2}>{booking.address || "Verified Address"}</Text>
              </View>

              <View style={styles.partyBox}>
                <Text style={styles.partyLabel}>Artist</Text>
                <Text style={styles.partyName}>{booking.artist_name || booking.artist?.user?.name || "Mehndi Artist"}</Text>
                <Text style={styles.partyAddress}>Verified MehndiGo Pro</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Line Items Table */}
            <Text style={styles.tableTitle}>Billing Breakdown</Text>

            <View style={styles.tableHeader}>
              <Text style={styles.thItem}>Description</Text>
              <Text style={styles.thAmount}>Amount</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tdItem}>{booking.service_name || "Mehndi Application Service"}</Text>
              <Text style={styles.tdAmount}>₹{totalAmount + discountAmount - travelCharge}</Text>
            </View>

            {travelCharge > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tdItem}>Travel Allowance</Text>
                <Text style={styles.tdAmount}>+ ₹{travelCharge}</Text>
              </View>
            )}

            {discountAmount > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tdItem, { color: "#059669" }]}>Promotional Discount</Text>
                <Text style={[styles.tdAmount, { color: "#059669" }]}>- ₹{discountAmount}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Total Summary */}
            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>10% Advance Deposit Paid</Text>
                <Text style={styles.totalVal}>₹{advanceAmount}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Remaining Settled</Text>
                <Text style={styles.totalVal}>₹{remainingAmount}</Text>
              </View>
              <View style={[styles.totalRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#E5E7EB" }]}>
                <Text style={styles.grandTotalLabel}>Grand Total Paid</Text>
                <Text style={styles.grandTotalVal}>₹{totalAmount}</Text>
              </View>
            </View>

            <View style={styles.securityFooter}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.securityFooterText}>
                Official digital receipt generated by MehndiGo Marketplace Escrow.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={16} color="#212121" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 24
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  closeBtn: {
    padding: 4
  },
  scrollBody: {
    padding: 20
  },
  metaBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metaLabel: {
    fontSize: 12,
    color: "#6B7280"
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#212121"
  },
  paidBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#065F46"
  },
  partiesGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  partyBox: {
    flex: 1,
    backgroundColor: "#FFF8FA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCE7F3"
  },
  partyLabel: {
    fontSize: 10,
    color: "#E91E63",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  partyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121",
    marginTop: 2
  },
  partyAddress: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  thItem: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280"
  },
  thAmount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280"
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8
  },
  tdItem: {
    fontSize: 13,
    color: "#212121",
    flex: 1
  },
  tdAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#212121"
  },
  totalBox: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    gap: 4
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  totalLabel: {
    fontSize: 12,
    color: "#6B7280"
  },
  totalVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#212121"
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#212121"
  },
  grandTotalVal: {
    fontSize: 18,
    fontWeight: "900",
    color: "#E91E63"
  },
  securityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6
  },
  securityFooterText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "500",
    textAlign: "center"
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 6
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#212121"
  },
  doneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E91E63"
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
