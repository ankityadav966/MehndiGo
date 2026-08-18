import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function ServiceProgressCard({
  startTime,
  isArtist = false,
  onCheckout,
  serviceName = "Bridal Mehndi",
  estimatedDurationMinutes = 60
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startTimestamp = startTime ? new Date(startTime).getTime() : Date.now();

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const formattedTimer = `${hours > 0 ? String(hours).padStart(2, "0") + ":" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.livePulseBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.pulseText}>SERVICE IN PROGRESS</Text>
        </View>

        <Text style={styles.estimatedText}>
          Est. ~{estimatedDurationMinutes} mins
        </Text>
      </View>

      {/* Large Elapsed Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerValue}>{formattedTimer}</Text>
        <Text style={styles.timerLabel}>Elapsed Service Duration</Text>
      </View>

      {/* Progress Stages */}
      <View style={styles.stagesContainer}>
        <View style={styles.stageItem}>
          <Ionicons name="checkmark-circle" size={14} color="#059669" />
          <Text style={styles.stageTextDone}>Preparation & Cleansing</Text>
        </View>
        <View style={styles.stageItem}>
          <Ionicons name="ellipse" size={12} color="#E91E63" />
          <Text style={styles.stageTextActive}>Intricate Henna Application</Text>
        </View>
        <View style={styles.stageItem}>
          <Ionicons name="ellipse-outline" size={12} color="#9CA3AF" />
          <Text style={styles.stageTextPending}>Drying & Sealing Mist</Text>
        </View>
      </View>

      {isArtist && onCheckout && (
        <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} activeOpacity={0.8}>
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.checkoutBtnText}>Complete Service & Checkout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FCE7F3",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCE7F3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E91E63"
  },
  pulseText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  estimatedText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600"
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#FFF8FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    marginBottom: 14
  },
  timerValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#E91E63",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1
  },
  timerLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2
  },
  stagesContainer: {
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 4
  },
  stageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  stageTextDone: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600"
  },
  stageTextActive: {
    fontSize: 12,
    color: "#E91E63",
    fontWeight: "700"
  },
  stageTextPending: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500"
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E91E63",
    height: 48,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  checkoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF"
  }
});
