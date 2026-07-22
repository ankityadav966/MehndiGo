import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";

export default function KycScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="shield-checkmark-outline" size={60} color={Colors.primary} />
        </View>
        <Text style={styles.title}>KYC Verification</Text>
        <Text style={styles.subtitle}>Complete identity verification and compliance checks to continue using our platform.</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.statusText}>Personal Details</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.statusText}>Aadhaar Verified</Text>
          </View>
          <View style={styles.statusRow}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
            <Text style={styles.statusText}>PAN Verified</Text>
          </View>
          <View style={[styles.statusRow, styles.pendingRow]}>
            <Ionicons name="time-outline" size={22} color={Colors.warning} />
            <Text style={[styles.statusText, styles.pendingText]}>Address Proof (Pending)</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <CustomButton title="Complete KYC" onPress={() => navigation.navigate("ReuploadDocuments")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight + "40", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 30 },
  statusCard: { width: "100%", backgroundColor: Colors.background, borderRadius: 16, padding: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  statusText: { marginLeft: 12, fontSize: 14, color: Colors.text, fontWeight: "500" },
  pendingRow: { marginBottom: 0 },
  pendingText: { color: Colors.warning },
  footer: { paddingHorizontal: 20, paddingBottom: 25 },
});
