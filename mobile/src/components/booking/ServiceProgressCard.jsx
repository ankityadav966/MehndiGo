import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { parseDate } from "../../utils/date";

export default function ServiceProgressCard({
  startTime,
  endTime = null,
  isCompleted = false,
  isArtist = false,
  onCheckout,
  serviceName = "Bridal Mehndi",
  estimatedDurationMinutes = 60
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const parsedStart = parseDate(startTime);
    const startTimestamp = parsedStart ? parsedStart.getTime() : Date.now();

    if (endTime || isCompleted) {
      const parsedEnd = parseDate(endTime);
      const endTimestamp = parsedEnd ? parsedEnd.getTime() : Date.now();
      const diff = Math.max(0, Math.floor((endTimestamp - startTimestamp) / 1000));
      setElapsedSeconds(diff);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, isCompleted]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const formattedTimer = `${hours > 0 ? String(hours).padStart(2, "0") + ":" : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={[styles.card, (endTime || isCompleted) && styles.cardCompleted]}>
      <View style={styles.headerRow}>
        {endTime || isCompleted ? (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#059669" />
            <Text style={styles.completedBadgeText}>SERVICE COMPLETED</Text>
          </View>
        ) : (
          <View style={styles.livePulseBadge}>
            <View style={styles.pulseDotOuter}>
              <View style={styles.pulseDotInner} />
            </View>
            <Text style={styles.pulseText}>LIVE SERVICE TIMER</Text>
          </View>
        )}

        <View style={styles.estBadge}>
          <Ionicons name="hourglass-outline" size={10} color="#6B7280" style={{ marginRight: 3 }} />
          <Text style={styles.estimatedText} numberOfLines={1}>
            Est. ~{estimatedDurationMinutes} mins
          </Text>
        </View>
      </View>

      {/* Service Name Banner */}
      <View style={styles.serviceNameRow}>
        <Ionicons name="sparkles" size={14} color="#E91E63" style={{ marginRight: 6 }} />
        <Text style={styles.serviceNameText} numberOfLines={1} ellipsizeMode="tail">
          {serviceName}
        </Text>
      </View>

      {/* Large Elapsed Timer */}
      <View style={[styles.timerContainer, (endTime || isCompleted) && styles.timerContainerCompleted]}>
        <Text style={[styles.timerValue, (endTime || isCompleted) && styles.timerValueCompleted]}>
          {formattedTimer}
        </Text>
        <View style={styles.timerLabelRow}>
          <View style={[styles.activeTimerDot, (endTime || isCompleted) && { backgroundColor: "#059669" }]} />
          <Text style={styles.timerLabel} numberOfLines={1}>
            {endTime || isCompleted ? "Total Service Duration (Timer Stopped)" : "Live Elapsed Duration"}
          </Text>
        </View>
      </View>

      {/* Service Milestone Progress Stages */}
      <View style={styles.stagesContainer}>
        <Text style={styles.stagesHeader}>Application Stages</Text>

        <View style={styles.stageItem}>
          <View style={[styles.stageIconBox, styles.stageIconBoxDone]}>
            <Ionicons name="checkmark" size={12} color="#059669" />
          </View>
          <View style={styles.stageTextCol}>
            <Text style={styles.stageTextDone} numberOfLines={1}>Preparation & Skin Cleansing</Text>
            <Text style={styles.stageSubtextDone} numberOfLines={1}>Completed</Text>
          </View>
        </View>

        <View style={styles.stageItem}>
          <View style={[styles.stageIconBox, (endTime || isCompleted) ? styles.stageIconBoxDone : styles.stageIconBoxActive]}>
            <Ionicons name={(endTime || isCompleted) ? "checkmark" : "brush"} size={11} color={(endTime || isCompleted) ? "#059669" : "#E91E63"} />
          </View>
          <View style={styles.stageTextCol}>
            <Text style={(endTime || isCompleted) ? styles.stageTextDone : styles.stageTextActive} numberOfLines={1}>
              Intricate Henna Design Application
            </Text>
            <Text style={(endTime || isCompleted) ? styles.stageSubtextDone : styles.stageSubtextActive} numberOfLines={1}>
              {(endTime || isCompleted) ? "Completed" : "In Progress Now"}
            </Text>
          </View>
        </View>

        <View style={styles.stageItem}>
          <View style={[styles.stageIconBox, (endTime || isCompleted) ? styles.stageIconBoxDone : styles.stageIconBoxPending]}>
            <Ionicons name={(endTime || isCompleted) ? "checkmark" : "sparkles-outline"} size={11} color={(endTime || isCompleted) ? "#059669" : "#9CA3AF"} />
          </View>
          <View style={styles.stageTextCol}>
            <Text style={(endTime || isCompleted) ? styles.stageTextDone : styles.stageTextPending} numberOfLines={1}>
              Drying, Sealing Mist & Aftercare
            </Text>
            <Text style={(endTime || isCompleted) ? styles.stageSubtextDone : styles.stageSubtextPending} numberOfLines={1}>
              {(endTime || isCompleted) ? "Completed" : "Upcoming"}
            </Text>
          </View>
        </View>
      </View>

      {isArtist && onCheckout && !isCompleted && !endTime && (
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={onCheckout}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-done-circle" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.checkoutBtnText} numberOfLines={1} ellipsizeMode="tail">
            Finish Service & Generate Completion PIN
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FCE7F3",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden"
  },
  cardCompleted: {
    borderColor: "#A7F3D0",
    shadowColor: "#059669"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 6
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    gap: 4,
    flexShrink: 0
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    gap: 4,
    flexShrink: 0
  },
  completedBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: 0.5
  },
  pulseDotOuter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(233, 30, 99, 0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  pulseDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E91E63"
  },
  pulseText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#E91E63",
    letterSpacing: 0.5
  },
  estBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexShrink: 1
  },
  estimatedText: {
    fontSize: 10.5,
    color: "#6B7280",
    fontWeight: "700"
  },
  serviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3
  },
  serviceNameText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1
  },
  timerContainer: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FFF8FA",
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#FCE7F3",
    marginVertical: 10
  },
  timerContainerCompleted: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  timerValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#E91E63",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1.5
  },
  timerValueCompleted: {
    color: "#065F46"
  },
  timerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4
  },
  activeTimerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E91E63"
  },
  timerLabel: {
    fontSize: 10.5,
    color: "#6B7280",
    fontWeight: "600"
  },
  stagesContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 8
  },
  stagesHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1
  },
  stageItem: {
    flexDirection: "row",
    alignItems: "center"
  },
  stageIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    flexShrink: 0
  },
  stageIconBoxDone: {
    backgroundColor: "#D1FAE5"
  },
  stageIconBoxActive: {
    backgroundColor: "#FCE7F3"
  },
  stageIconBoxPending: {
    backgroundColor: "#E5E7EB"
  },
  stageTextCol: {
    flex: 1
  },
  stageTextDone: {
    fontSize: 11.5,
    color: "#065F46",
    fontWeight: "700"
  },
  stageSubtextDone: {
    fontSize: 9.5,
    color: "#059669",
    fontWeight: "600"
  },
  stageTextActive: {
    fontSize: 11.5,
    color: "#831843",
    fontWeight: "800"
  },
  stageSubtextActive: {
    fontSize: 9.5,
    color: "#E91E63",
    fontWeight: "700"
  },
  stageTextPending: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "500"
  },
  stageSubtextPending: {
    fontSize: 9.5,
    color: "#9CA3AF",
    fontWeight: "500"
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E91E63",
    height: 48,
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  checkoutBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flexShrink: 1
  }
});
