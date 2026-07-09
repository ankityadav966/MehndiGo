import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { getLeadById, acceptLead, rejectLead, viewLead } from "../../services/leads";

export default function LeadDetailsScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rejection modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadLeadDetails = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch details
      const response = await getLeadById(id);
      setLead(response);
      
      // 2. Mark viewed on server
      if (response.status === "New Lead") {
        await viewLead(id);
      }
    } catch (err) {
      console.log("Failed to load lead details:", err);
      setError(err?.message || "Failed to load lead details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeadDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [id, loadLeadDetails]);

  const handleAccept = async () => {
    if (!lead) return;
    Alert.alert(
      "Accept Lead",
      "Are you sure you want to accept this booking request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setSubmittingAction(true);
            try {
              await acceptLead(lead.id);
              Alert.alert("Success", "Booking request accepted successfully!");
              loadLeadDetails(); // Reload page state
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to accept lead.");
            } finally {
              setSubmittingAction(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectSubmit = async () => {
    if (!lead) return;
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please enter a reason for rejection.");
      return;
    }
    setRejectModalVisible(false);
    setSubmittingAction(true);
    try {
      await rejectLead(lead.id, rejectReason.trim());
      Alert.alert("Declined", "Booking request declined.");
      setRejectReason("");
      loadLeadDetails(); // Reload state
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to decline lead.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCall = () => {
    if (lead?.customer?.phone) {
      Linking.openURL(`tel:${lead.customer.phone}`).catch(() => {
        Alert.alert("Error", "Could not open dialer on this device.");
      });
    } else {
      Alert.alert("Unavailable", "Customer phone number is not available.");
    }
  };

  const handleNavigate = () => {
    if (lead) {
      let url = "";
      if (lead.latitude && lead.longitude) {
        url = `https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address || lead.city)}`;
      }
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open Google Maps.");
      });
    }
  };

  const handleChat = () => {
    if (lead) {
      navigation.navigate("ChatRoom", {
        bookingId: lead.id,
        receiverId: lead.customer.id,
        receiverName: lead.customer.name,
        receiverImage: lead.customer.profile_image
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching lead details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !lead) {
    return (
      <SafeAreaView style={[styles.container, styles.center, { paddingHorizontal: 30 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.primary} />
        <Text style={styles.errorTitle}>Failed to load lead details</Text>
        <Text style={styles.errorSubtitle}>{error || "Lead not found."}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Customer Profile Card */}
        <View style={styles.sectionCard}>
          <View style={styles.profileRow}>
            <Image
              source={lead.customer?.profile_image ? { uri: lead.customer.profile_image } : require("../../assets/images/Henna.jpg")}
              style={styles.avatar}
            />
            <View style={styles.profileText}>
              <Text style={styles.customerName}>{lead.customer?.name || "Customer"}</Text>
              <Text style={styles.bookingId}>Booking Reference: {lead.booking_code}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, getBadgeStyle(lead.status)]}>
                  <Text style={[styles.statusBadgeText, { color: getBadgeStyle(lead.status).color }]}>{lead.status}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Requirements Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}> mehndi details</Text>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Requested Service</Text>
            <Text style={styles.fieldValue}>{lead.service?.name || "Mehndi Booking"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Category</Text>
            <Text style={styles.fieldValue}>{lead.service?.category || "Regular Mehndi"}</Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Preferred Date & Time</Text>
            <Text style={styles.fieldValue}>
              {new Date(lead.booking_date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at {lead.booking_time}
            </Text>
          </View>
          <View style={styles.infoField}>
            <Text style={styles.fieldLabel}>Price Budget</Text>
            <Text style={styles.budgetAmount}>₹{lead.service?.price?.toLocaleString("en-IN") || lead.price?.toLocaleString("en-IN")}</Text>
          </View>
          {lead.notes ? (
            <View style={styles.infoField}>
              <Text style={styles.fieldLabel}>Customer Notes</Text>
              <Text style={styles.fieldValue}>{lead.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Location Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Location Address</Text>
          <Text style={styles.addressText}>{lead.address || "Address not provided"}</Text>
          {lead.landmark ? <Text style={styles.landmarkText}>Landmark: {lead.landmark}</Text> : null}
          <Text style={styles.distanceBadge}>Distance: {lead.distance}</Text>
          
          <TouchableOpacity style={styles.mapBtn} onPress={handleNavigate}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.mapBtnText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Status / Log Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Additional details</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.fieldLabel}>Payment Status</Text>
            <Text style={styles.fieldValue}>{lead.payment_status || "PENDING"}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <Text style={styles.fieldLabel}>Booking Status</Text>
            <Text style={styles.fieldValue}>{lead.booking_status || "PENDING"}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Footer */}
      <View style={styles.footer}>
        {lead.status === "New Lead" || lead.status === "Viewed" || lead.status === "Pending" ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.declineBtn, submittingAction && styles.disabledBtn]}
              onPress={() => setRejectModalVisible(true)}
              disabled={submittingAction}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn, submittingAction && styles.disabledBtn]}
              onPress={handleAccept}
              disabled={submittingAction}
            >
              {submittingAction ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.acceptText}>Accept Lead</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.contactRow}>
            <TouchableOpacity style={[styles.contactBtn, styles.chatBtn]} onPress={handleChat}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.contactBtnText}>Chat Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactBtn, styles.callBtn]} onPress={handleCall}>
              <Ionicons name="call" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.contactBtnText}>Call Customer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Decline Reason Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.rejectModalContent}>
            <Text style={styles.modalTitle}>Reason for decline</Text>
            <TextInput
              placeholder="e.g. Busy slot, location too far, budget mismatch"
              placeholderTextColor={Colors.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              style={styles.modalInput}
            />
            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRejectSubmit}>
                <Text style={styles.modalSubmitText}>Submit Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getBadgeStyle = (status) => {
  switch (status) {
    case "New Lead": return { backgroundColor: "#FFEBEB", color: "#FF4D4D" };
    case "Viewed": return { backgroundColor: "#EAF2FF", color: "#2F80ED" };
    case "Accepted": return { backgroundColor: "#E3F9E5", color: "#18B65B" };
    case "Rejected": return { backgroundColor: "#FFF0F0", color: "#EB5757" };
    case "Expired": return { backgroundColor: "#F2F2F2", color: "#828282" };
    case "Cancelled": return { backgroundColor: "#FFF4E6", color: "#FF8C00" };
    case "Completed": return { backgroundColor: "#E3F9E5", color: "#18B65B" };
    default: return { backgroundColor: "#F2F2F2", color: "#333333" };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8FA" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 12 },
  errorSubtitle: { fontSize: 13, color: Colors.textTertiary, textAlign: "center", marginTop: 4, marginBottom: 15 },
  backBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: Colors.white, fontWeight: "600" },
  
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: "#EEE" },
  backIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", elevation: 1, shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },

  scrollContainer: { padding: 16, paddingBottom: 50 },
  sectionCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 16, marginBottom: 12, elevation: 1, shadowColor: Colors.shadow, shadowOpacity: 0.04, shadowRadius: 5 },
  
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 70, height: 70, borderRadius: 20 },
  profileText: { flex: 1, marginLeft: 14 },
  customerName: { fontSize: 18, fontWeight: "700", color: Colors.text },
  bookingId: { fontSize: 12, color: Colors.textTertiary, marginTop: 3 },
  badgeRow: { flexDirection: "row", marginTop: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  infoField: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: Colors.textTertiary, fontWeight: "500" },
  fieldValue: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, fontWeight: "500" },
  budgetAmount: { fontSize: 18, fontWeight: "800", color: Colors.text, marginTop: 2 },

  addressText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  landmarkText: { fontSize: 13, color: Colors.textTertiary, marginTop: 4 },
  distanceBadge: { fontSize: 13, fontWeight: "600", color: Colors.primary, marginTop: 8 },
  mapBtn: { flexDirection: "row", alignItems: "center", marginTop: 14, borderWidth: 1, borderColor: Colors.primary, borderStyle: "dashed", paddingVertical: 10, borderRadius: 12, justifyContent: "center" },
  mapBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: "#EEE", flexDirection: "row" },
  actionBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  declineBtn: { borderWidth: 1, borderColor: Colors.primary, marginRight: 8 },
  declineText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  acceptBtn: { backgroundColor: "#18B65B", marginLeft: 8 },
  acceptText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  disabledBtn: { opacity: 0.5 },

  contactRow: { flex: 1, flexDirection: "row" },
  contactBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  chatBtn: { backgroundColor: Colors.primary, marginRight: 6 },
  callBtn: { backgroundColor: "#2F80ED", marginLeft: 6 },
  contactBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  rejectModalContent: { backgroundColor: Colors.white, borderRadius: 24, padding: 20, width: "100%" },
  modalInput: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, color: Colors.text, fontSize: 14, marginTop: 12, height: 100, textAlignVertical: "top" },
  modalFooterRow: { flexDirection: "row", marginTop: 20 },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, justifyContent: "center", alignItems: "center", marginRight: 8 },
  modalCancelText: { color: Colors.textSecondary, fontWeight: "600" },
  modalSubmitBtn: { flex: 1.5, height: 46, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  modalSubmitText: { color: Colors.white, fontWeight: "700" }
});
