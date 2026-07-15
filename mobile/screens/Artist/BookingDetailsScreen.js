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
  Platform,
  Modal,
  TextInput,
  AppState
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getBookingDetails, acceptBooking, rejectBooking, updateOnTheWay, updateArrived, startService, completeService, confirmCashPayment, rejectCashPayment, sendCheckInOtp, verifyCheckInOtp, sendCheckOutOtp, verifyCheckOutOtp } from "../../services/booking";
import * as Location from "expo-location";
import LeafletMapView from "../../components/LeafletMapView";

// Stepper steps for artist tracking
const STEPS = [
  { key: "PENDING", label: "Requested" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "ARTIST_ACCEPTED", label: "Accepted" },
  { key: "ARTIST_ON_THE_WAY", label: "On The Way" },
  { key: "ARTIST_ARRIVED", label: "Arrived" },
  { key: "SERVICE_STARTED", label: "Started" },
  { key: "COMPLETED", label: "Completed" }
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function BookingDetailsScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [artistCoords, setArtistCoords] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [hasPromptedTravel, setHasPromptedTravel] = useState(false);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [roadDistance, setRoadDistance] = useState(null);
  const [roadDuration, setRoadDuration] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [hasArrivalPopupBeenShown, setHasArrivalPopupBeenShown] = useState(false);
  const [isArrivalModalVisible, setIsArrivalModalVisible] = useState(false);
  const [isCheckInModalVisible, setIsCheckInModalVisible] = useState(false);
  const [isCheckOutModalVisible, setIsCheckOutModalVisible] = useState(false);
  const [checkInOtpText, setCheckInOtpText] = useState("");
  const [checkOutOtpText, setCheckOutOtpText] = useState("");
  const [otpTimer, setOtpTimer] = useState(300);

  const simulateLocation = async () => {
    const customerLat = booking && booking.latitude && parseFloat(booking.latitude) !== 0 ? parseFloat(booking.latitude) : 26.9124;
    const customerLng = booking && booking.longitude && parseFloat(booking.longitude) !== 0 ? parseFloat(booking.longitude) : 75.7873;
    const simulatedCoords = {
      lat: customerLat,
      lng: customerLng
    };
    setArtistCoords(simulatedCoords);
    setPermissionError(null);
    setIsLocationModalVisible(false);
    
    const { startTracking } = require("../../services/trackingService");
    startTracking(booking.id, booking.artist_id).catch(() => {});
    
    Alert.alert(
      "Location Simulated",
      "Developer Mode: Mock location coordinates have been activated successfully!",
      [{ text: "OK" }]
    );
    
    if (pendingAction === 'START_TRAVEL') {
      await handleStartTravelAfterApproval();
      setIsMapFullScreen(true);
    } else if (pendingAction === 'START_SERVICE') {
      await handleStartService();
    }
    setPendingAction(null);
  };

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
      } else {
        const url = "App-Prefs:root=Privacy&path=LOCATION";
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          await Linking.openSettings();
        }
      }
    } catch (e) {
      console.warn("Failed to open location settings:", e.message);
      await Linking.openSettings();
    }
  };

  const handleGrantGPSTap = async () => {
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    let permissionStatus = fgStatus;
    if (permissionStatus !== "granted") {
      const { status: requestStatus } = await Location.requestForegroundPermissionsAsync();
      permissionStatus = requestStatus;
    }

    if (permissionStatus !== "granted") {
      setPermissionError("Location permission denied");
      Alert.alert(
        "Permission Required",
        "Location permission is required to track your travel. Please enable it in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Settings", onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    const providerStatus = await Location.getProviderStatusAsync();
    if (!providerStatus.locationServicesEnabled) {
      await openLocationSettings();
      return;
    }

    const coords = await checkAndGetArtistLocation(true);
    if (coords) {
      setIsLocationModalVisible(false);
      if (pendingAction === 'START_TRAVEL') {
        await handleStartTravelAfterApproval();
        setIsMapFullScreen(true);
      } else if (pendingAction === 'START_SERVICE') {
        await handleStartService();
      }
      setPendingAction(null);
    }
  };

  const checkAndGetArtistLocation = async (showAlert = false) => {
    try {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      let permissionStatus = currentStatus;
      if (permissionStatus !== "granted") {
        const { status: requestStatus } = await Location.requestForegroundPermissionsAsync();
        permissionStatus = requestStatus;
      }

      if (permissionStatus !== "granted") {
        setPermissionError("Location permission denied");
        if (showAlert) {
          Alert.alert(
            "Location Permission Required",
            "Please allow MehndiGo to access your location to navigate and track your arrival for the customer.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Settings", onPress: () => Linking.openSettings() }
            ]
          );
        }
        return null;
      }

      const providerStatus = await Location.getProviderStatusAsync();
      if (!providerStatus.locationServicesEnabled) {
        if (Platform.OS === "android") {
          try {
            await Location.enableNetworkProviderAsync();
          } catch (providerErr) {
            console.warn("Failed to enable network provider, opening settings:", providerErr.message);
            if (showAlert) {
              Alert.alert(
                "GPS Services Disabled",
                "GPS location services are disabled on your device. Please turn on GPS/Location services.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Settings", onPress: () => openLocationSettings() }
                ]
              );
            }
          }
          // Recheck status
          const finalStatus = await Location.getProviderStatusAsync();
          if (!finalStatus.locationServicesEnabled) {
            setPermissionError("GPS location services are disabled");
            return null;
          }
        } else {
          setPermissionError("GPS location services are disabled");
          if (showAlert) {
            Alert.alert(
              "GPS Services Disabled",
              "Please enable Location/GPS services in your device settings to start tracking.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Settings", onPress: () => openLocationSettings() }
              ]
            );
          }
          return null;
        }
      }

      setPermissionError(null);
      setIsLocationModalVisible(false);

      // Try fetching current location with 10-second timeout
      const current = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Location fetch timeout")), 10000))
      ]);

      const coords = {
        lat: current.coords.latitude,
        lng: current.coords.longitude
      };
      setArtistCoords(coords);
      return coords;
    } catch (err) {
      console.warn("[BookingDetails] High accuracy location fetch failed, attempting fallback:", err.message);
      
      // Fallback to last known position
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          const coords = {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude
          };
          setArtistCoords(coords);
          setPermissionError(null);
          setIsLocationModalVisible(false);
          return coords;
        }
      } catch (fallbackErr) {
        console.warn("[BookingDetails] Fallback location fetch also failed:", fallbackErr.message);
      }
      
      setPermissionError("Failed to obtain accurate GPS location");
      return null;
    }
  };

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
    const activeTrackingStatuses = ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "WAITING_FOR_USER_PAYMENT", "COMPLETED"];

    if (activeTrackingStatuses.includes(currentDetailedStatus)) {
      checkAndGetArtistLocation(false);
      const { startTracking } = require("../../services/trackingService");
      startTracking(booking.id, booking.artist_id).catch((err) => {
        console.log("[BookingDetails] Auto start tracking warning:", err.message);
      });
    } else {
      const { stopTracking } = require("../../services/trackingService");
      stopTracking();
    }
  }, [booking]);

  // Auto-prompt Start Travel if booking is ready to travel
  useEffect(() => {
    if (booking && !hasPromptedTravel) {
      const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
      if (currentDetailedStatus === "ARTIST_ACCEPTED" || currentDetailedStatus === "CONFIRMED") {
        setHasPromptedTravel(true);
        Alert.alert(
          "Start Travel?",
          "Would you like to start traveling to the customer location now and share your live tracking?",
          [
            { text: "Later", style: "cancel" },
            { text: "Start Travel", onPress: () => handleStartTravel() }
          ]
        );
      }
    }
  }, [booking, hasPromptedTravel]);

  // AppState change listener to detect returning from settings screen
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active") {
        console.log("[BookingDetails] App returned to foreground. Re-checking GPS status...");
        const providerStatus = await Location.getProviderStatusAsync();
        if (providerStatus.locationServicesEnabled) {
          const coords = await checkAndGetArtistLocation(false);
          if (coords) {
            setIsLocationModalVisible(false);
            if (pendingAction === 'START_TRAVEL') {
              await handleStartTravelAfterApproval();
              setIsMapFullScreen(true);
            } else if (pendingAction === 'START_SERVICE') {
              await handleStartService();
            }
            setPendingAction(null);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [booking, hasPromptedTravel, pendingAction]);

  // Live arrival monitoring: triggers popup when artist reaches customer (distance <= 50m)
  useEffect(() => {
    if (!booking) return;
    const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
    
    console.log("[DEBUG STEP 4 & 5] Arrival Check:", {
      bookingId: booking.id,
      currentDetailedStatus,
      distanceInMeters,
      hasArrivalPopupBeenShown,
      isArrivalModalVisible,
      isCheckInModalVisible
    });

    if (currentDetailedStatus === "ARTIST_ON_THE_WAY" && distanceInMeters !== null) {
      if (distanceInMeters <= 50) {
        console.log("[DEBUG STEP 4] ARRIVAL DETECTED!");
        if (!hasArrivalPopupBeenShown) {
          console.log("[DEBUG STEP 6] TRIGGERING ARRIVAL MODAL POPUP STATE: setting isArrivalModalVisible = true");
          setHasArrivalPopupBeenShown(true);
          setIsArrivalModalVisible(true);
        }
      } else if (distanceInMeters > 80) {
        // Reset so it can trigger again if they move away and return
        setHasArrivalPopupBeenShown(false);
      }
    }
  }, [distanceInMeters, booking, hasArrivalPopupBeenShown]);

  const handleConfirmArrivalFlow = async () => {
    setIsArrivalModalVisible(false);
    setLoading(true);
    try {
      await updateArrived(bookingId);
      await sendCheckInOtp(bookingId);
      setOtpTimer(300);
      setIsCheckInModalVisible(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to confirm arrival");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelArrivalFlow = () => {
    setIsArrivalModalVisible(false);
  };

  // Watch artist location in real-time when ON_THE_WAY to trigger arrival detection
  useEffect(() => {
    if (!booking) return;
    const currentDetailedStatus = booking.detailed_status || booking.booking_status || "PENDING";
    if (currentDetailedStatus !== "ARTIST_ON_THE_WAY") return;

    let locationSubscription = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5
          },
          (location) => {
            if (location && location.coords) {
              const coords = {
                lat: location.coords.latitude,
                lng: location.coords.longitude
              };
              setArtistCoords(coords);
              console.log("[watchPosition] Artist moved:", coords);
            }
          }
        );
      } catch (err) {
        console.warn("[BookingDetailsScreen] watchPositionAsync failed:", err.message);
      }
    };

    startWatching();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [booking]);

  // OTP expiry countdown timer
  useEffect(() => {
    let interval = null;
    if ((isCheckInModalVisible || isCheckOutModalVisible) && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCheckInModalVisible, isCheckOutModalVisible, otpTimer]);

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

  const handleStartTravelAfterApproval = async () => {
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

  const handleStartTravel = async () => {
    const providerStatus = await Location.getProviderStatusAsync();
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    
    if (fgStatus === "granted" && providerStatus.locationServicesEnabled) {
      await handleStartTravelAfterApproval();
      setIsMapFullScreen(true);
    } else {
      setPendingAction('START_TRAVEL');
      setIsLocationModalVisible(true);
    }
  };

  const handleStartServiceTap = async () => {
    const providerStatus = await Location.getProviderStatusAsync();
    const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
    
    if (fgStatus === "granted" && providerStatus.locationServicesEnabled) {
      await handleStartService();
    } else {
      setPendingAction('START_SERVICE');
      setIsLocationModalVisible(true);
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
      await sendCheckOutOtp(bookingId);
      setOtpTimer(300);
      setIsCheckOutModalVisible(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send completion OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCheckInOtp = async () => {
    if (!checkInOtpText || checkInOtpText.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP code");
      return;
    }
    setLoading(true);
    try {
      await verifyCheckInOtp(bookingId, checkInOtpText);
      setIsCheckInModalVisible(false);
      setCheckInOtpText("");
      Alert.alert("Success", "Check-In verified successfully! Service has started.");
      loadDetails();
    } catch (err) {
      Alert.alert("Verification Failed", err.message || "Invalid OTP code. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCheckOutOtp = async () => {
    if (!checkOutOtpText || checkOutOtpText.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP code");
      return;
    }
    setLoading(true);
    try {
      await verifyCheckOutOtp(bookingId, checkOutOtpText);
      setIsCheckOutModalVisible(false);
      setCheckOutOtpText("");
      setIsMapFullScreen(false);
      Alert.alert("Success", "Service completed and verified successfully!");
      loadDetails();
    } catch (err) {
      Alert.alert("Verification Failed", err.message || "Invalid OTP code. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCheckInOtp = async () => {
    setLoading(true);
    try {
      await sendCheckInOtp(bookingId);
      setOtpTimer(300);
      Alert.alert("OTP Sent", "Check-In OTP code has been resent to client.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCheckOutOtp = async () => {
    setLoading(true);
    try {
      await sendCheckOutOtp(bookingId);
      setOtpTimer(300);
      Alert.alert("OTP Sent", "Completion OTP code has been resent to client.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to resend OTP.");
    } finally {
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

  const customerCoords = {
    lat: booking && booking.latitude && parseFloat(booking.latitude) !== 0 ? parseFloat(booking.latitude) : 26.9124,
    lng: booking && booking.longitude && parseFloat(booking.longitude) !== 0 ? parseFloat(booking.longitude) : 75.7873
  };

  const artistCoordsToUse = artistCoords || {
    lat: customerCoords.lat - 0.005,
    lng: customerCoords.lng - 0.005
  };

  const distance = roadDistance !== null ? roadDistance : calculateDistance(artistCoordsToUse.lat, artistCoordsToUse.lng, customerCoords.lat, customerCoords.lng);
  const distanceInMeters = distance !== null ? distance * 1000 : null;

  const walkTime = distance ? Math.round((distance / 5) * 60) : 0;
  const bikeTime = distance ? Math.round((distance / 25) * 60) : 0;
  const carTime = roadDuration !== null ? Math.round(roadDuration) : (distance ? Math.round((distance / 45) * 60) : 0);

  // STEP 1: Customer Location Log
  console.log("[DEBUG STEP 1] Customer Location:", {
    bookingId: booking?.id,
    latitude: customerCoords.lat,
    longitude: customerCoords.lng
  });

  // STEP 2: Artist Live Location Log
  console.log("[DEBUG STEP 2] Artist Live Location:", {
    latitude: artistCoordsToUse.lat,
    longitude: artistCoordsToUse.lng,
    timestamp: new Date().toISOString(),
    isMocked: !artistCoords
  });

  // STEP 3: Distance Calculation Log
  console.log("[DEBUG STEP 3] Distance Calculation:", {
    artistLat: artistCoordsToUse.lat,
    artistLng: artistCoordsToUse.lng,
    customerLat: customerCoords.lat,
    customerLng: customerCoords.lng,
    calculatedDistanceMeters: distanceInMeters
  });

  // STEP 5: State Update Log
  console.log("[DEBUG STEP 5] State Update:", {
    bookingStatus: booking?.booking_status,
    currentStep: currentDetailedStatus,
    isArrived: currentDetailedStatus === "ARTIST_ARRIVED" || currentDetailedStatus === "SERVICE_STARTED" || currentDetailedStatus === "COMPLETED",
    isTracking: ["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY"].includes(currentDetailedStatus),
    showOTPModal: isCheckInModalVisible,
    showArrivalModal: isArrivalModalVisible
  });

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
      if (distanceInMeters !== null && distanceInMeters <= 50) {
        return (
          <View style={styles.footerSingle}>
            <CustomButton title="Verify Check-In OTP" onPress={() => { setOtpTimer(300); setIsCheckInModalVisible(true); }} />
          </View>
        );
      }
      return (
        <View style={styles.footerSingle}>
          <CustomButton title="On The Way (Navigating)" disabled={true} style={{ backgroundColor: Colors.border }} />
        </View>
      );
    }

    if (currentDetailedStatus === "ARTIST_ARRIVED") {
      return (
        <View style={styles.footerSingle}>
          <CustomButton title="Verify Check-In OTP" onPress={() => { setOtpTimer(300); setIsCheckInModalVisible(true); }} />
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

        {/* Navigation Map and Transit Times */}
        {["CONFIRMED", "ARTIST_ACCEPTED", "ACCEPTED", "ARTIST_ON_THE_WAY", "SERVICE_STARTED", "WAITING_FOR_USER_PAYMENT", "COMPLETED"].includes(currentDetailedStatus) && (
          <View style={styles.mapCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Travel Navigation Map</Text>
              <TouchableOpacity 
                style={{ flexDirection: "row", alignItems: "center", padding: 4 }}
                onPress={() => setIsMapFullScreen(true)}
              >
                <Ionicons name="expand-outline" size={16} color={Colors.primary} />
                <Text style={{ fontSize: 11, color: Colors.primary, marginLeft: 4, fontWeight: "600" }}>Full Screen</Text>
              </TouchableOpacity>
            </View>
            
            {/* GPS Warning Banner */}
            {permissionError && (
              <TouchableOpacity 
                style={styles.gpsWarningBanner} 
                onPress={() => setIsLocationModalVisible(true)}
              >
                <Ionicons name="warning" size={16} color="#7A1C1C" />
                <Text style={styles.gpsWarningText}>GPS Disabled: Tap to Enable or Simulate Location</Text>
              </TouchableOpacity>
            )}

            <View style={styles.mapContainer}>
              <View style={{ height: 280, width: "100%", borderRadius: 12, overflow: "hidden" }}>
                <LeafletMapView
                  artistCoords={artistCoordsToUse}
                  customerCoords={customerCoords}
                  heading={0}
                  onRouteUpdate={(dist, dur) => {
                    setRoadDistance(dist);
                    setRoadDuration(dur);
                  }}
                />
              </View>
              
              {/* Distance Indicator */}
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={16} color={Colors.primary} />
                <Text style={styles.distanceText}>Distance: {distance.toFixed(1)} KM</Text>
              </View>
              
              {/* Travel Time Estimations */}
              <View style={styles.transitTimesContainer}>
                <View style={styles.transitModeCard}>
                  <Ionicons name="walk" size={24} color="#666" />
                  <Text style={styles.transitLabel}>Walk</Text>
                  <Text style={styles.transitVal}>{walkTime} mins</Text>
                </View>
                <View style={styles.transitModeCard}>
                  <Ionicons name="bicycle" size={24} color={Colors.primary} />
                  <Text style={styles.transitLabel}>Bike</Text>
                  <Text style={styles.transitVal}>{bikeTime} mins</Text>
                </View>
                <View style={styles.transitModeCard}>
                  <Ionicons name="car" size={24} color={Colors.success} />
                  <Text style={styles.transitLabel}>Car</Text>
                  <Text style={styles.transitVal}>{carTime} mins</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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

      {/* Custom Location Enable Modal */}
      <Modal
        visible={isLocationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="location" size={48} color={Colors.primary} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Enable GPS Tracking</Text>
            
            <Text style={styles.modalDescription}>
              MehndiGo needs your device location to share your journey progress and navigation times with the client.
            </Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleGrantGPSTap}>
              <Text style={styles.modalPrimaryBtnText}>Grant / Enable GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={simulateLocation}>
              <Text style={styles.modalSecondaryBtnText}>Simulate Location (Testing)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsLocationModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Screen Map Modal */}
      <Modal
        visible={isMapFullScreen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setIsMapFullScreen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 16, height: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }} onPress={() => setIsMapFullScreen(false)}>
              <Ionicons name="close" size={20} color={Colors.primary} />
              <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: "700", marginLeft: 4 }}>Exit Map</Text>
            </TouchableOpacity>
            
            <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, textAlign: "center" }}>Booking #{booking.booking_code}</Text>
              <Text style={{ fontSize: 11, color: Colors.textTertiary, textAlign: "center" }}>Client: {booking.user?.name || "Customer"}</Text>
            </View>

            <View style={{ alignItems: "flex-end", minWidth: 60 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>{distance.toFixed(1)} km</Text>
              <Text style={{ fontSize: 10, color: Colors.textTertiary }}>{carTime} mins</Text>
            </View>
          </View>
          
          {/* Full Screen Map Container */}
          <View style={{ flex: 1 }}>
            <LeafletMapView
              artistCoords={artistCoordsToUse}
              customerCoords={customerCoords}
              heading={0}
              onRouteUpdate={(dist, dur) => {
                setRoadDistance(dist);
                setRoadDuration(dur);
              }}
            />
          </View>
          
          {/* Floating Indicators */}
          <View style={{ position: "absolute", bottom: 24, left: 16, right: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 14, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <Ionicons name="navigate" size={16} color={Colors.primary} />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "700", color: Colors.text }}>Distance: {distance.toFixed(1)} KM</Text>
            </View>
            <View style={styles.transitTimesContainer}>
              <View style={styles.transitModeCard}>
                <Ionicons name="walk" size={20} color="#666" />
                <Text style={styles.transitLabel}>Walk: {walkTime}m</Text>
              </View>
              <View style={styles.transitModeCard}>
                <Ionicons name="bicycle" size={20} color={Colors.primary} />
                <Text style={styles.transitLabel}>Bike: {bikeTime}m</Text>
              </View>
              <View style={styles.transitModeCard}>
                <Ionicons name="car" size={20} color={Colors.success} />
                <Text style={styles.transitLabel}>Car: {carTime}m</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Custom Automatic Arrival Detection Modal */}
      <Modal
        visible={isArrivalModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsArrivalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="navigate-circle" size={48} color={Colors.primary} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>You have arrived at the customer's location.</Text>
            <Text style={styles.modalDescription}>
              Please confirm your arrival to start the service.
            </Text>

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { marginTop: 14 }]}
              onPress={handleConfirmArrivalFlow}
            >
              <Text style={styles.modalPrimaryBtnText}>Confirm Arrival</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={handleCancelArrivalFlow}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check-In OTP Modal */}
      <Modal
        visible={isCheckInModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCheckInModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="keypad" size={48} color={Colors.primary} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Check-In Verification</Text>
            <Text style={styles.modalDescription}>
              Ask client {booking?.user?.name || "Customer"} for the Check-In OTP sent to their mobile number ending in {booking?.user?.phone ? booking.user.phone.slice(-4) : "xxxx"}.
            </Text>

            <TextInput
              style={{ borderBottomColor: Colors.primary, borderBottomWidth: 2, textAlign: "center", fontSize: 24, letterSpacing: 8, marginVertical: 18, width: "80%", color: Colors.text }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#999"
              value={checkInOtpText}
              onChangeText={setCheckInOtpText}
            />

            {otpTimer > 0 ? (
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>OTP expires in: {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}</Text>
            ) : (
              <TouchableOpacity style={{ padding: 8 }} onPress={handleResendCheckInOtp}>
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: "700" }}>Resend OTP</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.modalPrimaryBtn, { marginTop: 20 }]} onPress={handleVerifyCheckInOtp}>
              <Text style={styles.modalPrimaryBtnText}>Verify OTP & Start Service</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCheckInModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check-Out OTP Modal */}
      <Modal
        visible={isCheckOutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCheckOutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={48} color={Colors.success} style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Check-Out Verification</Text>
            <Text style={styles.modalDescription}>
              Ask the client for the Completion OTP to securely verify checkout and finalize the service.
            </Text>

            <TextInput
              style={{ borderBottomColor: Colors.success, borderBottomWidth: 2, textAlign: "center", fontSize: 24, letterSpacing: 8, marginVertical: 18, width: "80%", color: Colors.text }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor="#999"
              value={checkOutOtpText}
              onChangeText={setCheckOutOtpText}
            />

            {otpTimer > 0 ? (
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>OTP expires in: {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, "0")}</Text>
            ) : (
              <TouchableOpacity style={{ padding: 8 }} onPress={handleResendCheckOutOtp}>
                <Text style={{ fontSize: 13, color: Colors.success, fontWeight: "700" }}>Resend OTP</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.modalPrimaryBtn, { marginTop: 20, backgroundColor: Colors.success }]} onPress={handleVerifyCheckOutOtp}>
              <Text style={styles.modalPrimaryBtnText}>Verify OTP & Complete Service</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCheckOutModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  completedBannerText: { marginLeft: 8, color: Colors.success, fontWeight: "700", fontSize: 13 },
  mapCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, elevation: 1 },
  mapContainer: { width: "100%", marginTop: 8 },
  distanceBadge: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10, alignSelf: "flex-start" },
  distanceText: { marginLeft: 6, fontSize: 13, fontWeight: "700", color: Colors.text },
  transitTimesContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  transitModeCard: { flex: 1, backgroundColor: Colors.background, padding: 10, marginHorizontal: 4, borderRadius: 10, alignItems: "center" },
  transitLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  transitVal: { fontSize: 12, fontWeight: "700", color: Colors.text, marginTop: 2 },
  loadingMapContainer: { height: 120, justifyContent: "center", alignItems: "center" },
  loadingMapText: { marginTop: 8, fontSize: 12, color: Colors.textSecondary },
  permissionErrorContainer: { height: 160, justifyContent: "center", alignItems: "center", padding: 16 },
  permissionErrorText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 8, marginBottom: 12 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 24, width: "100%", alignItems: "center", elevation: 5 },
  modalIcon: { marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 10, textAlign: "center" },
  modalDescription: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  modalPrimaryBtn: { backgroundColor: Colors.primary, width: "100%", height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  modalPrimaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  modalSecondaryBtn: { backgroundColor: Colors.background, width: "100%", height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  modalSecondaryBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  modalCancelBtn: { width: "100%", height: 44, justifyContent: "center", alignItems: "center" },
  modalCancelBtnText: { color: Colors.textTertiary, fontWeight: "600", fontSize: 13 },
  gpsWarningBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FDE8E8", borderWidth: 1, borderColor: "#F8B4B4", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 12 },
  gpsWarningText: { marginLeft: 8, fontSize: 12, fontWeight: "600", color: "#9B1C1C" }
});
