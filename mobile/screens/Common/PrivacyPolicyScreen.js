import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "Information We Collect",
    content:
      "We collect personal information you provide when creating an account, making a booking, or contacting us. This includes your name, email address, phone number, and location data. We also collect usage data such as app interactions, preferences, and device information to improve our services.",
  },
  {
    title: "How We Use Your Information",
    content:
      "Your information is used to facilitate bookings between customers and mehendi artists, process payments, send notifications, and improve our platform. We may also use your data to personalise your experience and provide customer support when needed.",
  },
  {
    title: "Data Security",
    content:
      "We implement industry-standard security measures to protect your data from unauthorised access, alteration, or disclosure. Your payment information is encrypted and processed through secure third-party payment gateways. However, no method of transmission over the internet is completely secure.",
  },
  {
    title: "Third Party Services",
    content:
      "We may share your data with trusted third-party service providers for payment processing, analytics, and notification services. These providers are bound by confidentiality agreements and are only permitted to use your data for the specified purposes.",
  },
  {
    title: "Your Rights",
    content:
      "You have the right to access, update, or delete your personal data at any time. You can manage your preferences through the app settings or contact us directly. You may also request a copy of the data we hold about you.",
  },
  {
    title: "Contact Us",
    content:
      "If you have any questions about this Privacy Policy or how we handle your data, please contact us at support@mehandigo.com or write to us at MehandiGo, Jaipur, Rajasthan, India.",
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.lastUpdated}>Last updated: 1 June 2026</Text>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
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
  lastUpdated: {
    fontSize: 13,
    color: "#7A7A7A",
    marginBottom: 24,
    fontStyle: "italic",
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
