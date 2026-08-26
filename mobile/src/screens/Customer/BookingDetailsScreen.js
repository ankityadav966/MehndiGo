import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import {
  getBookingDetails,
  cancelBooking,
  rescheduleBooking,
  selectCashPayment,
  getArtistLocation,
  reportBookingDispute,
  sendCheckInOtp,
  sendCheckOutOtp
} from "../../services/booking";
import { useSocket } from "../../context/SocketContext";
import apiRequest from "../../services/api";

// Reusable Modular Booking Components
import BookingStatusHeader from "../../components/booking/BookingStatusHeader";
import BookingTimeline from "../../components/booking/BookingTimeline";
import BookingSummaryCard from "../../components/booking/BookingSummaryCard";
import BookingAmountCard from "../../components/booking/BookingAmountCard";
import BookingLocationCard from "../../components/booking/BookingLocationCard";
import LiveTrackingCard from "../../components/booking/LiveTrackingCard";
import BookingChatCard from "../../components/booking/BookingChatCard";
import ServiceProgressCard from "../../components/booking/ServiceProgressCard";
import CheckoutCard from "../../components/booking/CheckoutCard";
import InvoiceCard from "../../components/booking/InvoiceCard";
import ReviewCard from "../../components/booking/ReviewCard";
import OtpVerificationCard from "../../components/booking/OtpVerificationCard";

export default function BookingDetailsScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Location & Tracking
  const { socket } = useSocket();
  const [artistCoords, setArtistCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [distanceText, setDistanceText] = useState("");
  const [etaText, setEtaText] = useState("");

  // Modals
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("10:00 AM - 11:00 AM");
  const [rescheduling, setRescheduling] = useState(false);

  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Artist didn't arrive");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const pollIntervalRef = useRef(null);

  const loadDetails = useCallback(async () => {
    if (!bookingId) return;
    try {
      const data = await getBookingDetails(bookingId);
      if (data) {
        if (data.latitude && data.longitude) {
          setCustomerCoords({
            lat: Number(data.latitude),
            lng: Number(data.longitude),
            latitude: Number(data.latitude),
            longitude: Number(data.longitude)
          });
        }
        setBooking(data);
      }

      // If artist is on the way, load live location
      const detailedStatus = String(data?.detailed_status || data?.booking_status || data?.status || "").toUpperCase();
      if (detailedStatus === "ARTIST_ON_THE_WAY" || detailedStatus === "ON_THE_WAY" || detailedStatus === "CONFIRMED") {
        try {
          const locData = await getArtistLocation(bookingId);
          if (locData && locData.latitude && locData.longitude) {
            setArtistCoords({
              lat: Number(locData.latitude),
              lng: Number(locData.longitude),
              latitude: Number(locData.latitude),
              longitude: Number(locData.longitude)
            });
            if (locData.distance_text || locData.distanceText) setDistanceText(locData.distance_text || locData.distanceText);
            if (locData.eta_text || locData.etaText) setEtaText(locData.eta_text || locData.etaText);
          }
        } catch (_) { }
      }
    } catch (err) {
      if (__DEV__) console.log("Failed to load booking details:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  // Screen Focus & Polling
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadDetails();
    });

    // Start 3s polling during all active lifecycle phases (including ARRIVED & IN_PROGRESS)
    pollIntervalRef.current = setInterval(() => {
      const status = String(booking?.detailed_status || booking?.booking_status || booking?.status || "").toUpperCase();
      const activeLifecycleStatuses = [
        "PENDING",
        "REQUESTED",
        "CONFIRMED",
        "ARTIST_ACCEPTED",
        "ACCEPTED",
        "ARTIST_ON_THE_WAY",
        "ON_THE_WAY",
        "ARTIST_ARRIVED",
        "ARRIVED",
        "CUSTOMER_VERIFIED",
        "SERVICE_STARTED",
        "SERVICE_IN_PROGRESS",
        "IN_PROGRESS",
        "PROCESSING",
        "CHECKOUT",
        "PAYMENT_REQUIRED"
      ];
      if (activeLifecycleStatuses.includes(status)) {
        loadDetails();
      }
    }, 3000);

    return () => {
      unsubscribe();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [bookingId, navigation, loadDetails, booking?.detailed_status, booking?.booking_status, booking?.status]);

  // Socket Live Location & Status Listener
  useEffect(() => {
    if (!socket || !bookingId) return;

    socket.emit("join-room", { bookingId });

    const handleLocationUpdate = (payload) => {
      if (payload && payload.latitude && payload.longitude) {
        setArtistCoords({
          lat: Number(payload.latitude),
          lng: Number(payload.longitude)
        });
        if (payload.distance_text || payload.distanceText) setDistanceText(payload.distance_text || payload.distanceText);
        if (payload.eta_text || payload.etaText) setEtaText(payload.eta_text || payload.etaText);
      }
    };

    const handleStatusUpdate = () => {
      loadDetails();
    };

    socket.on("location-update", handleLocationUpdate);
    socket.on("artist_location_update", handleLocationUpdate);
    socket.on("artistLocationUpdated", handleLocationUpdate);

    socket.on("booking-status-updated", handleStatusUpdate);
    socket.on("booking_status_updated", handleStatusUpdate);
    socket.on("bookingStatusUpdated", handleStatusUpdate);
    socket.on("service_started", handleStatusUpdate);
    socket.on("SERVICE_STARTED", handleStatusUpdate);
    socket.on("CHECKIN_VERIFIED", handleStatusUpdate);
    socket.on("checkout_otp_received", handleStatusUpdate);
    socket.on("CHECKOUT_OTP_GENERATED", handleStatusUpdate);
    socket.on("BOOKING_COMPLETED", handleStatusUpdate);
    socket.on("booking_completed", handleStatusUpdate);
    socket.on("service_completed", handleStatusUpdate);
    socket.on("payment_completed", handleStatusUpdate);
    socket.on("PAYMENT_COMPLETED", handleStatusUpdate);
    socket.on("cash_payment_confirmed", handleStatusUpdate);
    socket.on("CASH_PAYMENT_CONFIRMED", handleStatusUpdate);
    socket.on("settlement_completed", handleStatusUpdate);
    socket.on("SETTLEMENT_COMPLETED", handleStatusUpdate);

    return () => {
      socket.off("location-update", handleLocationUpdate);
      socket.off("artist_location_update", handleLocationUpdate);
      socket.off("artistLocationUpdated", handleLocationUpdate);

      socket.off("booking-status-updated", handleStatusUpdate);
      socket.off("booking_status_updated", handleStatusUpdate);
      socket.off("bookingStatusUpdated", handleStatusUpdate);
      socket.off("service_started", handleStatusUpdate);
      socket.off("SERVICE_STARTED", handleStatusUpdate);
      socket.off("CHECKIN_VERIFIED", handleStatusUpdate);
      socket.off("checkout_otp_received", handleStatusUpdate);
      socket.off("CHECKOUT_OTP_GENERATED", handleStatusUpdate);
      socket.off("BOOKING_COMPLETED", handleStatusUpdate);
      socket.off("booking_completed", handleStatusUpdate);
      socket.off("service_completed", handleStatusUpdate);
      socket.off("payment_completed", handleStatusUpdate);
      socket.off("PAYMENT_COMPLETED", handleStatusUpdate);
      socket.off("cash_payment_confirmed", handleStatusUpdate);
      socket.off("CASH_PAYMENT_CONFIRMED", handleStatusUpdate);
      socket.off("settlement_completed", handleStatusUpdate);
      socket.off("SETTLEMENT_COMPLETED", handleStatusUpdate);
    };
  }, [socket, bookingId, loadDetails]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  // Actions
  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert("Required", "Please provide a reason for cancellation.");
      return;
    }
    setCancelling(true);
    try {
      await cancelBooking(bookingId, cancelReason.trim());
      setCancelModalVisible(false);
      Alert.alert("Cancelled", "Booking has been cancelled. Your refund has been initiated.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    setRescheduling(true);
    try {
      await rescheduleBooking(bookingId, rescheduleDate, rescheduleTimeSlot);
      setRescheduleModalVisible(false);
      Alert.alert("Rescheduled", `Booking has been rescheduled to ${rescheduleDate} (${rescheduleTimeSlot}).`);
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reschedule booking.");
    } finally {
      setRescheduling(false);
    }
  };

  const handlePayRemainingOnline = () => {
    if (!booking) return;
    navigation.navigate("Payment", {
      bookingId: booking.id,
      bookingCode: booking.booking_code,
      finalAmount: booking.final_amount || booking.total_amount,
      isSettlement: true
    });
  };

  const handlePayRemainingCash = async () => {
    try {
      setLoading(true);
      await selectCashPayment(booking.id);
      Alert.alert("Cash Selected", "Cash payment selected. Please hand over the remaining amount to the artist.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to select cash payment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async ({ rating, comment, photos, video_url, video_thumbnail }) => {
    setReviewSubmitting(true);
    try {
      const res = await apiRequest("POST", "/customer/review", {
        bookingId: booking.id,
        booking_id: booking.id,
        artistId: booking.artist_id || booking.artist?.id,
        rating,
        comment,
        photos: photos || [],
        video_url: video_url || null,
        video_thumbnail: video_thumbnail || null
      }, true);

      const savedReview = res?.data || res?.review || res;
      if (savedReview) {
        setBooking(prev => ({
          ...prev,
          review: savedReview
        }));
      }

      Alert.alert("Thank You! 🎉", "Your verified review has been submitted successfully!");
      loadDetails();
    } catch (err) {
      Alert.alert("Submission Error", err.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!disputeDesc.trim()) {
      Alert.alert("Required", "Please describe the issue in detail.");
      return;
    }
    setSubmittingDispute(true);
    try {
      await reportBookingDispute(bookingId, disputeReason, disputeDesc.trim());
      setDisputeModalVisible(false);
      Alert.alert("Report Received", "Your support ticket has been registered. Our team will review this shortly.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit dispute.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleBack = useCallback(() => {
    if (invoiceVisible) {
      setInvoiceVisible(false);
      return true;
    }
    if (cancelModalVisible) {
      setCancelModalVisible(false);
      return true;
    }
    if (rescheduleModalVisible) {
      setRescheduleModalVisible(false);
      return true;
    }
    if (disputeModalVisible) {
      setDisputeModalVisible(false);
      return true;
    }

    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "CustomerTabs", params: { screen: "Bookings" } }]
      });
    }
    return true;
  }, [invoiceVisible, cancelModalVisible, rescheduleModalVisible, disputeModalVisible, navigation]);

  useEffect(() => {
    const { BackHandler } = require("react-native");
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", handleBack);
    return () => backSubscription.remove();
  }, [handleBack]);

  if (loading && !booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  const rawStatus = String(booking?.detailed_status || booking?.booking_status || booking?.status || "PENDING").toUpperCase();
  const isCheckInVerified =
    Number(booking?.checkin_otp_verified) === 1 ||
    Number(booking?.checkin_verified) === 1 ||
    Number(booking?.check_in_otp_verified) === 1 ||
    booking?.check_in_otp_verified === true ||
    ["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(rawStatus);

  const isPending = rawStatus === "PENDING" || rawStatus === "REQUESTED";
  const isAccepted = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(rawStatus);
  const isOnTheWay = ["ARTIST_ON_THE_WAY", "ON_THE_WAY"].includes(rawStatus);
  const isArrived = (rawStatus === "ARTIST_ARRIVED" || rawStatus === "ARRIVED") && !isCheckInVerified;

  const isCompleted =
    rawStatus === "COMPLETED" ||
    rawStatus === "COMPLETED_CLOSED" ||
    rawStatus === "PAYMENT_COMPLETED" ||
    (Number(booking?.remaining_amount) <= 0 && Number(booking?.advance_paid) >= Number(booking?.total_amount) && Number(booking?.checkout_otp_verified) === 1);

  const isCheckout = ["CHECKOUT", "PAYMENT_REQUIRED"].includes(rawStatus) && !isCompleted;

  const isServiceActive =
    (["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS"].includes(rawStatus) || isCheckInVerified) &&
    !isCheckout &&
    !isCompleted &&
    rawStatus !== "CANCELLED" &&
    rawStatus !== "REJECTED";

  const isCancelled = rawStatus === "CANCELLED" || rawStatus === "REJECTED";

  const resolvedCustomerCoords = customerCoords || (booking?.latitude && booking?.longitude ? {
    lat: Number(booking.latitude),
    lng: Number(booking.longitude),
    latitude: Number(booking.latitude),
    longitude: Number(booking.longitude)
  } : null);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* 1. Header with Status Pill & Instant Refresh */}
        <BookingStatusHeader
          bookingCode={booking?.booking_code || booking?.booking_number || booking?.id}
          status={rawStatus}
          onBack={handleBack}
          onSupport={() => setDisputeModalVisible(true)}
          onRefresh={handleRefresh}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E91E63" />}
        >
          {/* 2. Step Progression Timeline */}
          <BookingTimeline status={rawStatus} isCancelled={isCancelled} />

          {/* 2.5 Security PIN / OTP Card */}
          {!isCancelled && !isCompleted && (
            <OtpVerificationCard
              otpCode={isCheckInVerified ? (booking?.checkout_otp || booking?.completion_pin) : (booking?.checkin_otp || booking?.checkin_pin)}
              checkinOtp={booking?.checkin_otp || booking?.checkin_pin}
              checkoutOtp={booking?.checkout_otp || booking?.completion_pin}
              customerEmail={booking?.customer_email || booking?.user?.email}
              isArtist={false}
              otpType={isCheckInVerified ? "CHECKOUT" : "CHECKIN"}
              isCheckInVerified={isCheckInVerified}
              isServiceActive={isServiceActive}
              isCheckout={isCheckout}
              isPending={isPending}
              isAccepted={isAccepted || isOnTheWay || isArrived}
              onResend={async () => {
                try {
                  if (isCheckInVerified) {
                    await sendCheckOutOtp(booking.id);
                  } else {
                    await sendCheckInOtp(booking.id);
                  }
                  Alert.alert("Success", "Security PIN resent successfully to your registered email.");
                } catch (e) {
                  Alert.alert("Error", e.message || "Failed to resend PIN.");
                }
              }}
            />
          )}

          {/* 3. Live Tracking Card (Only when ARTIST_ON_THE_WAY) */}
          {isOnTheWay && (
            <LiveTrackingCard
              artistCoords={artistCoords}
              customerCoords={resolvedCustomerCoords}
              origin={resolvedCustomerCoords}
              destination={artistCoords}
              originLabel="Your Location"
              destLabel={booking?.artist_name || booking?.artist?.user?.name || "Artist Location"}
              mode="customer_to_artist"
              distanceText={distanceText}
              etaText={etaText}
              statusText="Artist is driving to your location"
              onRouteUpdate={(dist, dur) => {
                if (dist !== null && dist !== undefined) {
                  setDistanceText(`${Number(dist).toFixed(1)} km away`);
                }
                if (dur !== null && dur !== undefined) {
                  setEtaText(`Arriving in ~${Math.round(dur)} mins`);
                }
              }}
              onExpand={() => navigation.navigate("LiveTracking", { bookingId: booking.id })}
            />
          )}

          {/* 4. Service Active / Completed Dashboard with Live/Frozen Timer */}
          {(isServiceActive || (isCompleted && (booking?.service_started_at || booking?.check_in_time))) && (
            <ServiceProgressCard
              startTime={booking?.service_started_at || booking?.check_in_time || booking?.checked_in_at || booking?.service_start_time}
              endTime={booking?.check_out_time}
              isCompleted={isCompleted}
              isArtist={false}
              serviceName={booking?.service_name || booking?.package_name || "Mehndi Service"}
              estimatedDurationMinutes={booking?.duration_minutes || 60}
            />
          )}

          {/* 6. Checkout / Remaining Payment Card */}
          {(isCheckout || (isCompleted && booking?.remaining_amount > 0 && booking?.payment_status !== "PAID")) && (
            <CheckoutCard
              booking={booking}
              isArtist={false}
              onPayOnline={handlePayRemainingOnline}
              onPayCash={handlePayRemainingCash}
            />
          )}

          {/* 7. Quick Chat & Call Banner */}
          {!isCancelled && !isCompleted && (
            <BookingChatCard
              otherPartyName={booking?.artist_name || booking?.artist?.user?.name || "Mehndi Artist"}
              phone={booking?.artist_phone || booking?.artist?.user?.phone}
              onOpenChat={() => navigation.navigate("ChatRoom", {
                bookingId: booking.id,
                receiverId: booking.artist_id || booking.artist?.id,
                receiverName: booking?.artist_name || booking?.artist?.user?.name || "Mehndi Artist",
                receiverImage: booking?.artist_image || booking?.artist?.user?.profile_image
              })}
            />
          )}

          {/* 8. Booking Summary Card (Artist, Service, Date/Time, Coverage) */}
          <BookingSummaryCard
            booking={booking}
            isArtistView={false}
            onViewProfile={() => {
              if (booking?.artist_id || booking?.artist?.id) {
                navigation.navigate("ArtistProfile", {
                  artistId: booking.artist_id || booking.artist?.id,
                  from: "BookingDetails"
                });
              }
            }}
          />

          {/* 9. Location Details Card */}
          <BookingLocationCard
            address={booking?.address}
            landmark={booking?.landmark}
            city={booking?.city}
            pincode={booking?.pincode}
            latitude={booking?.latitude}
            longitude={booking?.longitude}
          />

          {/* 10. Financial Amount Breakdown */}
          <BookingAmountCard
            booking={booking}
          />

          {/* 11. Completed State Actions: Invoice & Review */}
          {isCompleted && (
            <View style={styles.completedActionsContainer}>
              <TouchableOpacity
                style={styles.invoiceBtn}
                onPress={() => setInvoiceVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={17} color="#701DDB" style={{ marginRight: 6 }} />
                <Text style={styles.invoiceBtnText}>View Official Invoice</Text>
              </TouchableOpacity>

              <ReviewCard
                artistName={booking?.artist_name || booking?.artist?.user?.name || "Artist"}
                onSubmitReview={handleSubmitReview}
                loading={reviewSubmitting}
                existingReview={booking?.review}
              />
            </View>
          )}

          {/* 12. Pre-Service Customer Actions (Reschedule / Cancel) */}
          {(isPending || isAccepted) && (
            <View style={styles.preServiceActionRow}>
              <TouchableOpacity
                style={styles.rescheduleBtn}
                onPress={() => setRescheduleModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color="#701DDB" />
                <Text style={styles.rescheduleBtnText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCancelModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Invoice Modal */}
      <InvoiceCard
        booking={booking}
        visible={invoiceVisible}
        onClose={() => setInvoiceVisible(false)}
      />

      {/* Cancel Booking Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Cancel Booking?</Text>
            <Text style={styles.modalDesc}>
              Your 10% advance deposit will be processed according to our cancellation and refund policy.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for cancellation..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelling}
              >
                <Text style={styles.modalCancelBtnText}>Keep Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmCancelBtn}
                onPress={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmCancelText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={rescheduleModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBoxLarge}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            <Text style={styles.modalDesc}>Select a new date and time slot for your appointment.</Text>

            <Calendar
              current={rescheduleDate}
              onDayPress={(d) => setRescheduleDate(d.dateString)}
              minDate={new Date().toISOString().split("T")[0]}
              markedDates={{
                [rescheduleDate]: { selected: true, selectedColor: "#E91E63" }
              }}
              theme={{
                selectedDayBackgroundColor: "#E91E63",
                todayTextColor: "#E91E63",
                arrowColor: "#E91E63"
              }}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRescheduleModalVisible(false)}
                disabled={rescheduling}
              >
                <Text style={styles.modalCancelBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRescheduleBtn}
                onPress={handleReschedule}
                disabled={rescheduling}
              >
                {rescheduling ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRescheduleText}>Confirm Date</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={disputeModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Report an Issue / Dispute</Text>
            <Text style={styles.modalDesc}>Let us know if there is an issue with your artist or appointment.</Text>

            <TextInput
              style={styles.modalInput}
              value={disputeDesc}
              onChangeText={setDisputeDesc}
              placeholder="Describe what happened..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDisputeModalVisible(false)}
                disabled={submittingDispute}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDisputeBtn}
                onPress={handleSubmitDispute}
                disabled={submittingDispute}
              >
                {submittingDispute ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDisputeBtnText}>Submit Dispute</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 10,
    fontWeight: "600"
  },
  scrollContent: {
    paddingBottom: 40
  },
  completedActionsContainer: {
    marginHorizontal: 16,
    marginTop: 12
  },
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF"
  },
  invoiceBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#701DDB"
  },
  preServiceActionRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
    height: 44,
    borderRadius: 12,
    gap: 4
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#701DDB"
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    height: 44,
    borderRadius: 12,
    gap: 4
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20
  },
  modalBoxLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%"
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  modalDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 16
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 14,
    fontSize: 13,
    color: "#212121",
    minHeight: 70,
    textAlignVertical: "top"
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#212121"
  },
  modalConfirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center"
  },
  modalConfirmCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  modalConfirmRescheduleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center"
  },
  modalConfirmRescheduleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  modalDisputeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center"
  },
  modalDisputeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
