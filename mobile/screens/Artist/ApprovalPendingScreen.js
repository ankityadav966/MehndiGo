import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../../constants/Colors";

export default function ApprovalPendingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Ionicons name="time-outline" size={50} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Application Submitted</Text>
        <Text style={styles.description}>Your artist profile has been successfully submitted for verification.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Pending Approval</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.infoText}>Documents will be verified</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.infoText}>Profile quality review</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.infoText}>Dashboard access after approval</Text>
          </View>
        </View>
        <Text style={styles.note}>Verification usually takes 24-48 hours.</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "ArtistStack" }] })}
        >
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 50 },
  iconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight + "50", justifyContent: "center", alignItems: "center", marginBottom: 25 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, textAlign: "center" },
  description: { marginTop: 10, fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  badge: { marginTop: 20, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 50 },
  badgeText: { color: Colors.white, fontWeight: "600", fontSize: 13 },
  infoCard: { width: "100%", marginTop: 30, backgroundColor: Colors.primaryLight + "30", borderRadius: 16, padding: 20 },
  infoTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15, color: Colors.text },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { marginLeft: 10, color: Colors.textSecondary, fontSize: 14 },
  note: { marginTop: 20, color: Colors.textTertiary, fontSize: 13 },
  footer: { paddingHorizontal: 20, paddingBottom: 25 },
  button: { height: 52, backgroundColor: Colors.primary, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  buttonText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
});
