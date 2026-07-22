import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen({ navigation }) {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("EditProfile")}>
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: "https://picsum.photos/300" }} style={styles.avatar} />
          <TouchableOpacity style={styles.cameraBtn}>
            <Ionicons name="camera" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>Priya Mehendi Artist</Text>
        <Text style={styles.email}>priya@gmail.com</Text>
        <Text style={styles.phone}>+91 98765 43210</Text>
      </View>

      <View style={styles.menuSection}>
        {[
          { icon: "bag-outline", label: "My Bookings", route: "MyBookings", color: Colors.primary },
          { icon: "heart-outline", label: "My Wishlist", route: "Wishlist", color: Colors.error },
          { icon: "wallet-outline", label: "My Wallet", route: "Wallet", color: Colors.success },
          { icon: "notifications-outline", label: "Notifications", route: "NotificationCenter", color: Colors.warning },
          { icon: "settings-outline", label: "Settings", route: "Settings", color: Colors.textSecondary },
          { icon: "help-circle-outline", label: "Support", route: "Support", color: Colors.info },
          { icon: "log-out-outline", label: "Logout", action: "logout", color: Colors.error },
        ].map((item, index) => (
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
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: "700", color: Colors.text },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight + "30", justifyContent: "center", alignItems: "center" },
  profileSection: { alignItems: "center", paddingBottom: 25, borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: 20 },
  avatarWrapper: { position: "relative", marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  cameraBtn: { position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 20, fontWeight: "700", color: Colors.text },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  phone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  menuSection: { paddingHorizontal: 20, paddingTop: 15 },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: Colors.text },
});
