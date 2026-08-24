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
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import * as Location from "expo-location";
import {
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  updateOnTheWay,
  updateArrived,
  verifyCheckInOtp,
  sendCheckOutOtp,
  verifyCheckOutOtp,
  completeService,
  confirmCashPayment,
  requestTravelCharge
} from "../../services/booking";
import { useSocket } from "../../context/SocketContext";

// Reusable Modular Booking Components
import BookingStatusHeader from "../../components/booking/BookingStatusHeader";
import BookingTimeline from "../../components/booking/BookingTimeline";
import BookingSummaryCard from "../../components/booking/BookingSummaryCard";
import BookingAmountCard from "../../components/booking/BookingAmountCard";
import BookingLocationCard from "../../components/booking/BookingLocationCard";
import LiveTrackingCard from "../../components/booking/LiveTrackingCard";
import BookingChatCard from "../../components/booking/BookingChatCard";
import OtpVerificationCard from "../../components/booking/OtpVerificationCard";
import ServiceProgressCard from "../../components/booking/ServiceProgressCard";
import CheckoutCard from "../../components/booking/CheckoutCard";

export default function BookingDetailsScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Live Location
  const { socket } = useSocket();
  const [artistCoords, setArtistCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [distanceText, setDistanceText] = useState("");
  const [etaText, setEtaText] = useState("");
  const locationWatcherRef = useRef(null);

  // Modals & Inputs
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [travelChargeModalVisible, setTravelChargeModalVisible] = useState(false);
  const [travelChargeInput, setTravelChargeInput] = useState("");

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpType, setOtpType] = useState("CHECKIN"); // "CHECKIN" or "CHECKOUT"
  const [otpError, setOtpError] = useState(null);

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
    } catch (err) {
      if (__DEV__) console.log("Failed to load artist booking details:", err.message);
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

    pollIntervalRef.current = setInterval(() => {
      const status = String(
        booking?.detailed_status || booking?.booking_status || booking?.status || ""
      ).toUpperCase();
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

  // Socket Live Status Listener
  useEffect(() => {
    if (!socket || !bookingId) return;

    socket.emit("join-room", { bookingId });

    const handleStatusUpdate = () => {
      loadDetails();
    };

    socket.on("booking-status-updated", handleStatusUpdate);
    socket.on("booking_status_updated", handleStatusUpdate);
    socket.on("bookingStatusUpdated", handleStatusUpdate);
    socket.on("service_started", handleStatusUpdate);
    socket.on("SERVICE_STARTED", handleStatusUpdate);
    socket.on("CHECKIN_VERIFIED", handleStatusUpdate);
    socket.on("checkout_otp_received", handleStatusUpdate);
    socket.on("BOOKING_COMPLETED", handleStatusUpdate);
    socket.on("service_completed", handleStatusUpdate);

    return () => {
      socket.off("booking-status-updated", handleStatusUpdate);
      socket.off("booking_status_updated", handleStatusUpdate);
      socket.off("bookingStatusUpdated", handleStatusUpdate);
      socket.off("service_started", handleStatusUpdate);
      socket.off("SERVICE_STARTED", handleStatusUpdate);
      socket.off("CHECKIN_VERIFIED", handleStatusUpdate);
      socket.off("checkout_otp_received", handleStatusUpdate);
      socket.off("BOOKING_COMPLETED", handleStatusUpdate);
      socket.off("service_completed", handleStatusUpdate);
    };
  }, [socket, bookingId, loadDetails]);

  // Real-time GPS location broadcasting when ON_THE_WAY
  useEffect(() => {
    const status = String(
      booking?.detailed_status || booking?.booking_status || booking?.status || ""
    ).toUpperCase();

    if (status === "ARTIST_ON_THE_WAY" || status === "ON_THE_WAY") {
      let isMounted = true;

      (async () => {
        try {
          const { status: perm } = await Location.requestForegroundPermissionsAsync();
          if (perm !== "granted") return;

          locationWatcherRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 4000,
              distanceInterval: 10
            },
            (loc) => {
              if (!isMounted || !loc || !loc.coords) return;
              const coords = {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude
              };
              setArtistCoords(coords);

              // Broadcast through socket & backend API
              if (socket && bookingId) {
                socket.emit("update-location", {
                  bookingId,
                  latitude: coords.lat,
                  longitude: coords.lng,
                  heading: loc.coords.heading,
                  speed: loc.coords.speed
                });
              }

              const { updateArtistLocation } = require("../../services/booking");
              updateArtistLocation({
                bookingId,
                latitude: coords.lat,
                longitude: coords.lng
              }).catch(() => {});
            }
          );
        } catch (err) {
          if (__DEV__) console.log("GPS Location watcher notice:", err.message);
        }
      })();

      return () => {
        isMounted = false;
        if (locationWatcherRef.current) {
          locationWatcherRef.current.remove();
          locationWatcherRef.current = null;
        }
      };
    }
  }, [booking?.detailed_status, booking?.booking_status, booking?.status, bookingId, socket]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  // 1. ACCEPT BOOKING
  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await acceptBooking(bookingId);
      Alert.alert("Accepted! 🎉", "You have accepted this booking request. Please start travel on time.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to accept booking.");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. REJECT BOOKING
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejecting.");
      return;
    }
    setActionLoading(true);
    try {
      await rejectBooking(bookingId, rejectReason.trim());
      setRejectModalVisible(false);
      Alert.alert("Rejected", "Booking request has been rejected.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reject booking.");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. START TRAVEL
  const handleStartTravel = async () => {
    setActionLoading(true);
    try {
      await updateOnTheWay(bookingId);
      Alert.alert("Travel Started! 🚗", "You are now on the way. Your live location is being shared with the customer.");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update travel status.");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. ARRIVED AT LOCATION
  const handleArrived = async () => {
    setActionLoading(true);
    try {
      let lat = null;
      let lng = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (pos?.coords) {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        }
      } catch (locErr) {
        console.warn("[handleArrived] GPS fetch notice:", locErr.message);
      }

      await updateArrived(bookingId, lat, lng);
      Alert.alert("Arrived! 📍", "You have arrived at the customer doorstep. Ask the customer for their 4-digit check-in PIN.");
      setOtpType("CHECKIN");
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to confirm arrival.");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. VERIFY OTP (Check-in or Checkout)
  const handleVerifyOtp = async (otp, explicitType = null) => {
    const activeType = explicitType || otpType;
    setActionLoading(true);
    setOtpError(null);
    try {
      if (activeType === "CHECKIN") {
        const res = await verifyCheckInOtp(bookingId, otp);
        setOtpModalVisible(false);
        setOtpType("CHECKOUT");
        setBooking((prev) => ({
          ...(prev || {}),
          ...(res?.data || res || {}),
          status: "in_progress",
          booking_status: "IN_PROGRESS",
          detailed_status: "SERVICE_IN_PROGRESS",
          checkin_otp_verified: 1,
          checkin_verified: true,
          service_started_at: res?.data?.service_started_at || new Date()
        }));
        Alert.alert("Check-In Verified! ✅", "Customer check-in verified. Service timer is now running.");
        loadDetails();
      } else {
        const res = await verifyCheckOutOtp(bookingId, otp);
        setOtpModalVisible(false);
        setBooking((prev) => ({
          ...(prev || {}),
          ...(res?.data || res || {}),
          status: "completed",
          booking_status: "COMPLETED",
          detailed_status: "COMPLETED",
          checkout_otp_verified: 1,
          check_out_time: res?.data?.check_out_time || new Date()
        }));
        Alert.alert("Service Completed! 🎉", "Booking completed! Timer stopped and earnings released to your wallet.");
        loadDetails();
      }
    } catch (err) {
      setOtpError(err.message || "Invalid PIN. Please ask the customer for the PIN displayed on their app.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. FINISH & CHECKOUT
  const handleFinishAndCheckout = () => {
    Alert.alert(
      "Complete Mehndi Service?",
      "Are you ready to finish application and request the completion PIN from the customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed & Request PIN",
          onPress: async () => {
            setActionLoading(true);
            try {
              await sendCheckOutOtp(bookingId);
              setOtpType("CHECKOUT");
              setOtpModalVisible(true);
              loadDetails();
            } catch (err) {
              Alert.alert("Notice", err.message || "Please request completion PIN from customer.");
              setOtpType("CHECKOUT");
              setOtpModalVisible(true);
              loadDetails();
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // 7. CONFIRM CASH PAYMENT
  const handleConfirmCash = async () => {
    const remaining = Number(booking?.remaining_amount || 0);
    Alert.alert(
      "Confirm Cash Collection",
      `Have you received ₹${remaining.toLocaleString("en-IN")} in cash from the customer?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            setActionLoading(true);
            try {
              await confirmCashPayment(bookingId);
              await completeService(bookingId);
              setBooking((prev) => ({
                ...(prev || {}),
                status: "completed",
                booking_status: "COMPLETED",
                detailed_status: "COMPLETED",
                remaining_amount: 0,
                payment_status: "paid"
              }));
              Alert.alert("Payment Confirmed! 💰", "Cash payment recorded and booking marked complete.");
              loadDetails();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to record cash payment.");
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // 8. REQUEST TRAVEL ALLOWANCE
  const handleRequestTravelCharge = async () => {
    const amount = Number(travelChargeInput);
    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid travel allowance amount.");
      return;
    }
    setActionLoading(true);
    try {
      await requestTravelCharge(bookingId, amount, 10);
      setTravelChargeModalVisible(false);
      Alert.alert("Request Sent", `Travel allowance of ₹${amount.toLocaleString("en-IN")} sent to customer.`);
      loadDetails();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to request travel allowance.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !booking) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Loading appointment details...</Text>
      </SafeAreaView>
    );
  }

  const rawStatus = String(
    booking?.detailed_status || booking?.booking_status || booking?.status || "PENDING"
  ).toUpperCase();
  const isCheckInVerified =
    Number(booking?.checkin_otp_verified) === 1 ||
    Number(booking?.checkin_verified) === 1 ||
    Number(booking?.check_in_otp_verified) === 1 ||
    booking?.check_in_otp_verified === true ||
    ["CUSTOMER_VERIFIED", "SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CHECKOUT", "COMPLETED"].includes(rawStatus);

  const isPending = rawStatus === "PENDING" || rawStatus === "REQUESTED";
  const isAccepted = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(rawStatus);
  const isOnTheWay = ["ARTIST_ON_THE_WAY", "ON_THE_WAY"].includes(rawStatus);

  // Arrived state is active ONLY when arrived AND check-in OTP is not yet verified
  const isArrived = (rawStatus === "ARTIST_ARRIVED" || rawStatus === "ARRIVED") && !isCheckInVerified && !isServiceActive;

  // Service is active whenever status is in_progress / service_in_progress OR checkin is verified
  const isServiceActive =
    (["SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CUSTOMER_VERIFIED"].includes(rawStatus) ||
      isCheckInVerified) &&
    rawStatus !== "COMPLETED" &&
    rawStatus !== "COMPLETED_CLOSED" &&
    rawStatus !== "CANCELLED";

  const isCheckout = ["CHECKOUT", "PAYMENT_REQUIRED"].includes(rawStatus) && rawStatus !== "COMPLETED";
  const isCompleted = rawStatus === "COMPLETED" || rawStatus === "COMPLETED_CLOSED";
  const isCancelled = rawStatus === "CANCELLED" || rawStatus === "REJECTED";

  const resolvedCustomerCoords =
    customerCoords ||
    (booking?.latitude && booking?.longitude
      ? {
          lat: Number(booking.latitude),
          lng: Number(booking.longitude),
          latitude: Number(booking.latitude),
          longitude: Number(booking.longitude)
        }
      : null);

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
          onBack={() => navigation.goBack()}
          onRefresh={handleRefresh}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E91E63" />
          }
        >
          {/* 2. Step Progression Timeline */}
          <BookingTimeline status={rawStatus} isCancelled={isCancelled} />

          {/* 3. PENDING REQUEST ACTIONS (Accept / Reject) */}
          {isPending && (
            <View style={styles.requestActionCard}>
              <View style={styles.requestBadgeRow}>
                <View style={styles.requestBadge}>
                  <Ionicons name="notifications" size={13} color="#D97706" />
                  <Text style={styles.requestBadgeText}>NEW REQUEST</Text>
                </View>
                <Text style={styles.requestPriceTag}>
                  ₹{Number(booking?.final_amount || booking?.total_amount || 0).toLocaleString("en-IN")}
                </Text>
              </View>
              <Text style={styles.requestTitle}>Accept Appointment Request</Text>
              <Text style={styles.requestSubtitle}>
                Client has requested you for their appointment. Accept to confirm your booking slot.
              </Text>

              <View style={styles.requestBtnRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => setRejectModalVisible(true)}
                  disabled={actionLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={17} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={handleAccept}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                      <Text style={styles.acceptBtnText}>Accept Booking</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 4. ACCEPTED ACTIONS (Start Travel CTA) */}
          {isAccepted && (
            <View style={styles.actionCard}>
              <View style={styles.actionCardHeader}>
                <View style={styles.carIconBox}>
                  <Ionicons name="car-sport" size={17} color="#E91E63" />
                </View>
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text style={styles.actionCardTitle} numberOfLines={1}>Ready for Departure?</Text>
                  <Text style={styles.actionCardDesc} numberOfLines={2}>
                    Tap below when you begin travel to share live GPS coordinates with the customer.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.startTravelBtn}
                onPress={handleStartTravel}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="navigate" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.startTravelBtnText}>Start Travel & Share Location</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 5. ON THE WAY ACTIONS (Arrived CTA & Live Map) */}
          {isOnTheWay && (
            <View>
              <LiveTrackingCard
                artistCoords={artistCoords}
                customerCoords={resolvedCustomerCoords}
                origin={artistCoords}
                destination={resolvedCustomerCoords}
                originLabel="Your Live GPS (Artist)"
                destLabel={booking?.user?.name ? `${booking.user.name}'s Location` : "Customer Destination"}
                mode="artist_to_customer"
                distanceText={distanceText || "Live Transit"}
                etaText={etaText || "On Route"}
                statusText={
                  booking?.address
                    ? `Navigating to: ${booking.address}`
                    : "Broadcasting real GPS coordinates to client"
                }
                height={210}
                onRouteUpdate={(dist, dur) => {
                  if (dist !== null && dist !== undefined) {
                    setDistanceText(`${Number(dist).toFixed(1)} km away`);
                  }
                  if (dur !== null && dur !== undefined) {
                    setEtaText(`~${Math.round(dur)} mins`);
                  }
                }}
              />

              <View style={styles.actionCard}>
                <TouchableOpacity
                  style={styles.arrivedBtn}
                  onPress={handleArrived}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.arrivedBtnText}>I have Arrived at Doorstep</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 6. ARRIVED STATE ACTIONS (Enter Check-In OTP - Visible ONLY before verification) */}
          {isArrived && (
            <OtpVerificationCard
              isArtist={true}
              onVerify={handleVerifyOtp}
              loading={actionLoading}
              otpType="CHECKIN"
              errorMessage={otpError}
            />
          )}

          {/* 7. ACTIVE / COMPLETED SERVICE (Live Elapsed Timer & Checkout Button) */}
          {(isServiceActive || (isCompleted && (booking?.service_started_at || booking?.check_in_time))) && !isCheckout && (
            <ServiceProgressCard
              startTime={
                booking?.service_started_at ||
                booking?.check_in_time ||
                booking?.checked_in_at ||
                booking?.service_start_time
              }
              endTime={booking?.check_out_time}
              isCompleted={isCompleted}
              isArtist={true}
              onCheckout={handleFinishAndCheckout}
              serviceName={booking?.service_name || booking?.package_name || "Mehndi Service"}
              estimatedDurationMinutes={booking?.duration_minutes || 60}
            />
          )}

          {/* 8. CHECKOUT / SETTLEMENT CARD */}
          {isCheckout && (
            <CheckoutCard
              booking={booking}
              isArtist={true}
              onConfirmCash={handleConfirmCash}
              loading={actionLoading}
            />
          )}

          {/* 9. Quick Chat & Call Banner */}
          {!isCancelled && !isCompleted && (
            <BookingChatCard
              otherPartyName={booking?.customer_name || booking?.user?.name || "Customer"}
              phone={booking?.customer_phone || booking?.user?.phone}
              onOpenChat={() =>
                navigation.navigate("ChatRoom", {
                  bookingId: booking.id,
                  receiverId: booking.user_id || booking.user?.id || booking.customer_id,
                  receiverName: booking?.customer_name || booking?.user?.name || "Customer",
                  receiverImage: booking?.customer_image || booking?.user?.profile_image
                })
              }
            />
          )}

          {/* 10. Booking Summary Card */}
          <BookingSummaryCard booking={booking} isArtistView={true} />

          {/* 11. Customer Location Card */}
          <BookingLocationCard
            address={booking?.address}
            landmark={booking?.landmark}
            city={booking?.city}
            pincode={booking?.pincode}
            latitude={booking?.latitude}
            longitude={booking?.longitude}
            isArtist={true}
          />

          {/* 12. Financial Amount Breakdown */}
          <BookingAmountCard booking={booking} />

          {/* 13. Travel Allowance Request Option */}
          {isServiceActive && !booking?.travel_charge && (
            <View style={styles.travelAllowanceContainer}>
              <TouchableOpacity
                style={styles.travelAllowanceBtn}
                onPress={() => setTravelChargeModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="speedometer-outline" size={15} color="#701DDB" style={{ marginRight: 6 }} />
                <Text style={styles.travelAllowanceBtnText}>Request Extra Travel Allowance</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Checkout Completion PIN Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="ribbon" size={22} color="#701DDB" />
            </View>
            <Text style={styles.modalTitle} numberOfLines={1}>Service Completion PIN</Text>
            <Text style={styles.modalDesc} numberOfLines={2}>
              Ask the customer for their 4-digit completion PIN to verify service completion and release earnings.
            </Text>

            <OtpVerificationCard
              isArtist={true}
              onVerify={handleVerifyOtp}
              loading={actionLoading}
              otpType={otpType}
              errorMessage={otpError}
            />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setOtpModalVisible(false);
                setOtpError(null);
              }}
              disabled={actionLoading}
            >
              <Text style={styles.modalCloseBtnText}>Close Modal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Decline Booking Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBox}>
            <View style={[styles.modalHeaderIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="close-circle" size={22} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Decline Request?</Text>
            <Text style={styles.modalDesc}>Please provide a reason why you cannot accept this appointment.</Text>

            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g., Slot already occupied, travel distance too far..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDeclineBtn}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeclineBtnText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Travel Charge Request Modal */}
      <Modal visible={travelChargeModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="speedometer" size={22} color="#701DDB" />
            </View>
            <Text style={styles.modalTitle}>Request Travel Allowance</Text>
            <Text style={styles.modalDesc}>Enter additional travel charge (₹) for approval by the customer.</Text>

            <TextInput
              style={styles.modalInputSingle}
              value={travelChargeInput}
              onChangeText={(val) => setTravelChargeInput(val.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 150"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTravelChargeModalVisible(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitChargeBtn}
                onPress={handleRequestTravelCharge}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitChargeBtnText}>Send Request</Text>
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
    backgroundColor: "#FFF8FA"
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFF8FA",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 10,
    fontWeight: "700"
  },
  scrollContent: {
    paddingBottom: 40
  },
  requestActionCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  requestBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 6
  },
  requestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    flexShrink: 0
  },
  requestBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.3
  },
  requestPriceTag: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#059669",
    flexShrink: 0
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2937"
  },
  requestSubtitle: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16
  },
  requestBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 4
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626"
  },
  acceptBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#059669",
    gap: 4,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.2,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  carIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF8FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCE7F3",
    flexShrink: 0
  },
  actionCardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1F2937"
  },
  actionCardDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15
  },
  startTravelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E91E63",
    marginTop: 12,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3
  },
  startTravelBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  arrivedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#701DDB",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3
  },
  arrivedBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  travelAllowanceContainer: {
    paddingHorizontal: 16,
    marginTop: 10
  },
  travelAllowanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  travelAllowanceBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#701DDB"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center"
  },
  modalDesc: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 3,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#1F2937",
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 14
  },
  modalInputSingle: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 14
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10
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
    color: "#6B7280"
  },
  modalDeclineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center"
  },
  modalDeclineBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  modalSubmitChargeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#701DDB",
    justifyContent: "center",
    alignItems: "center"
  },
  modalSubmitChargeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  modalCloseBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280"
  }
});
