import React, { useEffect, useState, useRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View, Linking } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { useSocket } from "../../context/SocketContext";
import { getBookingDetails } from "../../services/booking";
import OptimizedImage from "../../components/OptimizedImage";

import LeafletMapView from "../../components/LeafletMapView";

export default function LiveTrackingScreen({ route, navigation }) {
  const bookingId = route.params?.bookingId || route.params?.id;
  const { socket, connected } = useSocket();

  const [booking, setBooking] = useState(null);
  const [artistCoords, setArtistCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [etaText, setEtaText] = useState("Calculating ETA...");
  const [distanceText, setDistanceText] = useState("Waiting for location");
  const [artistStatus, setArtistStatus] = useState("Waiting for artist live location");
  const [artistInfo, setArtistInfo] = useState({ name: "Mehndi Artist", phone: "", image: "" });

  const mapRef = useRef(null);

  const loadData = async () => {
    if (!bookingId) return;
    try {
      const details = await getBookingDetails(bookingId);
      if (details) {
        setBooking(details);
        if (details.latitude && details.longitude) {
          setCustomerCoords({
            latitude: Number(details.latitude),
            longitude: Number(details.longitude),
            lat: Number(details.latitude),
            lng: Number(details.longitude),
          });
        }
        if (details.artist_name || details.artist?.user?.name) {
          setArtistInfo((prev) => ({
            ...prev,
            name: details.artist_name || details.artist?.user?.name || prev.name,
            phone: details.artist_phone || details.artist?.user?.phone || prev.phone,
            image: details.artist_image || details.artist?.user?.profile_image || prev.image,
          }));
        }
      }

      const { getArtistLocation } = require("../../services/booking");
      const locData = await getArtistLocation(bookingId);
      if (locData) {
        if (locData.latitude && locData.longitude) {
          setArtistCoords({
            latitude: Number(locData.latitude),
            longitude: Number(locData.longitude),
            lat: Number(locData.latitude),
            lng: Number(locData.longitude),
          });
        }
        if (locData.distance_text || locData.distanceText) {
          setDistanceText(locData.distance_text || locData.distanceText);
        }
        if (locData.eta_text || locData.etaText) {
          setEtaText(locData.eta_text || locData.etaText);
        }
        if (locData.tracking_status) {
          setArtistStatus(locData.tracking_status);
        }
        if (locData.artist_name) {
          setArtistInfo((prev) => ({
            name: locData.artist_name || prev.name,
            phone: locData.artist_phone || prev.phone,
            image: locData.artist_image || prev.image,
          }));
        }
      }
    } catch (e) {
      console.log("Error loading tracking details:", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  // Real-time socket GPS position updates
  useEffect(() => {
    if (!socket || !bookingId) return;

    socket.emit("join-room", { bookingId });

    const handleLocationUpdate = (payload) => {
      if (payload && payload.latitude && payload.longitude) {
        const newCoords = {
          latitude: Number(payload.latitude),
          longitude: Number(payload.longitude),
          lat: Number(payload.latitude),
          lng: Number(payload.longitude),
        };
        setArtistCoords(newCoords);

        if (payload.etaMins || payload.eta_mins) {
          setEtaText(`Arriving in ${payload.etaMins || payload.eta_mins} mins`);
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
    socket.on("booking_status_updated", handleStatusUpdate);

    return () => {
      socket.off("artist_location_update", handleLocationUpdate);
      socket.off("artistLocationUpdated", handleLocationUpdate);
      socket.off("booking_status_updated", handleStatusUpdate);
    };
  }, [socket, bookingId, customerCoords]);

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
      receiverImage: artistInfo.image || booking?.artist?.user?.profile_image || booking?.artist_image,
    });
  };

  const checkinOtp = booking?.checkin_otp;

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
          customerCoords={{
            lat: Number(customerCoords?.latitude || booking?.latitude || 26.9124),
            lng: Number(customerCoords?.longitude || booking?.longitude || 75.7873)
          }}
          artistCoords={artistCoords ? {
            lat: Number(artistCoords.latitude || artistCoords.lat),
            lng: Number(artistCoords.longitude || artistCoords.lng)
          } : null}
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
      <View style={styles.bottomCard}>
        {/* Artist Profile Header */}
        <View style={styles.artistRow}>
          <OptimizedImage
            source={{ uri: artistInfo.image || booking?.artist?.user?.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500" }}
            style={styles.artistImage}
            width={56}
            height={56}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.artistName}>{artistInfo.name || "Mehndi Artist"}</Text>
            <Text style={styles.artistStatus}>{artistStatus ? artistStatus.replace(/_/g, " ") : etaText}</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#059669" />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>

        {/* Check-In PIN Card if artist is near / arrived */}
        {Boolean(checkinOtp) && (
          <View style={styles.checkinCard}>
            <Text style={styles.checkinLabel}>Doorstep Check-In PIN</Text>
            <View style={styles.pinRow}>
              {String(checkinOtp).split("").map((d, idx) => (
                <View key={idx} style={styles.pinBox}>
                  <Text style={styles.pinDigit}>{d}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.pinHint}>Share this 4-digit PIN with the artist upon arrival.</Text>
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
    zIndex: 10,
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
    borderColor: "#A7F3D0",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
    marginRight: 4,
  },
  liveTagText: { color: "#065F46", fontWeight: "700", fontSize: 10 },
  map: { flex: 1 },
  customerMarkerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1D1D1D",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  artistMarkerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary || "#9C1344",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
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
    borderColor: "#E5E7EB",
  },
  artistRow: { flexDirection: "row", alignItems: "center" },
  artistImage: { borderRadius: 28, marginRight: 12 },
  artistName: { fontSize: 16, fontWeight: "700", color: Colors.text || "#1D1D1D" },
  artistStatus: { fontSize: 13, color: Colors.primary || "#9C1344", fontWeight: "600", marginTop: 2 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: { color: "#065F46", fontWeight: "600", fontSize: 11 },
  progressContainer: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 20, marginTop: 16, overflow: "hidden" },
  progressFill: { width: "70%", height: "100%", backgroundColor: Colors.primary || "#9C1344" },
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
    backgroundColor: "#FFF1F5",
  },
  actionText: { marginLeft: 6, color: Colors.primary || "#9C1344", fontWeight: "700", fontSize: 13 },
  checkinCard: {
    backgroundColor: "#FDF2F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FBCFE8",
    padding: 12,
    marginTop: 14,
    alignItems: "center",
  },
  checkinLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9D174D",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pinRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
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
    elevation: 2,
  },
  pinDigit: {
    fontSize: 20,
    fontWeight: "800",
    color: "#9D174D",
  },
  pinHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  primaryBtn: { marginTop: 12, height: 48, backgroundColor: Colors.primary || "#9C1344", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  primaryText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
