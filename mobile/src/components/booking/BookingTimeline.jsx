import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const STEPS = [
  { key: "REQUESTED", label: "Requested", icon: "paper-plane-outline" },
  { key: "ACCEPTED", label: "Confirmed", icon: "checkmark-circle-outline" },
  { key: "ON_THE_WAY", label: "On The Way", icon: "car-sport-outline" },
  { key: "ARRIVED", label: "Arrived", icon: "location-outline" },
  { key: "IN_PROGRESS", label: "In Progress", icon: "color-palette-outline" },
  { key: "COMPLETED", label: "Completed", icon: "ribbon-outline" }
];

function getStepIndex(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING" || s === "REQUESTED") return 0;
  if (s === "CONFIRMED" || s === "ARTIST_ACCEPTED" || s === "ACCEPTED") return 1;
  if (s === "ARTIST_ON_THE_WAY" || s === "ON_THE_WAY") return 2;
  if (s === "ARTIST_ARRIVED" || s === "ARRIVED") return 3;
  if (
    s === "IN_PROGRESS" ||
    s === "SERVICE_IN_PROGRESS" ||
    s === "SERVICE_STARTED" ||
    s === "CUSTOMER_VERIFIED" ||
    s === "CHECKOUT" ||
    s === "PAYMENT_REQUIRED" ||
    s === "PAYMENT_COMPLETED"
  ) {
    return 4;
  }
  if (s === "COMPLETED" || s === "COMPLETED_CLOSED") return 5;
  if (s === "CANCELLED" || s === "REJECTED") return -1;
  return 0;
}

export default function BookingTimeline({ status, isCancelled = false }) {
  const activeIndex = getStepIndex(status);

  if (isCancelled || String(status).toUpperCase() === "CANCELLED") {
    return (
      <View style={styles.cancelledContainer}>
        <View style={styles.cancelledIconBox}>
          <Ionicons name="close-circle" size={22} color="#DC2626" />
        </View>
        <View style={styles.cancelledTextContainer}>
          <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
          <Text style={styles.cancelledDesc}>
            This booking has been cancelled. Any applicable refunds or slot releases have been processed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Ionicons name="git-commit-outline" size={14} color="#E91E63" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle} numberOfLines={1}>Service Timeline</Text>
        </View>
        <View style={styles.stepCounterBadge}>
          <Text style={styles.stepCounterText}>
            Step {Math.min(activeIndex + 1, STEPS.length)} of {STEPS.length}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineRow}
      >
        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <React.Fragment key={step.key}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isDone && styles.stepCircleDone,
                    isCurrent && styles.stepCircleCurrent,
                    isPending && styles.stepCirclePending
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={13}
                      color={isCurrent ? "#FFFFFF" : "#9CA3AF"}
                    />
                  )}
                  {isCurrent && <View style={styles.currentPulseRing} />}
                </View>

                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                    isPending && styles.stepLabelPending
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {idx < STEPS.length - 1 && (
                <View style={styles.connectorContainer}>
                  <View
                    style={[
                      styles.connectorLine,
                      idx < activeIndex ? styles.connectorLineDone : styles.connectorLinePending
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
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
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexShrink: 1
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 1
  },
  stepCounterBadge: {
    backgroundColor: "#FFF8FA",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    flexShrink: 0
  },
  stepCounterText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E91E63"
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    paddingRight: 20
  },
  stepItem: {
    alignItems: "center",
    minWidth: 68
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    position: "relative"
  },
  stepCircleDone: {
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  stepCircleCurrent: {
    backgroundColor: "#E91E63",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  currentPulseRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "rgba(233, 30, 99, 0.35)"
  },
  stepCirclePending: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB"
  },
  stepLabel: {
    fontSize: 10.5,
    textAlign: "center"
  },
  stepLabelDone: {
    fontWeight: "700",
    color: "#059669"
  },
  stepLabelCurrent: {
    fontWeight: "800",
    color: "#E91E63"
  },
  stepLabelPending: {
    fontWeight: "500",
    color: "#9CA3AF"
  },
  connectorContainer: {
    width: 20,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  connectorLine: {
    height: 2,
    width: "100%",
    borderRadius: 1
  },
  connectorLineDone: {
    backgroundColor: "#059669"
  },
  connectorLinePending: {
    backgroundColor: "#E5E7EB"
  },
  cancelledContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#FECACA"
  },
  cancelledIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0
  },
  cancelledTextContainer: {
    marginLeft: 10,
    flex: 1
  },
  cancelledTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#DC2626"
  },
  cancelledDesc: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
    lineHeight: 15
  }
});
