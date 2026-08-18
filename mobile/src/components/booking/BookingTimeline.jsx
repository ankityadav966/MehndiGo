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
  if (s === "IN_PROGRESS" || s === "SERVICE_IN_PROGRESS" || s === "SERVICE_STARTED" || s === "CUSTOMER_VERIFIED" || s === "CHECKOUT" || s === "PAYMENT_REQUIRED" || s === "PAYMENT_COMPLETED") return 4;
  if (s === "COMPLETED" || s === "COMPLETED_CLOSED") return 5;
  if (s === "CANCELLED" || s === "REJECTED") return -1;
  return 0;
}

export default function BookingTimeline({ status, isCancelled = false }) {
  const activeIndex = getStepIndex(status);

  if (isCancelled || String(status).toUpperCase() === "CANCELLED") {
    return (
      <View style={styles.cancelledContainer}>
        <Ionicons name="close-circle" size={24} color="#EF4444" />
        <View style={styles.cancelledTextContainer}>
          <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
          <Text style={styles.cancelledDesc}>This booking has been cancelled and refunds processed where applicable.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Booking Progress</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineRow}>
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
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={isCurrent ? "#FFFFFF" : "#9CA3AF"}
                    />
                  )}
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
                <View
                  style={[
                    styles.connectorLine,
                    idx < activeIndex ? styles.connectorLineDone : styles.connectorLinePending
                  ]}
                />
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4
  },
  stepItem: {
    alignItems: "center",
    minWidth: 70
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6
  },
  stepCircleDone: {
    backgroundColor: "#059669"
  },
  stepCircleCurrent: {
    backgroundColor: "#E91E63",
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3
  },
  stepCirclePending: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  stepLabel: {
    fontSize: 11,
    textAlign: "center"
  },
  stepLabelDone: {
    fontWeight: "600",
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
  connectorLine: {
    height: 2,
    width: 24,
    marginBottom: 18
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  cancelledTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626"
  },
  cancelledDesc: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 2
  }
});
