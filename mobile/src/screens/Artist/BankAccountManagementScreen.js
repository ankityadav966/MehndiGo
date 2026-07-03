import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BankAccountManagementScreen({ navigation }) {
  const [isDefault, setIsDefault] = useState(true);

  const handleRemove = () => {
    Alert.alert("Remove Account", "Are you sure you want to remove this bank account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {} },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bank Accounts</Text>
          <View style={styles.empty} />
        </View>

        <View style={styles.bankCard}>
          <View style={styles.bankCardHeader}>
            <View style={styles.bankIcon}>
              <Ionicons name="business-outline" size={24} color={PRIMARY} />
            </View>
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>HDFC Bank</Text>
              {isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Number</Text>
            <Text style={styles.detailValue}>****4321</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IFSC Code</Text>
            <Text style={styles.detailValue}>HDFC0001234</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Holder</Text>
            <Text style={styles.detailValue}>Priya Mehendi Artist</Text>
          </View>

          <View style={styles.bankCardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setIsDefault(!isDefault);
                if (!isDefault) Alert.alert("Done", "Set as default bank account.");
              }}
            >
              <Ionicons
                name={isDefault ? "checkmark-circle" : "checkmark-circle-outline"}
                size={18}
                color={isDefault ? PRIMARY : "#999"}
              />
              <Text style={[styles.actionText, isDefault && styles.actionTextActive]}>
                Set as Default
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleRemove}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionText, { color: "#EF4444" }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.addCard}>
          <Ionicons name="add" size={24} color={PRIMARY} />
          <Text style={styles.addCardText}>Add New Bank Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const PRIMARY = "#F7146B";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  empty: {
    width: 40,
  },
  bankCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  bankIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFF1F7",
    justifyContent: "center",
    alignItems: "center",
  },
  bankInfo: {
    marginLeft: 14,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bankName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  defaultBadge: {
    marginLeft: 10,
    backgroundColor: "#FFF1F7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLabel: {
    fontSize: 14,
    color: "#888",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  bankCardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginLeft: 6,
  },
  actionTextActive: {
    color: PRIMARY,
  },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FCCFDF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 22,
    backgroundColor: "#FFF",
  },
  addCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: PRIMARY,
    marginLeft: 8,
  },
});
