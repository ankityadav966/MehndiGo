import { Ionicons } from "@expo/vector-icons";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const services = [
  {
    id: "1",
    name: "Bridal Mehndi",
    description:
      "Full bridal mehendi design covering both hands and feet with intricate patterns, personalized motifs, and rich dark color.",
    price: "₹5,000",
    duration: "3-4 hours",
  },
  {
    id: "2",
    name: "Arabic Mehndi",
    description:
      "Beautiful Arabic floral and vine patterns with bold outlines and elegant spacing. Perfect for mehendi functions.",
    price: "₹3,000",
    duration: "2-3 hours",
  },
  {
    id: "3",
    name: "Engagement Mehndi",
    description:
      "Semi-bridal mehendi with a mix of traditional and contemporary designs. Includes both hands with minimal feet work.",
    price: "₹4,000",
    duration: "2.5-3 hours",
  },
  {
    id: "4",
    name: "Festival Mehndi",
    description:
      "Simple yet elegant mehendi designs for festivals like Karva Chauth, Diwali, Teej, and other celebrations.",
    price: "₹2,000",
    duration: "1-2 hours",
  },
];

export default function PricingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#1D1D1D" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Pricing</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {services.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.name}</Text>

              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
            </View>

            <Text style={styles.description}>{item.description}</Text>

            <View style={styles.durationRow}>
              <Ionicons name="time-outline" size={16} color="#888" />

              <Text style={styles.durationText}>{item.duration}</Text>
            </View>

            <TouchableOpacity style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Book Now</Text>

              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE4EF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    flex: 1,
  },
  priceBadge: {
    backgroundColor: "#FFF0F6",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F7146B",
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  durationText: {
    fontSize: 13,
    color: "#888",
    marginLeft: 6,
    fontWeight: "500",
  },
  bookBtn: {
    flexDirection: "row",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F7146B",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bookBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
