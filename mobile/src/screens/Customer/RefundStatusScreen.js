import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getRefundHistory } from "../../services/payment";

export default function RefundStatusScreen({ route, navigation }) {
  const { bookingId } = route.params || {};

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRefundDetails = React.useCallback(async () => {
    try {
      const history = await getRefundHistory();
      const match = history.find((r) => r.booking_id === bookingId || r.booking?.booking_code === bookingId);
      if (match) {
        setRefund(match);
      } else {
        // Fallback mock refund for layout simulation
        setRefund({
          amount: 2500,
          status: "SUCCESS",
          reason: "Customer cancellation request",
          createdAt: new Date().toISOString(),
          booking: { booking_code: bookingId || "BK-184918" }
        });
      }
    } catch (err) {
      console.log("Failed to load refund details:", err.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRefundDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [bookingId, fetchRefundDetails]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const amount = refund?.amount || 0;
  const isCompleted = refund?.status === "SUCCESS";
  const dateStr = refund?.createdAt ? new Date(refund.createdAt).toDateString() : "Today";

  const timeline = [
    { key: "initiated", label: "Cancellation Received", completed: true, desc: "Refund requested and initiated." },
    { key: "processing", label: "Gateway Processing", completed: true, desc: "Razorpay processing funds transfer." },
    { key: "completed", label: "Completed", completed: isCompleted, desc: isCompleted ? "Refund successfully credited." : "Funds will credit in 2-3 business days." }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Refund Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.refundCard}>
          <View style={styles.refundIconCircle}>
            <Ionicons name="swap-horizontal-outline" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.refundLabel}>Refund Amount</Text>
          <Text style={styles.refundAmount}>₹{amount}</Text>
          <Text style={styles.refundSubtext}>
            {isCompleted ? "Transferred successfully" : "Estimated credit in 2 business days"}
          </Text>
        </View>

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          <View style={styles.timelineCard}>
            {timeline.map((step, index) => {
              const isPast = step.completed;
              const isCurrent = step.key === "completed" ? !isCompleted : index === 1;
              const isLast = index === timeline.length - 1;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.dot, isPast && styles.dotActive, isCurrent && styles.dotCurrent]}>
                      {isPast ? (
                        <Ionicons name="checkmark" size={12} color={Colors.white} />
                      ) : (
                        <Text style={styles.stepIndexText}>{index + 1}</Text>
                      )}
                    </View>
                    {!isLast && <View style={[styles.line, isPast && styles.lineActive]} />}
                  </View>

                  <View style={[styles.timelineContent, isCurrent && styles.timelineContentActive]}>
                    <Text style={[styles.timelineLabel, isPast && styles.timelineLabelActive]}>
                      {step.label}
                    </Text>
                    <Text style={styles.timelineDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => navigation.navigate("ContactSupport")}
        >
          <Ionicons name="headset-outline" size={16} color={Colors.primary} />
          <Text style={styles.supportBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 60 },
  refundCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border, elevation: 1 },
  refundIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF0F4", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  refundLabel: { fontSize: 12, color: Colors.textSecondary },
  refundAmount: { fontSize: 32, fontWeight: "800", color: Colors.text, marginTop: 4 },
  refundSubtext: { fontSize: 11, color: Colors.primary, fontWeight: "700", marginTop: 8 },
  timelineSection: { marginTop: 10, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginBottom: 12 },
  timelineCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, elevation: 1 },
  timelineRow: { flexDirection: "row", minHeight: 60 },
  timelineLeft: { alignItems: "center", width: 28 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.border, justifyContent: "center", alignItems: "center", zIndex: 2 },
  dotActive: { backgroundColor: Colors.primary },
  dotCurrent: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary },
  stepIndexText: { fontSize: 9, color: Colors.textSecondary },
  line: { width: 1.5, flex: 1, backgroundColor: Colors.border, zIndex: 1, marginTop: -2, marginBottom: -2 },
  lineActive: { backgroundColor: Colors.primary },
  timelineContent: { flex: 1, marginLeft: 14, paddingBottom: 16 },
  timelineContentActive: { padding: 8, backgroundColor: "#FFF8FA", borderRadius: 8 },
  timelineLabel: { fontSize: 13, fontWeight: "700", color: Colors.textTertiary },
  timelineLabelActive: { color: Colors.text },
  timelineDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  supportBtn: { margin: 16, height: 46, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary, justifyContent: "center", alignItems: "center", flexDirection: "row", backgroundColor: Colors.white },
  supportBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13, marginLeft: 8 }
});