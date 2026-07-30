import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";

export default function BookingSuccessScreen({ route, navigation }) {
  const { bookingCode, bookingId } = route.params || { bookingCode: "BK-829188" };
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Payment Progress Steps Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStepDone}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.progressLineDone} />
          <View style={styles.progressStepDone}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.progressLineDone} />
          <View style={styles.progressStepActive}>
            <Text style={styles.progressStepText}>3</Text>
          </View>
        </View>

        {/* Pulsing Animated Success Badge */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={64} color="#059669" />
        </Animated.View>

        <Text style={styles.title}>Booking Confirmed 🎉</Text>
        <Text style={styles.subtitle}>Your 10% advance deposit is held securely in escrow. The artist has been notified!</Text>

        {/* Escrow Guarantee Banner */}
        <View style={styles.escrowBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.escrowText}>100% Escrow Deposit Guarantee Active</Text>
        </View>

        {/* Booking Details Card */}
        <View style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.bookingIdLabel}>Booking Reference</Text>
            <Text style={styles.bookingId}>#{bookingCode}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.cardDesc}>
            You can view live status, chat with your artist, or track live arrival from your Bookings tab.
          </Text>
        </View>
      </View>

      {/* Dual CTA Action Buttons */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("CustomerTabs", { screen: "Bookings" })}
        >
          <Text style={styles.secondaryBtnText}>View Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("CustomerTabs", { screen: "Home" })}
        >
          <Text style={styles.primaryBtnText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  progressStepDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary || "#9C1344",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  progressLineDone: {
    width: 36,
    height: 2,
    backgroundColor: "#059669",
  },
  iconContainer: {
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", color: Colors.text || "#1D1D1D" },
  subtitle: { marginTop: 8, fontSize: 13, textAlign: "center", color: Colors.textSecondary || "#666666", lineHeight: 20 },
  escrowBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  escrowText: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "600",
  },
  bookingCard: { marginTop: 24, backgroundColor: "#F9FAFB", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#E5E7EB" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingIdLabel: { fontSize: 13, color: Colors.textSecondary || "#666666" },
  bookingId: { fontSize: 16, fontWeight: "700", color: Colors.primary || "#9C1344" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary || "#666666", lineHeight: 18, textAlign: "center" },
  footerRow: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: Colors.text || "#1D1D1D",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary || "#9C1344",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
