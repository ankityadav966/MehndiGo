import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CustomerDetailsScreen({ navigation }) {
  const customer = {
    name: "Ananya Sharma",
    phone: "+91 98765 43210",
    email: "ananya.sharma@email.com",
    image: null,
  };

  const bookings = [
    {
      id: "1",
      date: "12 Mar 2024",
      service: "Bridal Mehendi",
      amount: "Ã¢â€šÂ¹10,000",
      status: "Completed",
    },
    {
      id: "2",
      date: "28 Jan 2024",
      service: "Arabic Mehendi",
      amount: "Ã¢â€šÂ¹3,000",
      status: "Completed",
    },
    {
      id: "3",
      date: "15 Dec 2023",
      service: "Festival Mehendi",
      amount: "Ã¢â€šÂ¹2,000",
      status: "Completed",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={styles.empty} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileImageWrapper}>
            {customer.image ? (
              <Image source={{ uri: customer.image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={36} color="#FFF" />
              </View>
            )}
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>

          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#888" />
            <Text style={styles.contactText}>{customer.phone}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color="#888" />
            <Text style={styles.contactText}>{customer.email}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Booking History</Text>

        {bookings.map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingLeft}>
              <Text style={styles.bookingService}>{booking.service}</Text>
              <Text style={styles.bookingDate}>{booking.date}</Text>
            </View>
            <View style={styles.bookingRight}>
              <Text style={styles.bookingAmount}>{booking.amount}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{booking.status}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.callButton}>
          <Ionicons name="call-outline" size={18} color="#FFF" />
          <Text style={styles.callButtonText}>Contact Customer</Text>
        </TouchableOpacity>
      </View>
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
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 24,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  profileImageWrapper: {
    marginBottom: 14,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  customerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  bookingLeft: {
    flex: 1,
  },
  bookingService: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  bookingDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  bookingRight: {
    alignItems: "flex-end",
  },
  bookingAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  statusBadge: {
    marginTop: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF8FA",
  },
  callButton: {
    height: 56,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  callButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
});
