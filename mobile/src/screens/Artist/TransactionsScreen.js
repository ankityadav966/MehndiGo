import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function TransactionsScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState("All");

  const transactions = [
    { id: "1", title: "Booking Payment", date: "24 May 2024", amount: "+₹10,000", type: "Income" },
    { id: "2", title: "Advance Received", date: "20 May 2024", amount: "+₹2,000", type: "Income" },
    { id: "3", title: "Withdrawal", date: "18 May 2024", amount: "-₹5,000", type: "Expense" },
    { id: "4", title: "Refund", date: "15 May 2024", amount: "-₹1,000", type: "Expense" },
  ];

  const filteredData = selectedTab === "All" ? transactions : transactions.filter((item) => item.type === selectedTab);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, item.type === "Income" ? styles.incomeBg : styles.expenseBg]}>
          <Ionicons name={item.type === "Income" ? "arrow-down" : "arrow-up"} size={18} color={item.type === "Income" ? Colors.success : Colors.error} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
      <Text style={[styles.amount, item.type === "Income" ? styles.incomeText : styles.expenseText]}>{item.amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        {["All", "Income", "Expense"].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, selectedTab === tab && styles.activeTab]} onPress={() => setSelectedTab(tab)}>
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryLight + "20" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  placeholder: { width: 40 },
  tabContainer: { flexDirection: "row", backgroundColor: Colors.white, marginHorizontal: 16, borderRadius: 14, padding: 4, marginTop: 10, marginBottom: 16 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  activeTabText: { color: Colors.white },
  listContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: Colors.white, borderRadius: 18, padding: 16, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  leftSection: { flexDirection: "row", alignItems: "center" },
  iconContainer: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  incomeBg: { backgroundColor: Colors.success + "20" },
  expenseBg: { backgroundColor: Colors.error + "20" },
  info: { marginLeft: 12 },
  title: { fontSize: 15, fontWeight: "600", color: Colors.text },
  date: { marginTop: 4, fontSize: 12, color: Colors.textTertiary },
  amount: { fontSize: 15, fontWeight: "700" },
  incomeText: { color: Colors.success },
  expenseText: { color: Colors.error },
});
