import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Modal } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { retryPaymentOrder, verifyPaymentSignature } from "../../services/payment";

export default function PaymentFailedScreen({ route, navigation }) {
  const { bookingId, finalAmount } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");

  const handleRetry = async () => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID reference.");
      return;
    }
    setLoading(true);
    try {
      const order = await retryPaymentOrder(bookingId);
      setNewOrderId(order.id);
      setRetryModalVisible(true);
    } catch (err) {
      Alert.alert("Retry Failed", "Could not generate retry order.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySuccess = async () => {
    setRetryModalVisible(false);
    setLoading(true);
    try {
      const verifyData = {
        razorpay_order_id: newOrderId,
        razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: "mock_signature"
      };
      await verifyPaymentSignature(verifyData);
      navigation.replace("BookingSuccess", { bookingCode: `BK-${Math.floor(100000 + Math.random() * 900000)}` });
    } catch (err) {
      Alert.alert("Payment Verification Error", err.message || "Could not verify transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle-outline" size={54} color={Colors.error} />
        </View>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>
          {"We couldn't process your transaction. This might be due to incorrect details or network delays."}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={handleRetry}>
              <Text style={styles.buttonText}>Retry Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlinedButton}
              onPress={() => navigation.navigate("Payment", { bookingId, finalAmount })}
            >
              <Text style={styles.outlinedButtonText}>Change Payment Method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={() => navigation.replace("MyBookings")}
            >
              <Text style={styles.textButtonLabel}>View My Bookings</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Retry Checkout Modal */}
      <Modal visible={retryModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
              <Text style={styles.modalTitle}>Retry Razorpay Checkout</Text>
            </View>
            <Text style={styles.modalAmount}>₹{finalAmount}</Text>
            <TouchableOpacity style={styles.successBtn} onPress={handleRetrySuccess}>
              <Text style={styles.successBtnText}>Simulate Success</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.failBtn} onPress={() => setRetryModalVisible(false)}>
              <Text style={styles.failBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  iconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FFF0F2", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 30 },
  button: { width: "100%", height: 48, backgroundColor: Colors.primary, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  buttonText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  outlinedButton: { width: "100%", height: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  outlinedButtonText: { color: Colors.text, fontWeight: "700", fontSize: 14 },
  textButton: { padding: 10, marginTop: 10 },
  textButtonLabel: { color: Colors.primary, fontWeight: "700", fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "80%", borderRadius: 16, padding: 20, alignItems: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 15, fontWeight: "800", marginLeft: 8, color: Colors.text },
  modalAmount: { fontSize: 24, fontWeight: "800", color: Colors.primary, marginBottom: 20 },
  successBtn: { width: "100%", height: 44, backgroundColor: Colors.success, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  successBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  failBtn: { width: "100%", height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  failBtnText: { color: Colors.textSecondary, fontWeight: "700", fontSize: 13 }
});
