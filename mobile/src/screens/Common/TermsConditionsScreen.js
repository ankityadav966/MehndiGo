import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "Acceptance",
    content:
      "By using the MehandiGo app, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and MehandiGo.",
  },
  {
    title: "Services",
    content:
      "MehandiGo provides a platform connecting customers with mehendi artists for booking appointments. We facilitate the booking process but are not responsible for the quality of service provided by artists. All service disputes should be resolved directly with the artist.",
  },
  {
    title: "User Obligations",
    content:
      "You agree to provide accurate information during registration and booking. You must not misuse the platform for fraudulent activities, harassment, or any unlawful purpose. You are responsible for maintaining the confidentiality of your account credentials.",
  },
  {
    title: "Payments",
    content:
      "All payments are processed through secure third-party gateways. Prices displayed on the platform are inclusive of applicable taxes unless stated otherwise. MehandiGo reserves the right to change pricing with prior notice.",
  },
  {
    title: "Cancellations",
    content:
      "Cancellation policies may vary by artist. Customers may cancel a booking before the scheduled time subject to the artist's cancellation policy. Refunds will be processed within 5-7 business days as per the applicable cancellation terms.",
  },
  {
    title: "Limitation of Liability",
    content:
      "MehandiGo shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of our platform. Our total liability is limited to the amount paid by you for the specific booking giving rise to the claim.",
  },
  {
    title: "Governing Law",
    content:
      "These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Jaipur, Rajasthan.",
  },
];

export default function TermsConditionsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {index + 1}. {section.title}
            </Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
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
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D1D1D",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1D1D1D",
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 14,
    color: "#7A7A7A",
    lineHeight: 24,
  },
});
