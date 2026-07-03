import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

import { useAuth } from "../../context/AuthContext";

export default function SettingsScreen({ navigation }) {
  const { logout, user } = useAuth();
  const settingsOptions = [
    { icon: "notifications-outline", label: "Notifications", route: "NotificationCenter", color: Colors.warning },
    ...(user?.role !== "ARTIST" ? [{ icon: "lock-closed-outline", label: "Change Password", route: "ChangePassword", color: Colors.info }] : []),
    { icon: "shield-checkmark-outline", label: "Privacy Policy", route: "PrivacyPolicy", color: Colors.success },
    { icon: "document-text-outline", label: "Terms & Conditions", route: "TermsConditions", color: Colors.primary },
    { icon: "help-circle-outline", label: "Help & Support", route: "Support", color: Colors.textSecondary },
    { icon: "trash-outline", label: "Delete Account", route: "DeleteAccount", color: Colors.error },
    { icon: "log-out-outline", label: "Logout", action: "logout", color: Colors.error },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {settingsOptions.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={() => {
            if (item.action === "logout") {
              logout();
            } else {
              navigation.navigate(item.route);
            }
          }}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryLight + "20" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: Colors.text },
  content: { paddingHorizontal: 16, marginTop: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, padding: 16, borderRadius: 14, marginBottom: 10 },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: Colors.text },
});
