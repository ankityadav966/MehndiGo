import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";

export default function WithdrawEarningsScreen({ navigation }) {
  const [amount, setAmount] = useState("");
  const [selectedBank] = useState("Bank Transfer (HDFC **** 4321)");
  const availableBalance = "₹25,400";

  const handleWithdraw = () => {
    if (!amount) {
      Alert.alert("Enter Amount", "Please enter withdrawal amount.");
      return;
    }
    Alert.alert("Success", `₹${amount} withdrawal request submitted successfully.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Earnings</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{availableBalance}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Enter Amount</Text>
          <TextInput
            placeholder="₹ 5000"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select Method</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>{selectedBank}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton title="Withdraw Now" onPress={handleWithdraw} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  placeholder: { width: 40 },
  balanceCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: Colors.white, borderRadius: 20, padding: 20, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  balanceLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: "700", color: Colors.text },
  section: { marginHorizontal: 16, marginTop: 22 },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 },
  input: { height: 56, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  dropdown: { height: 56, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  dropdownText: { fontSize: 14, color: Colors.text },
  footer: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 },
});
