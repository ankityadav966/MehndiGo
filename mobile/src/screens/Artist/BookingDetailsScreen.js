import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getBookingDetails, acceptBooking, rejectBooking, updateOnTheWay, startService, completeService, confirmCashPayment, rejectCashPayment } from "../../services/booking";

// Stepper steps for artist tracking
const STEPS = [
  { key: "PENDING", label: "Requested" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "ARTIST_ACCEPTED", label: "Accepted" },
  { key: "ARTIST_ON_THE_WAY", label: "On The Way" },
  { key: "SERVICE_STARTED", label: "Started" },
  { key: "COMPLETED", label: "Completed" }
];

export default function BookingDetailsScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = async () => {
    try {
      const data = await getBookingDetails(bookingId);
      setBooking(data);
    } catch (e) {
      Alert.alert("Error", "Could not retrieve booking details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID parameter.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      loadDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [bookingId]);

  // Live Tracking startup/shutdown listener based on active status
  useEffect(() => {
    if (!booking) return;
    const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
    const activeTrackingStatuses = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED"];

    if (activeTrackingStatuses.includes(currentDetailedStatus)) {
      const { startTracking } = require("../../services/trackingService");
      startTracking(booking.id, booking.artist_id).catch((err) => {
        console.log("[BookingDetails] Auto start tracking warning:", err.message);
      });
    } else {
      const { stopTracking } = require("../../services/trackingService");
      stopTracking();
    }
  }, [booking]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await acceptBooking(bookingId);
      Alert.alert("Success", "Booking request accepted successfully!");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to accept booking.");
      setLoading(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Booking",
      "Are you sure you want to decline this booking request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await rejectBooking(bookingId, "Declined by artist");
              Alert.alert("Declined", "Booking request declined.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to decline booking.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleStartTravel = async () => {
    setLoading(true);
    try {
      await updateOnTheWay(bookingId);
      Alert.alert("Travel Started", "You are now on the way to the customer location!");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update travel status.");
      setLoading(false);
    }
  };

  const handleStartService = async () => {
    setLoading(true);
    try {
      await startService(bookingId);
      Alert.alert("Service Started", "Mehndi application service timer started!");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", "Failed to start service.");
      setLoading(false);
    }
  };

  const handleCompleteService = async () => {
    setLoading(true);
    try {
      await completeService(bookingId);
      setLoading(false);
      Alert.alert("Service Completed", "Booking service completed successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert("Error", "Failed to complete service.");
      setLoading(false);
    }
  };

  const handleConfirmCash = async () => {
    setLoading(true);
    try {
      await confirmCashPayment(bookingId);
      Alert.alert("Payment Confirmed", "You confirmed that cash payment was received. Booking completed & settled.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to confirm cash payment.");
      setLoading(false);
    }
  };

  const handleRejectCash = async () => {
    setLoading(true);
    try {
      await rejectCashPayment(bookingId);
      Alert.alert("Dispute Logged", "You reported that cash payment was not received. Admin has been notified.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reject cash payment.");
      setLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
  const activeStepIndex = STEPS.findIndex((s) => s.key === currentDetailedStatus);
  const canChat = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED"].includes(currentDetailedStatus);

  const getMoment = () => {
    const m = require("moment");
    return typeof m === "function" ? m : (m.default || m);
  };

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const localMoment = getMoment();
    const formats = [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DDTHH:mm:ssZ",
      "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "HH:mm:ss",
      "HH:mm",
      "hh:mm A",
      "hh:mm"
    ];
    return localMoment(timeVal, formats).format("hh:mm A");
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "TBD";
    try {
      const localMoment = getMoment();
      return localMoment(dateVal).format("DD MMM YYYY (dddd)");
    } catch (e) {
      return dateVal;
    }
  };

  const renderStatusFooter = () => {
    if (currentDetailedStatus === "PENDING") {
      return (
        <View style={styles.footerActions}>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: Colors.primary }]} onPress={handleAccept}>
            <Text style={styles.footerBtnText}>Accept Request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: Colors.border }]} onPress={handleDecline}>
            <Text style={[styles.footerBtnText, { color: Colors.textSecondary }]}>Decline Request</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentDetailedStatus === "CONFIRMED" || currentDetailedStatus === "ARTIST_ACCEPTED" || currentDetailedStatus === "ACCEPTED") {
      return (
        <View style={styles.footerSingle}>
          <CustomButton title="Start Travel (On the Way)" onPress={handleStartTravel} />
        </View>
      );
    }

    if (currentDetailedStatus === "ARTIST_ON_THE_WAY") {
      return (
        <View style={styles.footerSingle}>
          <CustomButton title="Start Service (Arrived)" onPress={handleStartService} />
        </View>
      );
    }

    if (currentDetailedStatus === "SERVICE_STARTED") {
      return (
        <View style={styles.footerSingle}>
          <CustomButton title="Complete Service" onPress={handleCompleteService} />
        </View>
      );
    }



    return (
      <View style={styles.completedBanner}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        <Text style={styles.completedBannerText}>This booking is {currentDetailedStatus}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Request Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Progress Timeline Tracker */}
        {currentDetailedStatus !== "CANCELLED" && (
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>Service Progress Timeline</Text>
            <View style={styles.stepperWrapper}>
              {STEPS.map((step, idx) => {
                const isCompleted = idx <= activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View
                      style={[
                        styles.circle,
                        isCompleted && styles.completedCircle,
                        isCurrent && styles.currentCircle
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={10} color={Colors.white} />
                      ) : (
                        <Text style={styles.stepNum}>{idx + 1}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCompleted && styles.completedStepLabel,
                        isCurrent && styles.currentStepLabel
                      ]}
                    >
                      {step.label}
                    </Text>
                    {idx < STEPS.length - 1 && (
                      <View style={[styles.line, idx < activeStepIndex && styles.completedLine]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Customer Detail Card */}
        <View style={styles.customerCard}>
          <Image
            source={{ uri: booking.user?.profile_image || "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300" }}
            style={styles.avatar}
          />
          <Text style={styles.customerName}>{booking.user?.name || "Client"}</Text>
          <Text style={styles.bookingCode}>Booking ID: {booking.booking_code}</Text>

          <View style={styles.divider} />

          <InfoRow icon="brush-outline" label="Design Type" value={booking.service?.specialization_name || "Custom design"} />
          <InfoRow icon="calendar-outline" label="Date" value={formatDate(booking.slot?.date || booking.reschedule_date)} />
          <InfoRow icon="time-outline" label="Time Slot" value={booking.slot ? `${formatTime(booking.slot.start_time)} - ${formatTime(booking.slot.end_time)}` : (booking.reschedule_time ? formatTime(booking.reschedule_time) : "TBD")} />
          <InfoRow icon="location-outline" label="Location" value={booking.address} />
          {booking.landmark && (
            <InfoRow icon="pin-outline" label="Landmark" value={booking.landmark} />
          )}
        </View>

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Earnings & Payments</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Service Cost</Text>
            <Text style={styles.val}>₹{booking.total_price}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Travel Allowance</Text>
            <Text style={styles.val}>₹{booking.travel_charges}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Your Total Share</Text>
            <Text style={styles.totalVal}>₹{booking.total_price + booking.travel_charges}</Text>
          </View>
        </View>

        {/* Custom notes */}
        {booking.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Client Notes</Text>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        )}

        {/* Contacts */}
        <View style={styles.contactPanel}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={() => Linking.openURL(`tel:${booking.user?.phone || "9999999999"}`)}
          >
            <Ionicons name="call" size={16} color={Colors.white} />
            <Text style={styles.contactBtnText}>Call Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactBtn, !canChat && styles.disabledContactBtn, { backgroundColor: Colors.success }]}
            onPress={() => {
              if (!canChat) {
                Alert.alert("Denied", "You can only message after payment verification.");
                return;
              }
              navigation.navigate("ChatRoom", {
                receiverId: booking.user_id,
                receiverName: booking.user?.name,
                receiverImage: booking.user?.profile_image
              });
            }}
          >
            <Ionicons name="chatbubbles" size={16} color={Colors.white} />
            <Text style={styles.contactBtnText}>Message Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.footer}>
        {renderStatusFooter()}
      </View>
    </SafeAreaView>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 100 },
  timelineCard: { margin: 16, padding: 14, backgroundColor: Colors.white, borderRadius: 14, elevation: 1 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  stepperWrapper: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stepItem: { alignItems: "center", flex: 1, position: "relative" },
  circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", zIndex: 2 },
  completedCircle: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  currentCircle: { borderWidth: 2, borderColor: Colors.primary },
  stepNum: { fontSize: 8, color: Colors.textSecondary },
  stepLabel: { fontSize: 8, color: Colors.textTertiary, marginTop: 4, textAlign: "center" },
  completedStepLabel: { color: Colors.textSecondary },
  currentStepLabel: { color: Colors.primary, fontWeight: "700" },
  line: { position: "absolute", left: "55%", top: 9, width: "90%", height: 1, backgroundColor: Colors.border, zIndex: 1 },
  completedLine: { backgroundColor: Colors.primary },
  customerCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: "center", elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 10 },
  customerName: { fontSize: 16, fontWeight: "800", color: Colors.text },
  bookingCode: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, width: "100%", marginVertical: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", paddingVertical: 8, width: "100%" },
  infoLeft: { flexDirection: "row", alignItems: "center" },
  infoLabel: { marginLeft: 8, fontSize: 12, color: Colors.textSecondary },
  infoValue: { fontSize: 12, color: Colors.text, fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 16, flexWrap: "wrap" },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, elevation: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  label: { fontSize: 12, color: Colors.textSecondary },
  val: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  totalLabel: { fontSize: 13, fontWeight: "700" },
  totalVal: { fontSize: 14, fontWeight: "800", color: Colors.primary },
  notesText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  contactPanel: { flexDirection: "row", paddingHorizontal: 16, marginTop: 10 },
  contactBtn: { flex: 1, marginHorizontal: 4, height: 44, borderRadius: 10, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  disabledContactBtn: { backgroundColor: Colors.textTertiary },
  contactBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13, marginLeft: 6 },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  footerActions: { flexDirection: "row", justifyContent: "space-between" },
  footerBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginHorizontal: 4 },
  footerBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  footerSingle: { width: "100%" },
  completedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  completedBannerText: { marginLeft: 8, color: Colors.success, fontWeight: "700", fontSize: 13 }
});
