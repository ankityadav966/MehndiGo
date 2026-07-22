import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function BookingSuccessScreen({ route, navigation }) {
  const { bookingCode } = route.params || { bookingCode: "BK-829188" };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate("CustomerTabs", { screen: "Home" });
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark" size={50} color={Colors.white} />
        </View>
        <Text style={styles.title}>Booking Confirmed 🎉</Text>
        <Text style={styles.subtitle}>Your Mehndi Artist has been booked successfully. The artist is being notified.</Text>

        <View style={styles.bookingCard}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingId}>#{bookingCode}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardDesc}>
            You can track your booking status history or chat directly with the artist from your Booking Details.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("CustomerTabs", { screen: "Home" })}
      >
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  iconContainer: { alignSelf: "center", width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  title: { marginTop: 25, fontSize: 24, fontWeight: "700", textAlign: "center", color: Colors.text },
  subtitle: { marginTop: 10, fontSize: 13, textAlign: "center", color: Colors.textSecondary, lineHeight: 20 },
  bookingCard: { marginTop: 35, backgroundColor: Colors.background, borderRadius: 16, padding: 18 },
  bookingIdLabel: { fontSize: 12, color: Colors.textSecondary },
  bookingId: { fontSize: 18, fontWeight: "800", color: Colors.primary, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 15 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, textAlign: "center" },
  button: { margin: 20, height: 48, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center" },
  buttonText: { color: Colors.white, fontSize: 14, fontWeight: "700" }
});
