import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { useSocket } from "../../context/SocketContext";
import { getBookingDetails, getArtistLocation, getDirectionsRoute } from "../../services/booking";
import OptimizedImage from "../../components/OptimizedImage";
import LeafletMapView from "../../components/LeafletMapView";

export default function LiveTrackingScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const bookingId = route.params?.bookingId || route.params?.id;
  const { socket, connected } = useSocket();

  const [booking, setBooking] = useState(null);
  const [artistCoords, setArtistCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [etaText, setEtaText] = useState("Calculating ETA...");
  const [distanceText, setDistanceText] = useState("Waiting for GPS");
  const [artistStatus, setArtistStatus] = useState("Waiting for artist live location");
  const [artistInfo, setArtistInfo] = useState({ name: "Mehndi Artist", phone: "", image: "", address: "" });
  const [gpsLoading, setGpsLoading] = useState(true);

  const customerLocationWatcherRef = useRef(null);

  // 1. Acquire Customer's Real-Time Device GPS Location
  useEffect(() => {
    let isMounted = true;

    async function startCustomerGps() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          // Instant current fix
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          }).catch(() => null);

          if (isMounted && current && current.coords) {
            setCustomerCoords({
              lat: current.coords.latitude,
              lng: current.coords.longitude,
              latitude: current.coords.latitude,
              longitude: current.coords.longitude
            });
            setGpsLoading(false);
          }

          // Real-time moving GPS watch
          customerLocationWatcherRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 4000,
              distanceInterval: 10
            },
            (loc) => {
              if (!isMounted || !loc || !loc.coords) return;
              setCustomerCoords({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
              });
              setGpsLoading(false);
            }
          );
        } else {
          // Permission not granted, fallback to booking coordinates
          setGpsLoading(false);
        }
      } catch (err) {
        console.warn("[LiveTracking] Customer GPS acquisition:", err.message);
        setGpsLoading(false);
      }
    }

    startCustomerGps();

    return () => {
      isMounted = false;
      if (customerLocationWatcherRef.current) {
        customerLocationWatcherRef.current.remove();
        customerLocationWatcherRef.current = null;
      }
    };
  }, []);

  // 2. Fetch Booking & Artist Location from Backend
  const loadData = useCallback(async () => {
    if (!bookingId) return;
    try {
      const details = await getBookingDetails(bookingId);
      if (details) {
        setBooking(details);

        // Fallback for customer coords if device GPS is off
        setCustomerCoords((prev) => {
          if (prev && prev.lat) return prev;
          if (details.latitude && details.longitude) {
            return {
              lat: Number(details.latitude),
              lng: Number(details.longitude),
              latitude: Number(details.latitude),
              longitude: Number(details.longitude)
            };
          }
          return prev;
        });

        if (details.artist_name || details.artist?.user?.name) {
          setArtistInfo((prev) => ({
            ...prev,
            name: details.artist_name || details.artist?.user?.name || prev.name,
            phone: details.artist_phone || details.artist?.user?.phone || prev.phone,
            image: details.artist_image || details.artist?.user?.profile_image || prev.image,
            address: details.artist?.location || details.artist?.city || prev.address
          }));
        }
      }

      const locData = await getArtistLocation(bookingId);
      if (locData) {
        if (locData.latitude && locData.longitude) {
          setArtistCoords({
            lat: Number(locData.latitude),
            lng: Number(locData.longitude),
            latitude: Number(locData.latitude),
            longitude: Number(locData.longitude)
          });
        }
        if (locData.distance_text || locData.distanceText) {
          setDistanceText(locData.distance_text || locData.distanceText);
        }
        if (locData.eta_text || locData.etaText) {
          setEtaText(locData.eta_text || locData.etaText);
        }
        if (locData.tracking_status || locData.trackingStatus) {
          setArtistStatus(locData.tracking_status || locData.trackingStatus);
        }
        if (locData.artist_name || locData.artistName) {
          setArtistInfo((prev) => ({
            ...prev,
            name: locData.artist_name || locData.artistName || prev.name,
            phone: locData.artist_phone || locData.artistPhone || prev.phone,
            image: locData.artist_image || locData.artistImage || prev.image
          }));
        }
      }
    } catch (e) {
      if (__DEV__) console.log("[LiveTracking] Error loading details:", e.message);
    }
  }, [bookingId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 3. Real-time Socket.IO Live Location Listener
  useEffect(() => {
    if (!socket || !bookingId) return;

    socket.emit("join-room", { bookingId });

    const handleLocationUpdate = (payload) => {
      if (payload && payload.latitude && payload.longitude) {
        const newCoords = {
          lat: Number(payload.latitude),
          lng: Number(payload.longitude),
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude)
        };
        setArtistCoords(newCoords);

        if (payload.etaMins || payload.eta_mins) {
          setEtaText(`Arriving in ~${payload.etaMins || payload.eta_mins} mins`);
        }
        if (payload.distanceKm || payload.distance_km) {
          setDistanceText(`${payload.distanceKm || payload.distance_km} km away`);
        }
      }
    };

    const handleStatusUpdate = (payload) => {
      if (payload && (payload.status || payload.detailed_status)) {
        setArtistStatus(payload.status || payload.detailed_status);
        loadData();
      }
    };

    socket.on("artist_location_update", handleLocationUpdate);
    socket.on("artistLocationUpdated", handleLocationUpdate);
    socket.on("location-update", handleLocationUpdate);
    socket.on("booking_status_updated", handleStatusUpdate);
    socket.on("booking-status-updated", handleStatusUpdate);
    socket.on("bookingStatusUpdated", handleStatusUpdate);

    return () => {
      socket.off("artist_location_update", handleLocationUpdate);
      socket.off("artistLocationUpdated", handleLocationUpdate);
      socket.off("location-update", handleLocationUpdate);
      socket.off("booking_status_updated", handleStatusUpdate);
      socket.off("booking-status-updated", handleStatusUpdate);
      socket.off("bookingStatusUpdated", handleStatusUpdate);
    };
  }, [socket, bookingId]);

  // 4. Calculate Driving Route when Coords are Available
  useEffect(() => {
    if (customerCoords?.lat && customerCoords?.lng && artistCoords?.lat && artistCoords?.lng) {
      getDirectionsRoute(
        customerCoords.lat,
        customerCoords.lng,
        artistCoords.lat,
        artistCoords.lng
      ).then((res) => {
        if (res && res.coordinates && res.coordinates.length > 0) {
          setRouteCoordinates(res.coordinates);
          if (res.distanceText) setDistanceText(`${res.distanceText} away`);
          if (res.durationText) setEtaText(`Arriving in ~${res.durationText}`);
        }
      }).catch(() => {});
    }
  }, [customerCoords?.lat, customerCoords?.lng, artistCoords?.lat, artistCoords?.lng]);

  const handleCallArtist = () => {
    const phone = artistInfo.phone || booking?.artist?.user?.phone || booking?.artist_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleChatArtist = () => {
    navigation.navigate("ChatRoom", {
      bookingId,
      receiverId: booking?.artist?.user_id || booking?.artist_id,
      receiverName: artistInfo.name || booking?.artist?.user?.name || booking?.artist_name,
      receiverImage: artistInfo.image || booking?.artist?.user?.profile_image || booking?.artist_image
    });
  };

  const isCheckInVerified =
    Number(booking?.checkin_otp_verified) === 1 ||
    Number(booking?.checkin_verified) === 1 ||
    Number(booking?.check_in_otp_verified) === 1 ||
    ["SERVICE_IN_PROGRESS", "SERVICE_STARTED", "CUSTOMER_VERIFIED", "IN_PROGRESS", "COMPLETED"].includes(
      String(booking?.detailed_status || booking?.status || "").toUpperCase()
    );
  const checkinOtp = booking?.checkin_otp || booking?.check_in_otp;

  const originCoords = customerCoords || (booking?.latitude ? { lat: Number(booking.latitude), lng: Number(booking.longitude) } : null);
  const destinationCoords = artistCoords || (booking?.artist?.latitude ? { lat: Number(booking.artist.latitude), lng: Number(booking.artist.longitude) } : null);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Live Artist Tracking</Text>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      </View>

      {/* Map Display */}
      <View style={styles.map}>
        <LeafletMapView
          customerCoords={originCoords}
          artistCoords={destinationCoords}
          origin={originCoords}
          destination={destinationCoords}
          originLabel="Your Live Location"
          destLabel={artistInfo.name || "Artist Location"}
          mode="customer_to_artist"
          routeCoordinates={routeCoordinates}
          onRouteUpdate={(dist, dur) => {
            if (dist !== null && dist !== undefined) {
              setDistanceText(`${Number(dist).toFixed(1)} km away`);
            }
            if (dur !== null && dur !== undefined) {
              setEtaText(`Arriving in ~${Math.round(dur)} mins`);
            }
          }}
        />
      </View>

      {/* Bottom Floating Info Card */}
      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Artist Profile Header */}
        <View style={styles.artistRow}>
          <OptimizedImage
            source={{
              uri:
                artistInfo.image ||
                booking?.artist?.user?.profile_image ||
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500"
            }}
            style={styles.artistImage}
            width={56}
            height={56}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.artistName}>{artistInfo.name || "Mehndi Artist"}</Text>
            <Text style={styles.artistStatus}>{artistStatus ? artistStatus.replace(/_/g, " ") : etaText}</Text>
            {artistInfo.address ? (
              <Text style={styles.artistAddress} numberOfLines={1}>
                📍 {artistInfo.address}
              </Text>
            ) : null}
          </View>
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={12} color="#059669" />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>

        {/* Check-In PIN Card (Only before check-in is verified) */}
        {!isCheckInVerified && (
          <View style={[styles.checkinCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <Ionicons name="mail" size={16} color="#059669" style={{ marginRight: 6 }} />
              <Text style={[styles.checkinLabel, { color: "#065F46", marginBottom: 0 }]}>Check-In PIN Sent to Email ✉️</Text>
            </View>
            <Text style={[styles.pinHint, { color: "#047857" }]}>
              Please check your registered email inbox for the 4-digit PIN and share with your specialist upon arrival.
            </Text>
          </View>
        )}

        {/* Service In Progress Banner if already verified */}
        {isCheckInVerified && (
          <View style={[styles.checkinCard, { backgroundColor: "#FCE7F3", borderColor: "#FBCFE8" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <Ionicons name="color-palette" size={18} color="#E91E63" style={{ marginRight: 6 }} />
              <Text style={[styles.checkinLabel, { color: "#E91E63", marginBottom: 0 }]}>Service In Progress 🌸</Text>
            </View>
            <Text style={[styles.pinHint, { color: "#9D174D" }]}>Your mehndi service is active. Track progress in details.</Text>
          </View>
        )}

        {/* Quick Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCallArtist}>
            <Ionicons name="call" size={18} color={Colors.primary || "#9C1344"} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleChatArtist}>
            <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary || "#9C1344"} />
            <Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("BookingDetails", { id: bookingId })}
        >
          <Text style={styles.primaryText}>View Booking Details</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 10
  },
  backBtn: { padding: 4 },
  topHeaderTitle: { fontSize: 16, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
    marginRight: 4
  },
  liveTagText: { color: "#065F46", fontWeight: "700", fontSize: 10 },
  map: { flex: 1 },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  artistRow: { flexDirection: "row", alignItems: "center" },
  artistImage: { borderRadius: 28, marginRight: 12 },
  artistName: { fontSize: 16, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  artistStatus: { fontSize: 13, color: Colors.primary || "#9C1344", fontWeight: "600", marginTop: 2 },
  artistAddress: { fontSize: 11, color: "#6B7280", marginTop: 1 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  distanceText: { color: "#065F46", fontWeight: "600", fontSize: 11 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary || "#9C1344",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF1F5"
  },
  actionText: { marginLeft: 6, color: Colors.primary || "#9C1344", fontWeight: "700", fontSize: 13 },
  checkinCard: {
    backgroundColor: "#FDF2F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FBCFE8",
    padding: 12,
    marginTop: 14,
    alignItems: "center"
  },
  checkinLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9D174D",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  pinRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4
  },
  pinBox: {
    width: 38,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DB2777",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  pinDigit: {
    fontSize: 20,
    fontWeight: "800",
    color: "#9D174D"
  },
  pinHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center"
  },
  primaryBtn: {
    marginTop: 12,
    height: 48,
    backgroundColor: Colors.primary || "#9C1344",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryText: { color: Colors.white, fontWeight: "700", fontSize: 14 }
});
