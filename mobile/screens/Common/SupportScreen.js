import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Linking, Modal, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getSupportTickets } from "../../services/customer";

export default function SupportScreen({ navigation }) {
  const [faqsVisible, setFaqsVisible] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const faqs = [
    { q: "How do I book a Mehendi artist?", a: "Go to Home, choose a category, pick an artist, select your date/time, provide your address, and complete the payment." },
    { q: "Can I cancel my booking?", a: "Yes, you can cancel your booking from the 'My Bookings' screen. Full refunds are processed according to our cancellation policy." },
    { q: "How long does a refund take?", a: "Once approved, refunds are credited back to your wallet instantly or to your bank account within 5-7 business days." },
    { q: "How do I contact my artist?", a: "You can chat directly with your artist from the active booking screen or through the 'Inbox' chat tab." }
  ];

  const fetchTickets = async () => {
    try {
      const data = await getSupportTickets();
      setTickets(data || []);
    } catch (err) {
      console.log("Failed to fetch tickets:", err.message);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTickets();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCall = () => {
    Linking.openURL("tel:+919876543210").catch(() => {
      alert("Calling is not supported on this device.");
    });
  };

  const supportOptions = [
    { title: "Chat with Us", icon: "chatbubble-ellipses-outline", color: Colors.primary, action: () => navigation.navigate("SupportTicket") },
    { title: "Call Us", icon: "call-outline", color: Colors.success, action: handleCall },
    { title: "FAQs", icon: "help-circle-outline", color: Colors.warning, action: () => setFaqsVisible(true) },
    { title: "Raise a Ticket", icon: "document-text-outline", color: Colors.info, action: () => navigation.navigate("SupportTicket") },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN": return Colors.success || "#27AE60";
      case "CLOSED": return Colors.textTertiary || "#999";
      case "ASSIGNED": return Colors.primary || "#F7146B";
      default: return Colors.warning || "#FFAA00";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>How can we help you?</Text>

        <View style={styles.optionsContainer}>
          {supportOptions.map((item, index) => (
            <TouchableOpacity key={index} style={styles.optionItem} onPress={item.action}>
              <View style={styles.leftSection}>
                <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.optionText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Tickets History List */}
        <Text style={[styles.title, { fontSize: 18, marginTop: 32, marginBottom: 12 }]}>My Support Tickets</Text>
        
        {loadingTickets ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : tickets.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center", backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}>
            <Ionicons name="document-text-outline" size={32} color={Colors.textTertiary} />
            <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 8 }}>No support tickets raised yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, paddingBottom: 40 }}>
            {tickets.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={{ backgroundColor: Colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                onPress={() => navigation.navigate("SupportTicketDetails", { ticketId: item.id })}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text }} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
                    Category: {item.category} • Raised on: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ backgroundColor: getStatusColor(item.status) + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: getStatusColor(item.status) }}>
                    {item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAQs Modal */}
      <Modal visible={faqsVisible} transparent animationType="slide" onRequestClose={() => setFaqsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setFaqsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
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
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text },
  subtitle: { marginTop: 6, fontSize: 14, color: Colors.textSecondary, marginBottom: 25 },
  optionsContainer: { gap: 12 },
  optionItem: { height: 58, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white },
  leftSection: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  optionText: { fontSize: 15, fontWeight: "500", color: Colors.text },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: Colors.white, width: "100%", borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  faqCard: { padding: 12, backgroundColor: Colors.background, borderRadius: 10, marginBottom: 10 },
  faqQuestion: { fontSize: 13, fontWeight: "700", color: Colors.text },
  faqAnswer: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 }
});
