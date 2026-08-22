import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Linking,
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
import { getTransactionDetails, getInvoiceDetails } from "../../services/payment";
import { formatDate, formatTime } from "../../utils/date";

export default function TransactionDetailsScreen({ route, navigation }) {
  const { paymentId } = route.params || { paymentId: 1 };

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = React.useCallback(async () => {
    try {
      const data = await getTransactionDetails(paymentId);
      setTransaction(data);
    } catch (err) {
      if (__DEV__) console.log("Failed to fetch transaction details:", err.message);
      setTransaction(null);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDetails();
    }, 0);
    return () => clearTimeout(timer);
  }, [paymentId, fetchDetails]);

  const handleDownloadInvoice = async () => {
    if (!transaction?.booking_id) return;
    try {
      const invoice = await getInvoiceDetails(transaction.booking_id);
      if (invoice?.invoice_url) {
        Linking.openURL(invoice.invoice_url);
      } else {
        Alert.alert("Error", "Invoice document URL not ready yet.");
      }
    } catch (err) {
      Alert.alert("Invoice Error", "Could not retrieve invoice document link.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Receipt Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.centerContainer, { padding: 24 }]}>
          <Ionicons name="receipt-outline" size={48} color={Colors.textSecondary} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 16 }}>Transaction Not Found</Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 8 }}>The requested transaction record could not be retrieved from the database.</Text>
          <View style={{ marginTop: 24, width: "100%" }}>
            <CustomButton title="Retry" onPress={fetchDetails} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isSuccess = transaction?.status === "SUCCESS" || transaction?.status === "completed";
  const txTime = transaction?.createdAt || transaction?.created_at || transaction?.paid_at || transaction?.timestamp;
  const dateStr = formatDate(txTime, { fallback: "Today" });
  const timeStr = formatTime(txTime, { fallback: "Just Now" });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Receipt Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: isSuccess ? "#EAFaf1" : "#FDEDEC" }]}>
            <Ionicons
              name={isSuccess ? "checkmark" : "close"}
              size={36}
              color={isSuccess ? Colors.success : Colors.error}
            />
          </View>
          <Text style={styles.transactionTitle}>
            {transaction?.booking?.service?.specialization_name || "Mehndi Booking Service"}
          </Text>
          <Text style={[styles.transactionAmount, { color: isSuccess ? Colors.success : Colors.error }]}>
            ₹{transaction?.amount}
          </Text>
          <Text style={styles.statusText}>{transaction?.status}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow label="Transaction Ref ID" value={String(transaction?.id || "")} />
          <DetailRow label="Razorpay Order ID" value={transaction?.razorpay_order_id || "N/A"} />
          <DetailRow label="Booking Code" value={transaction?.booking?.booking_code || "N/A"} />
          <DetailRow label="Date" value={dateStr} />
          <DetailRow label="Time" value={timeStr} />
          <DetailRow label="Payment Gateway" value="Razorpay secure online" isLast />
        </View>

        {isSuccess && (
          <View style={styles.buttonContainer}>
            <CustomButton title="View & Download PDF Invoice" onPress={handleDownloadInvoice} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value, isLast }) => (
  <View style={[styles.detailRow, !isLast && styles.detailRowBorder]}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifySpace: "space-between", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 100 },
  iconSection: { alignItems: "center", paddingVertical: 32, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  transactionTitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  transactionAmount: { fontSize: 32, fontWeight: "800" },
  statusText: { fontSize: 11, fontWeight: "700", color: Colors.textTertiary, marginTop: 4, textTransform: "uppercase" },
  detailsCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, paddingHorizontal: 16, elevation: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: 12, color: Colors.textSecondary },
  detailValue: { fontSize: 12, fontWeight: "700", color: Colors.text, textAlign: "right" },
  buttonContainer: { marginHorizontal: 16, marginTop: 10 }
});