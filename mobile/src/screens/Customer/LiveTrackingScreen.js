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
  const { bookingId } = route.params || {};
  const { socket, connected } = useSocket();

  const [booking, setBooking] = useState(null);
  const [artistCoords, setArtistCoords] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [etaText, setEtaText] = useState("Calculating ETA...");
  const [distanceText, setDistanceText] = useState("Waiting for location");
  const [artistStatus, setArtistStatus] = useState("Waiting for artist live location");

  const mapRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;

    async function loadData() {
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
        }
      } catch (e) {
        console.log("Error loading tracking details:", e);
      }
    }

    loadData();
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

        if (payload.etaMins) {
          setEtaText(`Arriving in ${payload.etaMins} mins`);
        }
        if (payload.distanceKm) {
          setDistanceText(`${payload.distanceKm} km away`);
        }
      }
    };

    const handleStatusUpdate = (payload) => {
      if (payload && (payload.status || payload.detailed_status)) {
        setArtistStatus(payload.status || payload.detailed_status);
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
    const phone = booking?.artist?.user?.phone || booking?.artist_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleChatArtist = () => {
    navigation.navigate("ChatRoom", {
      bookingId,
      receiverId: booking?.artist?.user_id,
      receiverName: booking?.artist?.user?.name || booking?.artist_name,
      receiverImage: booking?.artist?.user?.profile_image || booking?.artist_image,
    });
  };

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
            source={{ uri: booking?.artist?.user?.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500" }}
            style={styles.artistImage}
            width={56}
            height={56}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.artistName}>{booking?.artist?.user?.name || "Mehndi Artist"}</Text>
            <Text style={styles.artistStatus}>{etaText}</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#059669" />
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        </View>

        {/* Animated Progress Line */}
        <View style={styles.progressContainer}>
          <View style={styles.progressFill} />
        </View>

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
  primaryBtn: { marginTop: 12, height: 48, backgroundColor: Colors.primary || "#9C1344", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  primaryText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
