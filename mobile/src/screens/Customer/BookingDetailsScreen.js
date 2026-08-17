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
import { useSocket } from "../../context/SocketContext";
import LeafletMapView from "../../components/LeafletMapView";


// Visual mapping for timeline checkpoints
const STEPS = [
  { key: "PENDING", label: "Requested" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "ARTIST_ACCEPTED", label: "Accepted" },
  { key: "ARTIST_ON_THE_WAY", label: "On The Way" },
  { key: "ARTIST_ARRIVED", label: "Arrived" },
  { key: "CUSTOMER_VERIFIED", label: "Verified" },
  { key: "SERVICE_STARTED", label: "Started" },
  { key: "COMPLETED", label: "Completed" }
];

export default function BookingDetailsScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live Location states
  const { socket, connected } = useSocket();
  const [artistCoords, setArtistCoords] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [roadDistance, setRoadDistance] = useState(null);
  const [roadDuration, setRoadDuration] = useState(null);

  // Cancellation Modal states
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule Modal states
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split("T")[0]);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState("10:00 AM - 11:00 AM");

  // Dispute Modal states
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Artist didn't arrive");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Review Modal states
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasPromptedPayment, setHasPromptedPayment] = useState(false);
  const [hasPromptedReview, setHasPromptedReview] = useState(false);

  const loadDetails = async () => {
    try {
      const data = await getBookingDetails(bookingId);
      setBooking(data);

      const status = data.detailed_status || data.booking_status || "PENDING";
      if (status === "COMPLETED") {
        if ((data.payment_status === "PARTIAL" || data.payment_status === "PENDING") && !hasPromptedPayment) {
          setHasPromptedPayment(true);
          Alert.alert(
            "Service Completed 🎉",
            `Remaining payment of ₹${data.remaining_amount} is pending. Please complete the payment.`,
            [
              {
                text: "Pay Online",
                onPress: () => {
                  navigation.navigate("Payment", {
                    bookingId: data.id,
                    bookingCode: data.booking_code,
                    finalAmount: data.final_amount,
                    isSettlement: true
                  });
                }
              },
              {
                text: "Pay Cash",
                onPress: async () => {
                  try {
                    setLoading(true);
                    await selectCashPayment(data.id);
                    Alert.alert("Success", "Cash payment selected. Please pay the artist.");
                    loadDetails();
                  } catch (err) {
                    Alert.alert("Error", err.message || "Failed to select cash payment");
                  } finally {
                    setLoading(false);
                  }
                }
              }
            ]
          );
        }
      }


    } catch (e) {
      Alert.alert("Error", "Could not retrieve booking details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch initial location and register Socket location listener
  useEffect(() => {
    if (!bookingId) return;

    const fetchInitialLocation = async () => {
      try {
        const { getArtistLocation } = require("../../services/booking");
        const locationData = await getArtistLocation(bookingId);
        if (locationData) {
          setArtistCoords({
            lat: Number(locationData.latitude),
            lng: Number(locationData.longitude),
            speed: Number(locationData.speed),
            heading: Number(locationData.heading)
          });
          setLastUpdated(new Date(locationData.updatedAt));
        }
      } catch (err) {
        console.log("[Customer BookingDetails] Initial artist location not available:", err.message);
      }
    };

    fetchInitialLocation();

    if (!socket) return;
    const handleLocationUpdate = (payload) => {
      if (payload && (Number(payload.bookingId) === Number(bookingId) || Number(payload.booking_id) === Number(bookingId))) {
        console.log("[Customer BookingDetails] Socket location update received:", payload);
        setArtistCoords({
          lat: Number(payload.latitude),
          lng: Number(payload.longitude),
          speed: Number(payload.speed || 0),
          heading: Number(payload.heading || 0)
        });
        setLastUpdated(new Date(payload.updatedAt || Date.now()));
      }
    };

    socket.on("artistLocationUpdated", handleLocationUpdate);
    socket.on("artist_location_update", handleLocationUpdate);
    return () => {
      socket.off("artistLocationUpdated", handleLocationUpdate);
      socket.off("artist_location_update", handleLocationUpdate);
    };
  }, [socket, bookingId]);

  // Socket listeners for realtime OTP events, status transitions, service start, and completion
  // Auto re-fetch on focus and initialize
  useEffect(() => {
    if (!bookingId) {
      navigation.replace("CustomerTabs", { screen: "Bookings" });
      return;
    }
    loadDetails();

    const unsubscribeFocus = navigation.addListener("focus", () => {
      loadDetails();
    });

    // 5-second polling when booking is in active travel or service
    const pollInterval = setInterval(() => {
      if (booking) {
        const st = String(booking.detailed_status || booking.booking_status || "").toUpperCase();
        if (["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "ON_THE_WAY", "ARTIST_ARRIVED", "ARRIVED", "CUSTOMER_VERIFIED", "SERVICE_STARTED", "IN_PROGRESS"].includes(st)) {
          getBookingDetails(bookingId).then((data) => {
            if (data) setBooking(data);
          }).catch(() => {});
        }
      }
    }, 5000);

    return () => {
      unsubscribeFocus();
      clearInterval(pollInterval);
    };
  }, [bookingId]);

  useEffect(() => {
    if (!socket || !bookingId) return;

    const handleStatusUpdated = (payload) => {
      console.log("[Customer screen] booking_status_updated received:", payload);
      if (payload && (Number(payload.bookingId) === Number(bookingId) || Number(payload.booking_id) === Number(bookingId))) {
        setBooking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            booking_status: payload.booking_status || payload.status || prev.booking_status,
            detailed_status: payload.detailed_status || payload.status || prev.detailed_status
          };
        });
        loadDetails();
      }
    };

    const handleCheckInOtp = (payload) => {
      console.log("[Customer screen] checkin_otp_received:", payload);
      if (Number(payload.bookingId) === Number(bookingId)) {
        Alert.alert(
          "Check-In OTP Sent",
          "Artist has arrived at your location. A Check-In OTP has been sent to your registered mobile number as a real SMS. Please share it with your artist to verify arrival and start the service."
        );
        loadDetails();
      }
    };

    const handleCheckOutOtp = (payload) => {
      console.log("[Customer screen] checkout_otp_received:", payload);
      if (Number(payload.bookingId) === Number(bookingId)) {
        Alert.alert(
          "Check-Out OTP Sent",
          "Mehndi service has been completed. A Check-Out OTP has been sent to your registered mobile number as a real SMS. Please share it with your artist to verify and complete the booking."
        );
        loadDetails();
      }
    };

    const handleServiceStarted = (payload) => {
      console.log("[Customer screen] service_started:", payload);
      if (Number(payload.bookingId) === Number(bookingId)) {
        loadDetails();
        Alert.alert("Service Started", "Your Mehndi service has officially started!");
      }
    };

    const handleBookingCompleted = (payload) => {
      console.log("[Customer screen] booking_completed:", payload);
      if (Number(payload.bookingId) === Number(bookingId)) {
        loadDetails();
      }
    };

    socket.on("booking_status_updated", handleStatusUpdated);
    socket.on("checkin_otp_received", handleCheckInOtp);
    socket.on("checkout_otp_received", handleCheckOutOtp);
    socket.on("service_started", handleServiceStarted);
    socket.on("booking_completed", handleBookingCompleted);

    return () => {
      socket.off("booking_status_updated", handleStatusUpdated);
      socket.off("checkin_otp_received", handleCheckInOtp);
      socket.off("checkout_otp_received", handleCheckOutOtp);
      socket.off("service_started", handleServiceStarted);
      socket.off("booking_completed", handleBookingCompleted);
    };
  }, [socket, bookingId]);

  // 2. Relative time string refresh ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Helper to validate coordinate values
const isValidCoordinate = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) &&
  Number(value) >= -90 && Number(value) <= 90;

// Calculate straight-line distance (fallback) using Haversine formula
const getDistance = () => {
  if (roadDistance !== null) return roadDistance.toFixed(1);
  if (!booking || !artistCoords) return null;
  const lat1 = Number(booking.latitude);
  const lon1 = Number(booking.longitude);
  const lat2 = artistCoords.lat;
  const lon2 = artistCoords.lng;

  if (!isValidCoordinate(lat1) || !isValidCoordinate(lon1) || !isValidCoordinate(lat2) || !isValidCoordinate(lon2)) {
    return null;
  }

  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

  const getETA = (distanceKm) => {
    if (roadDuration !== null) {
      return `${Math.round(roadDuration)} Minutes`;
    }
    if (!distanceKm) return null;
    const dist = parseFloat(distanceKm);
    let speedKmh = 25; // fallback average speed

    if (artistCoords && artistCoords.speed && artistCoords.speed > 1.39) {
      speedKmh = artistCoords.speed * 3.6;
    }

    const etaMins = Math.round((dist / speedKmh) * 60);
    const finalMins = Math.max(2, Math.min(etaMins, 120));
    return `${finalMins} Minutes`;
  };

  const getRelativeTime = () => {
    if (!lastUpdated) return "Never";
    const diffMs = new Date() - lastUpdated;
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSecs < 10) return "Just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const handleReportDispute = async () => {
    if (!disputeDescription.trim()) {
      Alert.alert("Required", "Please describe the issue or problem you faced.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const { reportBookingDispute } = require("../../services/booking");
      await reportBookingDispute(bookingId, disputeReason, disputeDescription.trim());
      setDisputeModalVisible(false);
      setDisputeDescription("");
      Alert.alert("Dispute Submitted", "Our support & escalation team has received your ticket and will resolve this within 24 hours.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit dispute.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setLoading(true);
      const inv = await getInvoice(bookingId);
      setLoading(false);
      if (inv) {
        if (inv.invoice_url) {
          let url = inv.invoice_url;
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            const { BASE_URL } = require("../../services/api");
            url = `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
          }
          await Linking.openURL(url);
        } else {
          Alert.alert(
            `Tax Invoice (${inv.invoice_number || "MG-" + bookingId})`,
            `Booking Ref: ${inv.booking_number || "MG-" + bookingId}\nCustomer: ${inv.customer_name || "Valued Customer"}\nArtist: ${inv.artist_name || "Mehndi Specialist"}\nService: ${inv.service_title || "Mehndi Service"}\nDate: ${inv.booking_date || ""}\n\nTotal Amount: ₹${inv.total_amount}\nPaid Amount: ₹${inv.advance_paid}\nRemaining: ₹${inv.remaining_amount}\nStatus: ${inv.payment_status}\nTxn ID: ${inv.transaction_id || "N/A"}`,
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert("Notice", "Invoice document is not generated yet.");
      }
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message || "Invoice details currently unavailable.");
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
      setHasPromptedReview(true);
      loadDetails();
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

  const currentDetailedStatus = String(booking.detailed_status || booking.booking_status || booking.status || "PENDING").toUpperCase();

  const getActiveStepIndex = (statusStr) => {
    const st = String(statusStr || "").toUpperCase();
    if (["COMPLETED", "COMPLETED_CLOSED", "AWAITING_CASH_CONFIRMATION"].includes(st)) return 7;
    if (["SERVICE_STARTED", "IN_PROGRESS"].includes(st)) return 6;
    if (["CUSTOMER_VERIFIED", "CHECKED_IN"].includes(st)) return 5;
    if (["ARTIST_ARRIVED", "ARRIVED"].includes(st)) return 4;
    if (["ARTIST_ON_THE_WAY", "ON_THE_WAY"].includes(st)) return 3;
    if (["ARTIST_ACCEPTED", "ACCEPTED"].includes(st)) return 2;
    if (["CONFIRMED", "WAITING_FOR_USER_PAYMENT"].includes(st)) return 1;
    return 0;
  };

  const activeStepIndex = getActiveStepIndex(currentDetailedStatus);

  const canChat = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "ON_THE_WAY", "ARRIVED", "ARTIST_ARRIVED", "SERVICE_STARTED", "IN_PROGRESS", "COMPLETED", "COMPLETED_CLOSED"].includes(currentDetailedStatus);

  const getMoment = () => {
    const m = require("moment");
    return typeof m === "function" ? m : (m.default || m);
  };

  const formatTime = (timeVal) => {
    if (!timeVal) return "TBD";
    if (typeof timeVal === "string" && (timeVal.includes("AM") || timeVal.includes("PM") || timeVal.includes("-"))) {
      return timeVal.trim();
    }
    try {
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
      const m = localMoment(timeVal, formats);
      return m.isValid() ? m.format("hh:mm A") : String(timeVal);
    } catch (e) {
      return String(timeVal);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "TBD";
    try {
      const localMoment = getMoment();
      const m = localMoment(dateVal);
      return m.isValid() ? m.format("DD MMM YYYY (dddd)") : String(dateVal);
    } catch (e) {
      return String(dateVal);
    }
  };

  const getBookingDate = (b) => {
    if (!b) return "TBD";
    const rawDate = b.booking_date || b.date || b.event_date || b.reschedule_date || b.slot?.date || b.slot?.start_time || b.created_at;
    return formatDate(rawDate);
  };

  const getBookingTime = (b) => {
    if (!b) return "TBD";
    const rawTime = b.booking_time || b.time || b.time_slot || b.reschedule_time || (b.slot ? `${formatTime(b.slot.start_time)} - ${formatTime(b.slot.end_time)}` : null) || b.slot?.time_label;
    return formatTime(rawTime);
  };

  const resolveImage = (uri) => {
    const placeholder = `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.artist_name || "Mehndi Artist")}&background=F3E8FF&color=7C3AED`;
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

        {/* Live Tracking Map Card */}
        {booking && ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY"].includes(currentDetailedStatus) && (
          <View style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingTitleRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.trackingTitle}>Live Tracking</Text>
              </View>
              <View style={[
                styles.connBadge,
                connected ? styles.connBadgeSuccess : styles.connBadgeWarn
              ]}>
                <View style={[
                  styles.connIndicator,
                  connected ? styles.connIndicatorSuccess : styles.connIndicatorWarn
                ]} />
                <Text style={[
                  styles.connText,
                  connected ? styles.connTextSuccess : styles.connTextWarn
                ]}>
                  {connected ? "Connected" : "Reconnecting..."}
                </Text>
              </View>
            </View>

            <LeafletMapView
              customerCoords={{ 
                lat: Number(booking.latitude || 26.9124), 
                lng: Number(booking.longitude || 75.7873) 
              }}
              artistCoords={artistCoords}
              onRouteUpdate={(dist, dur) => {
                setRoadDistance(dist);
                setRoadDuration(dur);
              }}
            />

            <View style={styles.trackingStats}>
              <Text style={styles.trackingStatusText}>Artist is on the way</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Distance</Text>
                  <Text style={styles.statVal}>{getDistance() ? `${getDistance()} KM Away` : "Calculating..."}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Estimated Arrival</Text>
                  <Text style={styles.statVal}>{getDistance() ? getETA(getDistance()) : "Calculating..."}</Text>
                </View>
              </View>
              <Text style={styles.lastUpdatedText}>
                Last Updated: {getRelativeTime()}
              </Text>
            </View>
          </View>
        )}

        <Image
          source={{ uri: resolveImage(booking.artist_image || booking.artist?.profile_image || booking.artist?.user?.profile_image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.artist_name || "Mehndi Artist")}&background=F3E8FF&color=7C3AED` }}
          style={styles.artistImage}
        />

        <View style={styles.content}>
          {/* 1. Doorstep Check-In OTP Card (Visible to customer when artist is approaching / arrived) */}
          {(currentDetailedStatus === "ARTIST_ON_THE_WAY" || currentDetailedStatus === "ON_THE_WAY" || currentDetailedStatus === "ARTIST_ARRIVED" || currentDetailedStatus === "ARRIVED" || currentDetailedStatus === "CHECK_IN_PENDING") && Boolean(booking.checkin_otp) && (
            <View style={styles.checkinOtpCard}>
              <View style={styles.checkinOtpHeader}>
                <Ionicons name="key" size={20} color="#059669" />
                <Text style={styles.checkinOtpTitle}>Doorstep Check-In OTP</Text>
              </View>
              <Text style={styles.checkinOtpSubtitle}>
                Share this 4-digit OTP with your artist when they reach your location to verify arrival and start service:
              </Text>
              <View style={styles.checkinOtpDigitsRow}>
                {String(booking.checkin_otp).split("").map((digit, i) => (
                  <View key={i} style={styles.checkinOtpDigitBox}>
                    <Text style={styles.checkinOtpDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.checkinOtpSecurityNote}>
                📍 Artist must enter this OTP at your doorstep to check in.
              </Text>
            </View>
          )}

          {/* 2. Customer Verified Notice Banner */}
          {currentDetailedStatus === "CUSTOMER_VERIFIED" && (
            <View style={styles.verifiedNoticeCard}>
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.verifiedNoticeTitle}>Artist Arrived & Customer Verified</Text>
                <Text style={styles.verifiedNoticeSub}>Artist is preparing to start your Mehndi service.</Text>
              </View>
            </View>
          )}

          {/* 3. Service Completion PIN Card (Visible during active service) */}
          {(currentDetailedStatus === "SERVICE_STARTED" || currentDetailedStatus === "IN_PROGRESS" || currentDetailedStatus === "SERVICE_COMPLETED_PENDING_CHECKOUT") && Boolean(booking.completion_pin || booking.checkout_otp) && (
            <View style={styles.pinCard}>
              <View style={styles.pinCardHeader}>
                <Ionicons name="keypad" size={20} color="#B45309" />
                <Text style={styles.pinCardTitle}>Service Completion PIN</Text>
              </View>
              <Text style={styles.pinCardSubtitle}>
                Share this 4-digit PIN with the artist <Text style={{fontWeight: "700", color: "#92400E"}}>ONLY</Text> after your Mehndi design is completely finished:
              </Text>
              <View style={styles.pinDigitsRow}>
                {String(booking.completion_pin || booking.checkout_otp).split("").map((digit, i) => (
                  <View key={i} style={styles.pinDigitBox}>
                    <Text style={styles.pinDigitText}>{digit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.pinSecurityNote}>
                🔒 Instant PIN verification ensures the artist gets credited only after full work satisfaction.
              </Text>
            </View>
          )}

          {/* Selected Art Card */}
          {(Boolean(booking.selected_art_title) || Boolean(booking.selected_art_image)) && (
            <View style={styles.selectedArtCard}>
              <View style={styles.selectedArtHeader}>
                <Ionicons name="color-palette" size={18} color={Colors.primary} />
                <Text style={styles.selectedArtHeaderTitle}>Selected Mehndi Design</Text>
              </View>
              <View style={styles.selectedArtContentRow}>
                {Boolean(booking.selected_art_image) && (
                  <Image source={{ uri: booking.selected_art_image }} style={styles.selectedArtThumb} />
                )}
                <View style={styles.selectedArtInfo}>
                  <Text style={styles.selectedArtTitle} numberOfLines={1}>{booking.selected_art_title || "Custom Art Design"}</Text>
                  <View style={styles.selectedArtBadgeRow}>
                    <View style={[styles.tierBadge, booking.selected_art_tier === "PREMIUM" ? styles.premiumBadge : styles.standardBadge]}>
                      <Text style={[styles.tierBadgeText, booking.selected_art_tier === "PREMIUM" ? styles.premiumBadgeText : styles.standardBadgeText]}>
                        {booking.selected_art_tier === "PREMIUM" ? "💎 PREMIUM ART" : "✨ STANDARD ART"}
                      </Text>
                    </View>
                    <View style={styles.durationBadge}>
                      <Ionicons name="time-outline" size={12} color="#475569" />
                      <Text style={styles.durationBadgeText}>{booking.selected_art_duration || 60} Mins</Text>
                    </View>
                  </View>
                  {Boolean(booking.selected_art_price) && (
                    <Text style={styles.selectedArtPriceText}>Art Price: ₹{booking.selected_art_price}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

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

          {/* Assigned Specialist Card */}
          {(booking.artist_name || booking.artist_id || booking.artist) && (
            <View style={styles.artistCardContainer}>
              <Text style={styles.artistCardHeaderTitle}>Assigned Specialist Details</Text>
              <View style={styles.artistCardBody}>
                <Image
                  source={{ uri: resolveImage(booking.artist_image || booking.artist?.profile_image || booking.artist?.user?.profile_image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.artist_name || "Mehndi Artist")}&background=F3E8FF&color=7C3AED` }}
                  style={styles.artistCardAvatar}
                />
                <View style={styles.artistCardMeta}>
                  <View style={styles.artistCardNameRow}>
                    <Text style={styles.artistCardName}>{booking.artist_name || booking.artist?.user?.name || booking.artist?.name || "Mehndi Specialist"}</Text>
                    <View style={styles.verifiedTag}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.artistCardSubText}>
                    {booking.artist_city || booking.artist?.city ? `Location: ${booking.artist_city || booking.artist?.city} • ` : ""}⭐ {booking.artist_rating || booking.artist?.rating || "5.0"} Rating
                  </Text>
                  <Text style={styles.artistCardPhone}>
                    📞 {booking.artist_phone || booking.artist?.phone || booking.artist?.user?.phone || "Phone verified"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewArtistProfileBtn}
                onPress={() => navigation.navigate("ArtistProfile", { artistId: booking.artist_id })}
              >
                <Text style={styles.viewArtistProfileText}>View Full Artist Profile</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.card}>
            <DetailRow icon="person-outline" label="Artist ID" value={`ART-${booking.artist_id}`} />

            <DetailRow icon="bookmark-outline" label="Booking ID" value={`#${booking.booking_code}`} />
            <DetailRow icon="information-circle-outline" label="Booking Status" value={currentDetailedStatus} />
            <DetailRow icon="cash-outline" label="Payment Status" value={booking.payment_status} />
            <DetailRow
              icon="calendar-outline"
              label="Date"
              value={getBookingDate(booking)}
            />
             <DetailRow
              icon="time-outline"
              label="Time Slot"
              value={getBookingTime(booking)}
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
              value={`₹${booking.advance_paid || 0}`}
            />
            <DetailRow
              icon="cash-outline"
              label="Remaining Amount"
              value={`₹${booking.remaining_amount !== undefined ? booking.remaining_amount : ((booking.total_amount || 0) - (booking.advance_paid || 0))}`}
            />
          </View>

          {/* Travel Charge Request Warning Card */}
          {booking.travel_charge_status === "REQUESTED" && (
            <View style={[styles.card, { backgroundColor: "#FFFBEB", borderColor: "#F59E0B", borderWidth: 1 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="warning-outline" size={22} color="#D97706" />
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#92400E", marginLeft: 6 }}>
                  Additional Travel Charge Requested
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: "#78350F", lineHeight: 18, marginBottom: 12 }}>
                ⚠️ The artist has requested an additional distance/travel charge of ₹{booking.travel_charge} ({booking.travel_distance_km || "N/A"} KM). Please review and confirm this amount.
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#10B981", paddingVertical: 10, borderRadius: 8, alignItems: "center" }}
                  onPress={async () => {
                    try {
                      const { respondTravelCharge } = require("../../services/booking");
                      await respondTravelCharge(booking.id, "ACCEPT");
                      Alert.alert("Success", "Travel charge accepted.");
                      loadDetails();
                    } catch (e) {
                      Alert.alert("Error", e.message || "Failed to accept travel charge.");
                    }
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>Accept ₹{booking.travel_charge}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: "#EF4444", paddingVertical: 10, borderRadius: 8, alignItems: "center" }}
                  onPress={async () => {
                    try {
                      const { respondTravelCharge } = require("../../services/booking");
                      await respondTravelCharge(booking.id, "REJECT");
                      Alert.alert("Declined", "Travel charge declined.");
                      loadDetails();
                    } catch (e) {
                      Alert.alert("Error", e.message || "Failed to decline travel charge.");
                    }
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 14 }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Pricing detail breakdown collapse */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Pricing Details</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Base Service Amount</Text>
              <Text style={styles.priceVal}>₹{booking.base_service_amount || booking.service_price || booking.total_amount || 0}</Text>
            </View>
            {Number(booking.travel_charge || 0) > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.priceLabel}>Travel / Distance Fee ({booking.travel_charge_status || "CONFIRMED"})</Text>
                <Text style={[styles.priceVal, { color: booking.travel_charge_status === "CONFIRMED" ? Colors.primary : "#9CA3AF" }]}>
                  ₹{booking.travel_charge}
                </Text>
              </View>
            )}
            {Number(booking.coupon_discount || booking.discount || 0) > 0 && (
              <View style={styles.pricingRow}>
                <Text style={[styles.priceLabel, { color: Colors.primary }]}>Discount</Text>
                <Text style={[styles.priceVal, { color: Colors.primary }]}>-₹{booking.coupon_discount || booking.discount}</Text>
              </View>
            )}
            <View style={styles.cardDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.totalPriceLabel}>Total Payable Amount</Text>
              <Text style={styles.totalPriceVal}>₹{booking.customer_total_amount || booking.total_amount || booking.service_price || 0}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Advance Paid</Text>
              <Text style={[styles.priceVal, { color: Colors.success || "#10B981", fontWeight: "600" }]}>₹{booking.advance_paid || 0}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.priceLabel}>Remaining Due</Text>
              <Text style={[styles.priceVal, { color: Colors.primary, fontWeight: "600" }]}>₹{booking.remaining_amount !== undefined ? booking.remaining_amount : ((booking.total_amount || 0) - (booking.advance_paid || 0))}</Text>
            </View>
          </View>


          {/* Action options */}
          {canChat ? (
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
                    bookingId: booking.id,
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
          ) : (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingText}>Waiting for artist to accept your booking.</Text>
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

          {/* Report Issue / Dispute Option */}
          {(["COMPLETED", "COMPLETED_CLOSED", "CANCELLED", "CONFIRMED"].includes(currentDetailedStatus)) && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10, borderColor: "#EF4444" }]}
              onPress={() => setDisputeModalVisible(true)}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={[styles.secondaryBtnText, { color: "#EF4444" }]}>Report Issue / Dispute</Text>
            </TouchableOpacity>
          )}

          {/* Invoice option */}
          {(["PAID", "SUCCESS", "ADVANCE_PAID", "SETTLED"].includes(booking.payment_status) || ["COMPLETED", "COMPLETED_CLOSED", "ACCEPTED", "CONFIRMED"].includes(currentDetailedStatus)) && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginTop: 10 }]}
              onPress={handleDownloadInvoice}
            >
              <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Download Invoice Receipt</Text>
            </TouchableOpacity>
          )}

          {/* Review options */}
          {(() => {
            const isAlreadyReviewed = currentDetailedStatus === "COMPLETED_CLOSED" || !!booking?.review || booking?.is_reviewed || booking?.has_reviewed;
            if (isAlreadyReviewed) {
              return (
                <View style={styles.reviewedBanner}>
                  <Ionicons name="checkmark-circle-sharp" size={18} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={styles.reviewedBannerText}>
                    {booking?.review?.rating ? `Reviewed ⭐ ${booking.review.rating}/5 • Thank you for your feedback!` : "Review Submitted • Thank you for your feedback!"}
                  </Text>
                </View>
              );
            }
            if (currentDetailedStatus === "COMPLETED") {
              return (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginTop: 10, borderColor: Colors.success }]}
                  onPress={() => setReviewModalVisible(true)}
                >
                  <Ionicons name="star" size={16} color={Colors.success} />
                  <Text style={[styles.secondaryBtnText, { color: Colors.success }]}>Write Professional Review</Text>
                </TouchableOpacity>
              );
            }
            return null;
          })()}
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

      {/* Cancel Modal with Policy */}
      <Modal visible={cancelModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            
            <View style={{ backgroundColor: "#F8FAFC", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.text, marginBottom: 4 }}>📋 Cancellation Refund Policy:</Text>
              <Text style={{ fontSize: 11, color: Colors.textSecondary }}>• &gt;24 hrs before slot: 100% full refund</Text>
              <Text style={{ fontSize: 11, color: Colors.textSecondary }}>• 12 - 24 hrs before slot: 50% partial refund</Text>
              <Text style={{ fontSize: 11, color: Colors.textSecondary }}>• &lt;12 hrs before slot: No refund (cancellation fee)</Text>
            </View>

            <Text style={styles.modalSub}>
              Please explain why you want to cancel this booking request.
            </Text>
            <TextInput
              placeholder="Cancellation Reason..."
              placeholderTextColor={Colors.textTertiary}
              style={[styles.modalInput, { height: 70, textAlignVertical: "top" }]}
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

      {/* Dispute / Issue Modal */}
      <Modal visible={disputeModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Booking Dispute</Text>
            <Text style={styles.modalSub}>Select issue reason and provide details:</Text>
            
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[
                "Artist didn't arrive",
                "Artist arrived late",
                "Design mismatch",
                "Incomplete service",
                "Payment issue",
                "Poor hygiene",
                "Other"
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setDisputeReason(reason)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: disputeReason === reason ? Colors.primary : "#CBD5E1",
                    backgroundColor: disputeReason === reason ? "#FEF2F2" : "#FFF"
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: disputeReason === reason ? "700" : "500", color: disputeReason === reason ? Colors.primary : Colors.text }}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Explain the problem in detail..."
              placeholderTextColor={Colors.textTertiary}
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              multiline
              value={disputeDescription}
              onChangeText={setDisputeDescription}
            />

            <CustomButton
              title={submittingDispute ? "Submitting..." : "Submit Dispute to Admin"}
              onPress={handleReportDispute}
              style={{ marginTop: 12, backgroundColor: "#EF4444" }}
              disabled={submittingDispute}
            />
            <TouchableOpacity style={styles.modalCancelLink} onPress={() => setDisputeModalVisible(false)}>
              <Text style={styles.modalCancelLinkText}>Cancel</Text>
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
      {/* Modals removed for production privacy */}
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
  scrollContent: { paddingBottom: 180 },

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
  pendingBanner: { backgroundColor: Colors.warning + "15", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  pendingText: { color: Colors.warning, fontSize: 13, fontWeight: "600" },
  modalCancelLinkText: { fontSize: 12, color: Colors.textTertiary, fontWeight: "600" },
  starsRow: { flexDirection: "row", justifyContent: "center", marginVertical: 14 },

  // Live Tracking Map Card Styles
  trackingCard: { margin: 16, padding: 14, backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  trackingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  trackingTitleRow: { flexDirection: "row", alignItems: "center" },
  trackingTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginLeft: 6 },
  connBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: "#FFF1F2" },
  connBadgeSuccess: { backgroundColor: "#F0FDF4" },
  connBadgeWarn: { backgroundColor: "#FEF3C7" },
  connIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  connIndicatorSuccess: { backgroundColor: Colors.success },
  connIndicatorWarn: { backgroundColor: "#F59E0B" },
  connText: { fontSize: 10, fontWeight: "600" },
  connTextSuccess: { color: Colors.success },
  connTextWarn: { color: "#D97706" },
  trackingStats: { marginTop: 12, alignItems: "center" },
  trackingStatusText: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  statCol: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 2 },
  statVal: { fontSize: 14, fontWeight: "800", color: Colors.primary },
  statDivider: { width: 1, height: "80%", backgroundColor: Colors.border, alignSelf: "center" },
  lastUpdatedText: { fontSize: 9, color: Colors.textTertiary, marginTop: 8 },
  reviewedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  reviewedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
    flex: 1,
  },

  // Assigned Specialist Card Styles
  artistCardContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  artistCardHeaderTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  artistCardBody: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistCardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  artistCardMeta: {
    flex: 1,
    marginLeft: 14,
  },
  artistCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  verifiedTag: {
    backgroundColor: "#059669",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  artistCardSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  artistCardPhone: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 3,
  },
  viewArtistProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },

  viewArtistProfileText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginRight: 6,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7E6",
    borderWidth: 1,
    borderColor: "#FFECB3",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B58900",
    flex: 1,
  },
  checkinOtpCard: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#059669",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  checkinOtpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkinOtpTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065F46",
    marginLeft: 8,
  },
  checkinOtpSubtitle: {
    fontSize: 13,
    color: "#047857",
    lineHeight: 18,
    marginBottom: 12,
  },
  checkinOtpDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 6,
  },
  checkinOtpDigitBox: {
    width: 48,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkinOtpDigitText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#065F46",
  },
  checkinOtpSecurityNote: {
    fontSize: 11,
    color: "#065F46",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
  },
  verifiedNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  verifiedNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  verifiedNoticeSub: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  pinCard: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  pinCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  pinCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
    marginLeft: 8,
  },
  pinCardSubtitle: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 18,
    marginBottom: 12,
  },
  pinDigitsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 6,
  },
  pinDigitBox: {
    width: 48,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D97706",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinDigitText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#92400E",
  },
  pinSecurityNote: {
    fontSize: 11,
    color: "#92400E",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
  },
  selectedArtCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedArtHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedArtHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginLeft: 6,
  },
  selectedArtContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedArtThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    marginRight: 12,
  },
  selectedArtInfo: {
    flex: 1,
  },
  selectedArtTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  selectedArtBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  tierBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  premiumBadge: {
    backgroundColor: "#EDE9FE",
    borderWidth: 1,
    borderColor: "#C4B5FD",
  },
  standardBadge: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  premiumBadgeText: {
    color: "#7C3AED",
  },
  standardBadgeText: {
    color: "#475569",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 3,
  },
  selectedArtPriceText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
  },
});


