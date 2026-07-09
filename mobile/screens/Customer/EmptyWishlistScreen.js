import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function EmptyWishlistScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="heart-outline" size={50} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Your Wishlist is Empty</Text>
        <Text style={styles.subtitle}>
          Save your favorite artists by tapping the heart icon.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Categories")}
        >
          <Text style={styles.buttonText}>Explore Artists</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight + "50", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "700", color: Colors.text, textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  button: { backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
  buttonText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
});
