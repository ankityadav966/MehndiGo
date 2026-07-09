import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function KYCVerificationScreen({ navigation }) {
  const steps = ["Personal Details", "Aadhaar Verification", "PAN Verification", "Profile Photo", "Work Samples"];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>{"Let's Verify Your Identity"}</Text>
        <Text style={styles.subtitle}>Complete verification to unlock bookings, payouts and premium artist features.</Text>

        <View style={styles.progressBadge}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
          <Text style={styles.progressText}>5 Steps Required</Text>
        </View>

        <View style={styles.card}>
          {steps.map((item, index) => (
            <View key={index} style={[styles.stepItem, index !== steps.length - 1 && styles.borderBottom]}>
              <View style={styles.left}>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                </View>
                <Text style={styles.stepTitle}>{item}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>Your documents are securely encrypted and used only for verification purposes.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.navigate("PersonalDetails")}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 120 },
  backBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "flex-start" },
  title: { fontSize: 22, fontWeight: "700", color: Colors.text, marginTop: 16, lineHeight: 32 },
  subtitle: { fontSize: 13, fontWeight: "400", color: Colors.textSecondary, lineHeight: 20, marginTop: 8, paddingRight: 20 },
  progressBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: Colors.primaryLight + "50", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, marginTop: 20 },
  progressText: { color: Colors.primary, fontSize: 12, fontWeight: "500", marginLeft: 6 },
  card: { backgroundColor: Colors.background, borderRadius: 20, marginTop: 20, overflow: "hidden", borderWidth: 1, borderColor: Colors.primaryLight + "60" },
  stepItem: { height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.primaryLight + "60" },
  left: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.success, justifyContent: "center", alignItems: "center", marginRight: 12 },
  stepTitle: { fontSize: 14, fontWeight: "500", color: Colors.text },
  infoCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, marginTop: 18, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  infoText: { flex: 1, marginLeft: 10, color: Colors.textSecondary, fontSize: 12, lineHeight: 18 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: Colors.white, paddingHorizontal: 24, paddingBottom: 24, paddingTop: 10 },
  continueBtn: { height: 54, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", shadowColor: Colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6 },
  continueText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
});
