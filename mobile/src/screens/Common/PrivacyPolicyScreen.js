import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

const CUSTOMER_SECTIONS = [
  {
    icon: "person-outline",
    title: "1. Account & Profile Information",
    content: "When you register as a Customer on MehndiGo, we collect your name, phone number, email address, and profile image. This data is used to establish your identity, secure your login sessions, and personalize your experience on the platform."
  },
  {
    icon: "location-outline",
    title: "2. Geolocation Services",
    content: "To facilitate bookings with nearby artists, MehndiGo requests permission to access your device's precise location. This location data is processed locally and server-side to calculate distance metrics and display qualified professionals in your immediate vicinity."
  },
  {
    icon: "card-outline",
    title: "3. Safe Payment Processing",
    content: "All financial transactions (including MehndiGo Wallet top-ups and service bookings) are securely routed through certified third-party payment gateways like Razorpay. We do not store or log your raw credit card digits, net banking credentials, or UPI PINs."
  },
  {
    icon: "chatbubbles-outline",
    title: "4. Messaging & Support Files",
    content: "Our real-time chat interface enables communication between you and the assigned artist. When sharing images, audio recordings, or documents (PDF, DOCX, ZIP), these media attachments are uploaded to secure Cloudinary buckets to prevent unauthorized exposure."
  },
  {
    icon: "shield-checkmark-outline",
    title: "5. Customer Rights & Data Retention",
    content: "You retain full control over your personal data. You have the right to edit your profile information, request complete data deletion, or skip optional reviews at any time. We retain data strictly as long as necessary to comply with tax and audit regulations."
  }
];

const ARTIST_SECTIONS = [
  {
    icon: "finger-print-outline",
    title: "1. Verification & KYC Uploads",
    content: "To build a trusted marketplace, MehndiGo enforces strict KYC checks. Artists must upload clear photos of their Aadhaar Card (front and back) and a verification selfie. These documents are stored under access-controlled cloud repositories and are reviewed manually by our trust team."
  },
  {
    icon: "map-outline",
    title: "2. Active Location Tracking",
    content: "To coordinate on-site appointments (home services or salon visits), artists' coordinates are updated during active booking intervals. This tracking ensures service accountability and enables customers to monitor their artist's transit status in real time."
  },
  {
    icon: "calendar-outline",
    title: "3. Service Portfolio & Availability",
    content: "Portfolio images, video reels, and service slots you upload must represent your authentic work and availability. Any misleading listings or double-booked slots may result in temporary booking restrictions to ensure a highly reliable platform experience."
  },
  {
    icon: "wallet-outline",
    title: "4. Earnings & Settlement Policy",
    content: "Payouts and service fees are deposited directly to your registered bank account or wallet. MehndiGo holds advance payments securely in escrow until checkout OTP verification confirms successful appointment completion."
  },
  {
    icon: "briefcase-outline",
    title: "5. Code of Conduct & Disputes",
    content: "Artists are expected to maintain professional standards when visiting customers. In the event of a dispute, service cancellation, or cash-collection conflict, MehndiGo reserves the right to review status histories and logs to resolve the issue fairly."
  }
];

export default function PrivacyPolicyScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("customer"); // 'customer' | 'artist'

  const sections = activeTab === "customer" ? CUSTOMER_SECTIONS : ARTIST_SECTIONS;

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal & Privacy</Text>
        <View style={styles.secureHeader}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.secureText}>Verified</Text>
        </View>
      </View>

      {/* Segmented Control Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === "customer" && styles.activeTabButton]}
          onPress={() => setActiveTab("customer")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "customer" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === "customer" && styles.activeTabText]}>
            Customer Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.tabButton, activeTab === "artist" && styles.activeTabButton]}
          onPress={() => setActiveTab("artist")}
        >
          <Ionicons
            name="brush"
            size={16}
            color={activeTab === "artist" ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === "artist" && styles.activeTabText]}>
            Artist Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.metaCard}>
          <Text style={styles.lastUpdated}>Last Revised: July 16, 2026</Text>
          <Text style={styles.introText}>
            At MehndiGo, we prioritize your data sovereignty and security. This policy outlines how we capture, protect, and process data across our mobile panels.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.clauseCard}>
            <View style={styles.clauseHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name={section.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.clauseTitle}>{section.title}</Text>
            </View>
            <Text style={styles.clauseContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footerInfo}>
          <Ionicons name="mail-unread-outline" size={24} color={Colors.textTertiary} />
          <Text style={styles.contactTitle}>Questions or Feedback?</Text>
          <Text style={styles.contactSub}>
            Reach out to our compliance department at legal@mehndigo.com for data access or deletion requests.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECEB",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F3F2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  secureHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAFBF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  secureText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "700",
    marginLeft: 3,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#F1ECEB",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: Colors.white,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: "700",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EFEBEA",
  },
  lastUpdated: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6,
  },
  introText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  clauseCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EFEBEA",
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.primary,
  },
  clauseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF2F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  clauseTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  clauseContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingLeft: 38,
  },
  footerInfo: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  contactSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 16,
  },
});
