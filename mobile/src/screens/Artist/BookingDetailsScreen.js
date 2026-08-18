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
  TouchableOpacity
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
        setBooking((prev) => {
          // Stale data protection:
          // If previous state was already IN_PROGRESS (checkin_otp_verified = 1),
          // and incoming data has checkin_otp_verified = 0 or status = ARRIVED due to any network lag/caching,
          // preserve the verified IN_PROGRESS state!
          const prevVerified = prev && (Number(prev.checkin_otp_verified) === 1 || Number(prev.checkin_verified) === 1 || String(prev.detailed_status).toUpperCase() === "SERVICE_IN_PROGRESS");
          const incomingVerified = Number(data.checkin_otp_verified) === 1 || Number(data.checkin_verified) === 1 || String(data.detailed_status).toUpperCase() === "SERVICE_IN_PROGRESS";
          const isFinished = ["COMPLETED", "COMPLETED_CLOSED", "CANCELLED", "CHECKOUT"].includes(String(data.detailed_status || data.status || "").toUpperCase());

          if (prevVerified && !incomingVerified && !isFinished) {
            return {
              ...data,
              status: "in_progress",
              booking_status: "IN_PROGRESS",
              detailed_status: "SERVICE_IN_PROGRESS",
              checkin_otp_verified: 1,
              checkin_verified: true
            };
          }
          return data;
        });
      }
    } catch (err) {
      console.log("Failed to load artist booking details:", err.message);
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

  // Real-time GPS location broadcasting when ON_THE_WAY
  useEffect(() => {
    const status = String(booking?.detailed_status || booking?.booking_status || booking?.status || "").toUpperCase();

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
          console.log("GPS Location watcher notice:", err.message);
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
      await updateArrived(bookingId);
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
  const handleVerifyOtp = async (otp) => {
    setActionLoading(true);
    setOtpError(null);
    try {
      if (otpType === "CHECKIN") {
        const res = await verifyCheckInOtp(bookingId, otp);
        setOtpModalVisible(false);
        // Instantly update local state to IN_PROGRESS so OTP card vanishes without UI lag
        setBooking((prev) => ({
          ...(prev || {}),
          ...(res?.data || res || {}),
          status: "in_progress",
          booking_status: "IN_PROGRESS",
          detailed_status: "SERVICE_IN_PROGRESS",
          checkin_otp_verified: 1,
          checkin_verified: true
        }));
        Alert.alert("Check-In Verified! ✅", "Customer check-in verified. Service is now in progress.");
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
          checkout_otp_verified: 1
        }));
        Alert.alert("Service Completed! 🎉", "Booking completed! Your earnings have been released to your wallet.");
        loadDetails();
      }
    } catch (err) {
      setOtpError(err.message || "Invalid OTP code. Please ask the customer for their 4-digit PIN.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. FINISH & CHECKOUT
  const handleFinishAndCheckout = () => {
    Alert.alert(
      "Complete Mehndi Service?",
      "Are you ready to finish the application and complete service?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed to Checkout",
          onPress: async () => {
            setActionLoading(true);
            try {
              await sendCheckOutOtp(bookingId).catch(() => {});
              setOtpType("CHECKOUT");
              setOtpModalVisible(true);
              loadDetails();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to initiate checkout.");
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
      `Have you received ₹${remaining} in cash from the customer?`,
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
      Alert.alert("Request Sent", `Travel allowance of ₹${amount} sent to customer.`);
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
        <Text style={styles.loadingText}>Loading artist booking details...</Text>
      </SafeAreaView>
    );
  }

  const rawStatus = String(booking?.detailed_status || booking?.booking_status || booking?.status || "PENDING").toUpperCase();
  const isCheckInVerified = Number(booking?.checkin_otp_verified) === 1 || Number(booking?.checkin_verified) === 1;

  const isPending = rawStatus === "PENDING" || rawStatus === "REQUESTED";
  const isAccepted = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED"].includes(rawStatus);
  const isOnTheWay = ["ARTIST_ON_THE_WAY", "ON_THE_WAY"].includes(rawStatus);
  
  // Arrived state is active ONLY when arrived AND check-in OTP is not yet verified
  const isArrived = (rawStatus === "ARTIST_ARRIVED" || rawStatus === "ARRIVED") && !isCheckInVerified;
  
  // Service is active whenever status is in_progress / service_in_progress OR checkin is verified
  const isServiceActive = (["SERVICE_STARTED", "SERVICE_IN_PROGRESS", "IN_PROGRESS", "CUSTOMER_VERIFIED"].includes(rawStatus) || isCheckInVerified) && rawStatus !== "COMPLETED" && rawStatus !== "COMPLETED_CLOSED" && rawStatus !== "CANCELLED";
  
  const isCheckout = ["CHECKOUT", "PAYMENT_REQUIRED"].includes(rawStatus) && rawStatus !== "COMPLETED";
  const isCompleted = rawStatus === "COMPLETED" || rawStatus === "COMPLETED_CLOSED";
  const isCancelled = rawStatus === "CANCELLED" || rawStatus === "REJECTED";

  const customerCoords = booking?.latitude && booking?.longitude ? {
    lat: Number(booking.latitude),
    lng: Number(booking.longitude)
  } : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Header with Status Pill */}
      <BookingStatusHeader
        bookingCode={booking?.booking_code || booking?.booking_number || booking?.id}
        status={rawStatus}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E91E63" />}
      >
        {/* 2. Step Progression Timeline */}
        <BookingTimeline status={rawStatus} isCancelled={isCancelled} />

        {/* 3. PENDING REQUEST ACTIONS (Accept / Reject) */}
        {isPending && (
          <View style={styles.requestActionCard}>
            <View style={styles.requestBadge}>
              <Ionicons name="notifications" size={16} color="#D97706" />
              <Text style={styles.requestBadgeText}>NEW BOOKING REQUEST</Text>
            </View>
            <Text style={styles.requestTitle}>Respond to Customer Request</Text>
            <Text style={styles.requestSubtitle}>
              Customer has selected you for their mehndi appointment. Accept to lock the booking slot.
            </Text>

            <View style={styles.requestBtnRow}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => setRejectModalVisible(true)}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color="#DC2626" />
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={handleAccept}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
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
              <Ionicons name="car-sport" size={20} color="#E91E63" />
              <Text style={styles.actionCardTitle}>Ready for Departure?</Text>
            </View>
            <Text style={styles.actionCardDesc}>
              Tap below when you depart for the customer address to activate live GPS navigation.
            </Text>

            <TouchableOpacity
              style={styles.startTravelBtn}
              onPress={handleStartTravel}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
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
              customerCoords={customerCoords}
              distanceText="Live Transit"
              etaText="On Route"
              statusText="Broadcasting real GPS to customer"
              height={180}
            />

            <View style={styles.actionCard}>
              <TouchableOpacity
                style={styles.arrivedBtn}
                onPress={handleArrived}
                disabled={actionLoading}
                activeOpacity={0.8}
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

        {/* 7. ACTIVE SERVICE (Live Elapsed Timer & Checkout Button) */}
        {isServiceActive && !isCheckout && (
          <ServiceProgressCard
            startTime={booking?.service_started_at || booking?.service_start_time || booking?.checked_in_at || booking?.updated_at || booking?.updatedAt}
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
            onOpenChat={() => navigation.navigate("ChatRoom", {
              bookingId: booking.id,
              receiverId: booking.user_id || booking.user?.id || booking.customer_id,
              receiverName: booking?.customer_name || booking?.user?.name || "Customer",
              receiverImage: booking?.customer_image || booking?.user?.profile_image
            })}
          />
        )}

        {/* 10. Booking Summary Card */}
        <BookingSummaryCard
          booking={booking}
          isArtistView={true}
        />

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
              <Ionicons name="speedometer-outline" size={16} color="#701DDB" style={{ marginRight: 6 }} />
              <Text style={styles.travelAllowanceBtnText}>Request Extra Travel Allowance</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Checkout Completion PIN Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter Customer Completion PIN</Text>
            <Text style={styles.modalDesc}>
              Ask the customer for their 4-digit completion PIN to verify service completion and release your earnings.
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
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Decline Booking Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Decline Request?</Text>
            <Text style={styles.modalDesc}>Please tell the customer why you cannot accept this appointment.</Text>

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
        </View>
      </Modal>

      {/* Travel Charge Request Modal */}
      <Modal visible={travelChargeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
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
        </View>
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
  requestActionCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FDE68A"
  },
  requestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706"
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#212121"
  },
  requestSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16
  },
  requestBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    gap: 6
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626"
  },
  acceptBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#059669",
    gap: 6,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  actionCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#212121"
  },
  actionCardDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 16
  },
  startTravelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E91E63",
    marginTop: 14,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2
  },
  startTravelBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  arrivedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#701DDB",
    shadowColor: "#701DDB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2
  },
  arrivedBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  travelAllowanceContainer: {
    paddingHorizontal: 16,
    marginTop: 8
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
    fontSize: 13,
    fontWeight: "700",
    color: "#701DDB"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#212121",
    textAlign: "center"
  },
  modalDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 16
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#212121",
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 16
  },
  modalInputSingle: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#212121",
    textAlign: "center",
    marginBottom: 16
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12
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
    fontWeight: "700",
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
    fontWeight: "700",
    color: "#FFFFFF"
  },
  modalCloseBtn: {
    marginTop: 12,
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
