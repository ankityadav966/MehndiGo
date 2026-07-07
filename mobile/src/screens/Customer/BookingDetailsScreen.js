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
  Linking,
  Modal,
  TextInput
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getBookingDetails, cancelBooking, rescheduleBooking, getInvoice, selectCashPayment } from "../../services/booking";

// Visual mapping for timeline checkpoints
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

  // Cancellation Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule Modal states
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("10:00 AM - 11:00 AM");

  // Review Modal states
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Required", "Please type your cancellation reason.");
      return;
    }

    setLoading(true);
    setCancelModalVisible(false);

    try {
      await cancelBooking(bookingId, cancelReason.trim());
      loadDetails();
      Alert.alert("Cancelled", "Your booking reservation was cancelled successfully.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to cancel booking.");
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    setLoading(true);
    setRescheduleModalVisible(false);

    try {
      await rescheduleBooking(bookingId, rescheduleDate, rescheduleTimeSlot);
      loadDetails();
      Alert.alert("Rescheduled", "Your booking time was rescheduled successfully.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reschedule booking.");
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const inv = await getInvoice(bookingId);
      if (inv && inv.invoice_url) {
        let url = inv.invoice_url;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          const { BASE_URL } = require("../../services/api");
          url = `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
        }
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Invoice link is not available.");
      }
    } catch (err) {
      Alert.alert("Error", "Invoice document is not generated yet. Payment is required.");
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      Alert.alert("Required", "Please select a rating star first.");
      return;
    }
    setSubmittingReview(true);
    try {
      const { createNewReview } = require("../../services/review");
      await createNewReview({
        booking_id: bookingId,
        artist_id: booking.artist_id,
        rating,
        review_text: reviewText
      });
      setSubmittingReview(false);
      setReviewModalVisible(false);
      const artistName = booking.artist?.user?.name || "the artist";
      Alert.alert(
        "Review Published",
        `Thank you for reviewing ${artistName}! Your feedback has been shared.`
      );
    } catch (err) {
      setSubmittingReview(false);
      Alert.alert("Error", err.message || "Failed to submit review.");
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

  const canChat = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "COMPLETED"].includes(currentDetailedStatus);

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

  const resolveImage = (uri) => {
    const placeholder = "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=300";
    if (!uri) return placeholder;
    if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith("content://")) {
      return uri;
    }
    const cleanUri = uri.startsWith("/") ? uri : `/${uri}`;
    const { SOCKET_URL } = require("../../services/api");
    if (!SOCKET_URL) return placeholder;
    const finalUrl = `${SOCKET_URL}${cleanUri}`;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      return placeholder;
    }
    return finalUrl;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Step progress tracker timeline */}
        {currentDetailedStatus !== "CANCELLED" && (
          <View style={styles.timelineCard}>
            <Text style={styles.cardTitle}>Booking Progress Status</Text>
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

        <Image
          source={{ uri: resolveImage(booking.artist?.user?.profile_image) }}
          style={styles.artistImage}
        />

        <View style={styles.content}>
          {booking.payment_status === "PENDING" && currentDetailedStatus !== "CANCELLED" && (() => {
            const isCompletedOrDisputed = booking.booking_status === "COMPLETED" || ["CASH_DISPUTED", "AWAITING_CASH_CONFIRMATION", "CASH_PAYMENT_PENDING"].includes(currentDetailedStatus);
            return (
              <View style={styles.paymentPendingCard}>
                <View style={styles.paymentPendingHeader}>
                  <Ionicons name="warning-outline" size={20} color="#D97706" />
                  <Text style={styles.paymentPendingTitle}>Payment Pending</Text>
                </View>
                <Text style={styles.paymentPendingMsg}>
                  {currentDetailedStatus === "AWAITING_CASH_CONFIRMATION"
                    ? "This booking is awaiting the artist's confirmation of cash payment."
                    : currentDetailedStatus === "CASH_DISPUTED"
                      ? "A cash payment issue has been flagged. Admin is reviewing the dispute."
                      : currentDetailedStatus === "CASH_PAYMENT_PENDING"
                        ? "Cash payment selected. Please pay the artist in hand upon service completion."
                        : "Your payment for this booking is pending. Please complete the checkout."}
                </Text>
                {isCompletedOrDisputed ? (
                  <View style={styles.retryBtnRow}>
                    <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => {
                        navigation.navigate("Payment", {
                          bookingId: booking.id,
                          bookingCode: booking.booking_code,
                          finalAmount: booking.final_amount,
                          isSettlement: true
                        });
                      }}
                    >
                      <Ionicons name="card-outline" size={16} color={Colors.white} />
                      <Text style={styles.retryBtnText}>Pay Online</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: Colors.success }]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          await selectCashPayment(booking.id);
                          Alert.alert(
                            "Success",
                            "Your cash payment request has been sent to the artist again. Please pay the artist ₹" + booking.final_amount + " in cash.",
                            [
                              {
                                text: "OK",
                                onPress: () => {
                                  loadDetails();
                                }
                              }
                            ]
                          );
                        } catch (err) {
                          Alert.alert("Error", err.message || "Failed to select cash payment.");
                          setLoading(false);
                        }
                      }}
                    >
                      <Ionicons name="cash-outline" size={16} color={Colors.white} />
                      <Text style={styles.retryBtnText}>Pay Cash</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.payNowBtn}
                    onPress={() => {
                      navigation.navigate("Payment", {
                        bookingId: booking.id,
                        bookingCode: booking.booking_code,
                        finalAmount: booking.final_amount
                      });
                    }}
                  >
                    <Text style={styles.payNowText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          <View style={styles.statusRow}>
            <Text style={styles.bookingId}>Code: {currentDetailedStatus === "CANCELLED" ? `${booking.booking_code} (Expired)` : booking.booking_code}</Text>
            <View
              style={[
                styles.statusBadge,
                ["COMPLETED", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(currentDetailedStatus) && styles.badgeSuccess,
                currentDetailedStatus === "CANCELLED" && styles.badgeError
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  ["COMPLETED", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(currentDetailedStatus) && styles.textSuccess,
                  currentDetailedStatus === "CANCELLED" && styles.textError
                ]}
              >
                {currentDetailedStatus}
              </Text>
            </View>
          </View>

          <Text style={styles.artistName}>
            {booking.service?.specialization_name || "Custom Mehndi Design"}
          </Text>
          <Text style={styles.service}>
            Professional Service by {booking.artist?.user?.name || "Specialist"}
          </Text>

          <View style={styles.card}>
            <DetailRow icon="person-outline" label="Artist ID" value={`ART-${booking.artist_id}`} />
            <DetailRow icon="bookmark-outline" label="Booking ID" value={`#${booking.booking_code}`} />
            <DetailRow icon="information-circle-outline" label="Booking Status" value={currentDetailedStatus} />
            <DetailRow icon="cash-outline" label="Payment Status" value={booking.payment_status} />
            <DetailRow
              icon="calendar-outline"
              label="Date"
              value={formatDate(booking.slot?.date || booking.reschedule_date)}
            />
             <DetailRow
              icon="time-outline"
              label="Time Slot"
              value={booking.slot ? `${formatTime(booking.slot.start_time)} - ${formatTime(booking.slot.end_time)}` : (booking.reschedule_time ? formatTime(booking.reschedule_time) : "TBD")}
            />
            <DetailRow icon="location-outline" label="Location" value={booking.address} />
            {booking.landmark && (
              <DetailRow icon="pin-outline" label="Landmark" value={booking.landmark} />
            )}
            {booking.cancel_reason && (
              <DetailRow icon="close-circle-outline" label="Rejection Reason" value={booking.cancel_reason} />
            )}
            <DetailRow
              icon="wallet-outline"
              label="Paid Amount"
              value={`₹${booking.final_amount}`}
            />
          </View>

          {/* Pricing detail breakdown collapse */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Pricing Details</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Base Amount</Text>
              <Text style={styles.priceVal}>₹{booking.total_price}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Travel Charges</Text>
              <Text style={styles.priceVal}>₹{booking.travel_charges}</Text>
            </View>
            {booking.coupon_discount > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.priceLabel, { color: Colors.primary }]}>Discount</Text>
                <Text style={[styles.priceVal, { color: Colors.primary }]}>-₹{booking.coupon_discount}</Text>
              </View>
            )}
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Platform Fee</Text>
              <Text style={styles.priceVal}>₹{booking.platform_fee}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>GST (18%)</Text>
              <Text style={styles.priceVal}>₹{booking.gst}</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.priceTotalLabel}>Final Paid Amount</Text>
              <Text style={styles.priceTotalVal}>₹{booking.final_amount}</Text>
            </View>
          </View>

          {/* Action options */}
          {canChat && (
            <View style={styles.actionsPanel}>
              {/* Call artist */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => Linking.openURL(`tel:${booking.artist?.user?.phone || "9999999999"}`)}
              >
                <Ionicons name="call" size={16} color={Colors.white} />
                <Text style={styles.actionBtnText}>Call Artist</Text>
              </TouchableOpacity>

              {/* Message Chat artist */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                onPress={() => {
                  navigation.navigate("ChatRoom", {
                    receiverId: booking.artist?.user_id,
                    receiverName: booking.artist?.user?.name,
                    receiverImage: booking.artist?.user?.profile_image
                  });
                }}
              >
                <Ionicons name="chatbubbles" size={16} color={Colors.white} />
                <Text style={styles.actionBtnText}>Message Artist</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reschedule option */}
          {["PENDING", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(currentDetailedStatus) && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setRescheduleModalVisible(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Reschedule Appointment</Text>
            </TouchableOpacity>
          )}

          {/* Cancel option */}
          {["PENDING", "CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(currentDetailedStatus) && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCancelModalVisible(true)}
            >
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

          {/* Invoice option */}
          {booking.payment_status === "PAID" && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10 }]}
              onPress={handleDownloadInvoice}
            >
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Download Invoice Receipt</Text>
            </TouchableOpacity>
          )}

          {/* Review options */}
          {currentDetailedStatus === "COMPLETED" && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10, borderColor: Colors.success }]}
              onPress={() => setReviewModalVisible(true)}
            >
              <Ionicons name="star" size={16} color={Colors.success} />
              <Text style={[styles.secondaryBtnText, { color: Colors.success }]}>Write Professional Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal visible={rescheduleModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.rescheduleModalCard}>
            <Text style={styles.modalTitle}>Reschedule Booking</Text>
            <Calendar
              current={rescheduleDate}
              minDate={new Date().toISOString().split("T")[0]}
              onDayPress={(day) => setRescheduleDate(day.dateString)}
              markedDates={{
                [rescheduleDate]: { selected: true, selectedColor: Colors.primary }
              }}
              theme={{
                selectedDayBackgroundColor: Colors.primary,
                todayTextColor: Colors.primary
              }}
            />
            
            <Text style={styles.modalLabel}>Choose Reschedule Slot Time</Text>
            <TextInput
              placeholder="e.g. 10:00 AM - 11:00 AM"
              placeholderTextColor={Colors.textTertiary}
              style={styles.modalInput}
              value={rescheduleTimeSlot}
              onChangeText={setRescheduleTimeSlot}
            />

            <CustomButton title="Confirm Reschedule" onPress={handleReschedule} style={{ marginTop: 14 }} />
            <TouchableOpacity
              style={styles.modalCancelLink}
              onPress={() => setRescheduleModalVisible(false)}
            >
              <Text style={styles.modalCancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSub}>
              Please explain why you want to cancel this booking request.
            </Text>
            <TextInput
              placeholder="Cancellation Reason..."
              placeholderTextColor={Colors.textTertiary}
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <CustomButton title="Confirm Cancel" onPress={handleCancelBooking} style={{ marginTop: 14 }} />
            <TouchableOpacity style={styles.modalCancelLink} onPress={() => setCancelModalVisible(false)}>
              <Text style={styles.modalCancelLinkText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review & Rating Modal */}
      <Modal visible={reviewModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Write Review</Text>
            <Text style={styles.modalSub}>Rate your experience with this Mehndi Artist</Text>
            
            {/* Stars Selector */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={28}
                    color="#FFB800"
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Write detailed design or visit styling feedback..."
              placeholderTextColor={Colors.textTertiary}
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />

            <CustomButton
              title={submittingReview ? "Submitting..." : "Submit Review"}
              onPress={handleSubmitReview}
              disabled={submittingReview}
              style={{ marginTop: 14 }}
            />
            <TouchableOpacity style={styles.modalCancelLink} onPress={() => setReviewModalVisible(false)}>
              <Text style={styles.modalCancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.leftRow}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  paymentPendingCard: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: "#F59E0B" },
  paymentPendingHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  paymentPendingTitle: { marginLeft: 8, fontSize: 13, fontWeight: "700", color: "#D97706" },
  paymentPendingMsg: { fontSize: 12, color: "#92400E", lineHeight: 18 },
  payNowBtn: { marginTop: 10, backgroundColor: "#D97706", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  payNowText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  retryBtnRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, width: "100%" },
  retryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 40, borderRadius: 8, marginHorizontal: 4 },
  retryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12, marginLeft: 6 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 60 },
  timelineCard: { margin: 16, padding: 14, backgroundColor: Colors.background, borderRadius: 14 },
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
  artistImage: { width: "100%", height: 200, resizeMode: "cover" },
  content: { padding: 16 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bookingId: { fontSize: 13, color: Colors.textSecondary, fontWeight: "700" },
  statusBadge: { backgroundColor: Colors.primaryLight + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeSuccess: { backgroundColor: Colors.success + "15" },
  badgeError: { backgroundColor: Colors.error + "15" },
  statusText: { color: Colors.primary, fontWeight: "700", fontSize: 11 },
  textSuccess: { color: Colors.success },
  textError: { color: Colors.error },
  artistName: { fontSize: 20, fontWeight: "800", color: Colors.text, marginTop: 12 },
  service: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  leftRow: { flexDirection: "row", alignItems: "center" },
  label: { marginLeft: 8, fontSize: 12, color: Colors.textSecondary },
  value: { fontSize: 12, color: Colors.text, fontWeight: "600", flex: 1, textAlign: "right", marginLeft: 16 },
  cardSectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  priceLabel: { fontSize: 12, color: Colors.textSecondary },
  priceVal: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  cardDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  priceTotalLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  priceTotalVal: { fontSize: 14, fontWeight: "800", color: Colors.primary },
  actionsPanel: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  actionBtn: { flex: 1, marginHorizontal: 4, height: 44, borderRadius: 10, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  disabledActionBtn: { backgroundColor: Colors.textTertiary },
  actionBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13, marginLeft: 6 },
  secondaryBtn: { flexDirection: "row", height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, justifyContent: "center", alignItems: "center", marginTop: 12 },
  secondaryBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13, marginLeft: 6 },
  cancelBtn: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: Colors.error, justifyContent: "center", alignItems: "center", marginTop: 12 },
  cancelBtnText: { color: Colors.error, fontWeight: "700", fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20 },
  rescheduleModalCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, marginBottom: 8, textAlign: "center" },
  modalSub: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, textAlign: "center", lineHeight: 18 },
  modalLabel: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 14, marginBottom: 6 },
  modalInput: { height: 44, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, fontSize: 12, color: Colors.text },
  modalCancelLink: { marginTop: 12, alignItems: "center" },
  modalCancelLinkText: { fontSize: 12, color: Colors.textTertiary, fontWeight: "600" },
  starsRow: { flexDirection: "row", justifyContent: "center", marginVertical: 14 }
});
