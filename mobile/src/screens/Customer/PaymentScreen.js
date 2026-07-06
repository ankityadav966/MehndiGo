import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { createPaymentOrder, verifyPaymentSignature, payWithWallet } from "../../services/payment";
import { getBookingDetails, selectCashPayment } from "../../services/booking";

export default function PaymentScreen({ route, navigation }) {
  const { bookingId, bookingCode, finalAmount, isSettlement } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);

  const loadBookingDetails = React.useCallback(async () => {
    try {
      const details = await getBookingDetails(bookingId);
      setBooking(details);
    } catch (err) {
      console.log("Failed to fetch booking details in PaymentScreen:", err.message);
    }
  }, [bookingId]);

  const initiateOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      await loadBookingDetails();
      const order = await createPaymentOrder(bookingId);
      setOrderId(order.id);
    } catch (err) {
      Alert.alert("Checkout Error", "Failed to generate Razorpay order ID.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation, loadBookingDetails]);

  useEffect(() => {
    if (!bookingId) {
      Alert.alert("Error", "Missing booking ID context.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      initiateOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [bookingId, initiateOrder, navigation]);

  const handlePay = async () => {
    if (selectedMethod === "cash") {
      setLoading(true);
      try {
        await selectCashPayment(bookingId);
        setLoading(false);
        Alert.alert(
          "Cash Payment Selected",
          "Please pay the artist in hand. The booking is now awaiting the artist's payment confirmation.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
              }
            }
          ]
        );
      } catch (err) {
        setLoading(false);
        Alert.alert("Cash Selection Failed", err.message || "Failed to confirm cash option selection.");
      }
      return;
    }

    if (selectedMethod === "wallet") {
      setLoading(true);
      try {
        await payWithWallet(bookingId);
        if (isSettlement) {
          navigation.replace("ReviewSubmission", {
            bookingId: bookingId,
            artistName: booking?.artist?.user?.name,
            artistImage: booking?.artist?.user?.profile_image,
            specializationName: booking?.service?.specialization_name
          });
        } else {
          navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
        }
      } catch (err) {
        setLoading(false);
        navigation.navigate("PaymentFailed", { bookingId, finalAmount });
      }
      return;
    }

    if (!orderId) {
      Alert.alert("Error", "Razorpay order not initialized yet.");
      return;
    }
    setCheckoutModalVisible(true);
  };

  const handlePaymentSuccess = async () => {
    setCheckoutModalVisible(false);
    setLoading(true);
    try {
      const verifyData = {
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: `sig_${Math.random().toString(36).substring(2, 10)}`
      };
      await verifyPaymentSignature(verifyData);
      if (isSettlement) {
        navigation.replace("ReviewSubmission", {
          bookingId: bookingId,
          artistName: booking?.artist?.user?.name,
          artistImage: booking?.artist?.user?.profile_image,
          specializationName: booking?.service?.specialization_name
        });
      } else {
        navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
      }
    } catch (err) {
      setLoading(false);
      navigation.navigate("PaymentFailed", { bookingId, finalAmount });
    }
  };

  const handlePaymentFailure = () => {
    setCheckoutModalVisible(false);
    navigation.navigate("PaymentFailed", { bookingId, finalAmount });
  };

  const handlePayOffline = () => {
    setCheckoutModalVisible(false);
    navigation.replace("BookingSuccess", { bookingCode: bookingCode || `BK-${Math.floor(100000 + Math.random() * 900000)}` });
  };

  const methods = [
    { id: "upi", title: "UPI Payment", subtitle: "Google Pay, PhonePe, Paytm", icon: "logo-google-playstore" },
    { id: "card", title: "Credit / Debit Card", subtitle: "Visa, Mastercard, RuPay", icon: "card-outline" },
    { id: "netbanking", title: "Net Banking", subtitle: "SBI, HDFC, ICICI, Axis", icon: "business-outline" },
    { id: "wallet", title: "MehndiGo Wallet & Paytm", subtitle: "Pay via standard online wallets", icon: "wallet-outline" },
    { id: "cash", title: "Cash Payment (Pay Artist in Hand)", subtitle: "Awaiting artist payment confirmation", icon: "cash-outline" },
    { id: "emi", title: "EMI / Pay Later", subtitle: "Simpl, LazyPay, Credit Card EMI", icon: "hourglass-outline" }
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loaderText}>Processing secure gateway...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {booking && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>Booking Summary Details</Text>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Booking Code</Text>
              <Text style={styles.detailsValue}>#{booking.booking_code}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Artist Name</Text>
              <Text style={styles.detailsValue}>{booking.artist?.user?.name || "Professional Specialist"}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Booking Date</Text>
              <Text style={styles.detailsValue}>{booking.slot?.start_time || booking.slot?.date ? new Date(booking.slot.start_time || booking.slot.date).toLocaleDateString() : (booking.reschedule_date || "TBD")}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Base Booking Amount</Text>
              <Text style={styles.detailsValue}>₹{booking.total_price}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Platform Commission Fee</Text>
              <Text style={styles.detailsValue}>₹{booking.platform_fee}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Payment Status</Text>
              <Text style={styles.detailsValue}>{booking.payment_status}</Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Payment Method</Text>
              <Text style={styles.detailsValue}>{booking.payment_method || "Selection Required"}</Text>
            </View>
          </View>
        )}

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Payable Amount (incl. GST)</Text>
          <Text style={styles.amount}>₹{finalAmount || booking?.final_amount || "TBD"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>

        {methods.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onPress={() => setSelectedMethod(item.id)}
            style={[styles.paymentCard, selectedMethod === item.id && styles.selectedCard]}
          >
            <View style={styles.methodInfo}>
              <Ionicons name={item.icon} size={22} color={selectedMethod === item.id ? Colors.primary : Colors.textTertiary} />
              <View style={styles.textContainer}>
                <Text style={styles.methodTitle}>{item.title}</Text>
                <Text style={styles.methodSub}>{item.subtitle}</Text>
              </View>
            </View>
            <View style={[styles.radio, selectedMethod === item.id && styles.radioActive]} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title={`Pay ₹${finalAmount || ""}`} onPress={handlePay} />
      </View>

      {/* Razorpay Simulator Overlay */}
      <Modal visible={checkoutModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
              <Text style={styles.modalTitle}>Razorpay Checkout</Text>
            </View>
            <Text style={styles.orderLabel}>Order Ref: {orderId}</Text>
            <Text style={styles.modalAmount}>₹{finalAmount}</Text>

            <TouchableOpacity style={styles.successBtn} onPress={handlePaymentSuccess}>
              <Text style={styles.successBtnText}>Simulate Success</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.successBtn, { backgroundColor: Colors.primary, marginBottom: 10 }]} onPress={handlePayOffline}>
              <Text style={styles.successBtnText}>Simulate Pay Offline (Pending)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.failBtn} onPress={handlePaymentFailure}>
              <Text style={styles.failBtnText}>Simulate Cancel / Failure</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 12, color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  detailsCard: { margin: 16, marginBottom: 4, backgroundColor: Colors.white, borderRadius: 16, padding: 18, elevation: 1 },
  detailsCardTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  detailsLabel: { fontSize: 11, color: Colors.textSecondary },
  detailsValue: { fontSize: 11, fontWeight: "600", color: Colors.text },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 100 },
  amountCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 18, elevation: 1 },
  amountLabel: { color: Colors.textSecondary, fontSize: 12 },
  amount: { marginTop: 6, fontSize: 32, fontWeight: "800", color: Colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 12 },
  paymentCard: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 1 },
  selectedCard: { borderWidth: 1.5, borderColor: Colors.primary },
  methodInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  textContainer: { marginLeft: 14 },
  methodTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  methodSub: { marginTop: 3, fontSize: 11, color: Colors.textSecondary },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.white, width: "85%", borderRadius: 20, padding: 24, alignItems: "center" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginLeft: 8, color: Colors.text },
  orderLabel: { fontSize: 10, color: Colors.textTertiary, marginBottom: 4 },
  modalAmount: { fontSize: 28, fontWeight: "800", color: Colors.primary, marginBottom: 24 },
  successBtn: { width: "100%", height: 46, backgroundColor: Colors.success, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  successBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  failBtn: { width: "100%", height: 46, borderWidth: 1, borderColor: Colors.error, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  failBtnText: { color: Colors.error, fontWeight: "700", fontSize: 13 }
});
