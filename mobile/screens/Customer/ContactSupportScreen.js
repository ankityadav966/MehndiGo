import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ContactSupportScreen({ navigation }) {
  const supportNumber = "+91 98765 43210";
  const supportEmail = "support@mehandigo.com";
  const [faqsVisible, setFaqsVisible] = useState(false);

  const faqs = [
    { q: "How do I book a Mehendi artist?", a: "Go to Home, choose a category, pick an artist, select your date/time, provide your address, and complete the payment." },
    { q: "Can I cancel my booking?", a: "Yes, you can cancel your booking from the 'My Bookings' screen. Full refunds are processed according to our cancellation policy." },
    { q: "How long does a refund take?", a: "Once approved, refunds are credited back to your wallet instantly or to your bank account within 5-7 business days." },
    { q: "How do I contact my artist?", a: "You can chat directly with your artist from the active booking screen or through the 'Inbox' chat tab." }
  ];

  const handleCall = () => {
    Linking.openURL(`tel:${supportNumber.replace(/\s/g, "")}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${supportEmail}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Contact Support</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.chatCard}>
            <View style={styles.chatIconCircle}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={28}
                color="#F7146B"
              />
            </View>

            <Text style={styles.chatTitle}>Chat with Us</Text>

            <Text style={styles.chatDesc}>
              Get instant help from our support team
            </Text>

            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate("SupportTicket")}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />

              <Text style={styles.chatBtnText}>Start Chat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsSection}>
            <TouchableOpacity style={styles.optionRow} onPress={handleCall}>
              <View style={styles.optionIconBox}>
                <Ionicons name="call-outline" size={20} color="#F7146B" />
              </View>

              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Call Us</Text>

                <Text style={styles.optionValue}>{supportNumber}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={handleEmail}>
              <View style={styles.optionIconBox}>
                <Ionicons name="mail-outline" size={20} color="#F7146B" />
              </View>

              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Email Us</Text>

                <Text style={styles.optionValue}>{supportEmail}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.faqBtn} onPress={() => setFaqsVisible(true)}>
            <Ionicons name="help-circle-outline" size={20} color="#F7146B" />

            <Text style={styles.faqBtnText}>FAQs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ticketBtn}
            onPress={() => navigation.navigate("SupportTicket")}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFF" />

            <Text style={styles.ticketBtnText}>Raise a Ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FAQs Modal */}
      <Modal visible={faqsVisible} transparent animationType="slide" onRequestClose={() => setFaqsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setFaqsVisible(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {faqs.map((faq, index) => (
                <View key={index} style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>Q: {faq.q}</Text>
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    paddingHorizontal: 20,
  },
  chatCard: {
    alignItems: "center",
    backgroundColor: "#FFF8FA",
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: "#FFE4EF",
    marginBottom: 24,
  },
  chatIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  chatDesc: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
    marginBottom: 18,
  },
  chatBtn: {
    height: 44,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: "#F7146B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  optionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF8FA",
    justifyContent: "center",
    alignItems: "center",
  },
  optionInfo: {
    flex: 1,
    marginLeft: 14,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  optionValue: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  faqBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F7146B",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  faqBtnText: {
    color: "#F7146B",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  ticketBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F7146B",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 40,
  },
  ticketBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFF",
    width: "100%",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  faqCard: {
    padding: 12,
    backgroundColor: "#FFF8FA",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FFE4EF",
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  faqAnswer: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    lineHeight: 18,
  },
});