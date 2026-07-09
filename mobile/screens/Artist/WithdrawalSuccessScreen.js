import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WithdrawalSuccessScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
        </View>

        <Text style={styles.title}>Withdrawal Successful</Text>
        <Text style={styles.subtitle}>
          Your withdrawal request has been submitted
        </Text>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>Ã¢â€šÂ¹5,000</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color="#888" />
          <Text style={styles.infoText}>Estimated arrival: 3-5 business days</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("Transactions")}
        >
          <Text style={styles.primaryButtonText}>View Transactions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#F7146B";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  amountCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginTop: 28,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  amount: {
    fontSize: 36,
    fontWeight: "700",
    color: PRIMARY,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  infoText: {
    fontSize: 13,
    color: "#888",
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    gap: 10,
    backgroundColor: "#FFF8FA",
  },
  primaryButton: {
    height: 56,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 56,
    backgroundColor: "#FFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  secondaryButtonText: {
    color: PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
});
