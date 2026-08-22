import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Linking, Modal, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { getSupportTickets, getCustomerNotifications } from "../../services/customer";
import { TICKET_STATUSES } from "../../constants/SupportCategories";

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
      const [ticketsRes, notifsRes] = await Promise.all([
        getSupportTickets().catch(() => []),
        getCustomerNotifications().catch(() => ({}))
      ]);

      const rawList = Array.isArray(ticketsRes?.data) ? ticketsRes.data : (Array.isArray(ticketsRes) ? ticketsRes : []);
      const ticketMap = new Map();

      rawList.forEach(t => {
        const id = t.id || t.ticket_id;
        if (id) ticketMap.set(Number(id), t);
      });

      const notifsList = Array.isArray(notifsRes?.notifications)
        ? notifsRes.notifications
        : (Array.isArray(notifsRes?.data?.notifications) ? notifsRes.data.notifications : (Array.isArray(notifsRes?.data) ? notifsRes.data : (Array.isArray(notifsRes) ? notifsRes : [])));

      notifsList.filter(n => (n.title && n.title.includes("Support Ticket")) || n.type === "SUPPORT").forEach(n => {
        const match = n.title?.match(/#(\d+)/);
        const ticketId = match ? parseInt(match[1], 10) : n.id;
        if (!ticketId) return;

        const existing = ticketMap.get(ticketId) || {};
        const msgParts = (n.message || "").split(":");
        const subject = msgParts.length > 1 ? msgParts.slice(1).join(":").trim() : (n.message || `Support Ticket #${ticketId}`);

        ticketMap.set(ticketId, {
          ...existing,
          id: ticketId,
          ticket_id: ticketId,
          ticket_number: existing.ticket_number || `MG-${1000 + ticketId}`,
          subject: existing.subject || subject,
          category: existing.category || "General Support",
          status: existing.status || "OPEN",
          created_at: existing.created_at || existing.createdAt || n.created_at || n.createdAt || new Date().toISOString(),
          updated_at: existing.updated_at || existing.updatedAt || n.created_at || n.createdAt || new Date().toISOString()
        });
      });

      const combined = Array.from(ticketMap.values()).sort((a, b) => b.id - a.id);
      setTickets(combined);
    } catch (err) {
      if (__DEV__) console.log("Failed to fetch tickets:", err.message);
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
    // { title: "Raise a Ticket", icon: "document-text-outline", color: Colors.primary || "#F7146B", action: () => navigation.navigate("SupportTicket") },
    { title: "Chat with Support", icon: "chatbubble-ellipses-outline", color: "#3B82F6", action: () => navigation.navigate("SupportTicket") },
    { title: "Call Us (+91 98765 43210)", icon: "call-outline", color: "#10B981", action: handleCall },
    { title: "FAQs & Knowledgebase", icon: "help-circle-outline", color: "#F59E0B", action: () => setFaqsVisible(true) },
  ];

  const getStatusInfo = (status) => {
    const norm = String(status || "OPEN").toUpperCase();
    return TICKET_STATUSES[norm] || { label: norm, color: "#6B7280", bg: "#F3F4F6" };
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
        <Text style={styles.subtitle}>Need assistance? Create a ticket and our team will resolve it.</Text>

        <View style={styles.optionsContainer}>
          {supportOptions.map((item, index) => (
            <TouchableOpacity key={index} style={styles.optionItem} onPress={item.action}>
              <View style={styles.leftSection}>
                <View style={[styles.iconCircle, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.optionText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Tickets History List */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 32, marginBottom: 14 }}>
          <Text style={[styles.title, { fontSize: 18 }]}>My Support Tickets</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SupportTicket")}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>+ New Ticket</Text>
          </TouchableOpacity>
        </View>

        {loadingTickets ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : tickets.length === 0 ? (
          <View style={{ padding: 28, alignItems: "center", backgroundColor: Colors.white, borderRadius: 16, borderWidth: 1, borderColor: Colors.border }}>
            <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
            <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginTop: 12 }}>No Support Tickets Yet</Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              Have an issue with booking, payment, or app? Raise a ticket and get prompt support.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 16, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
              onPress={() => navigation.navigate("SupportTicket")}
            >
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>Raise a Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12, paddingBottom: 40 }}>
            {tickets.map((item) => {
              const statusMeta = getStatusInfo(item.status);
              const ticketNum = item.ticket_number || `#MG-${1000 + (item.id || 1)}`;
              const dateStr = new Date(item.updated_at || item.created_at || item.createdAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

              return (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                  }}
                  onPress={() => navigation.navigate("SupportTicketDetails", { ticketId: item.id, ticket: item })}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.primary }}>{ticketNum}</Text>
                    <View style={{ backgroundColor: statusMeta.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: statusMeta.color + "30" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: statusMeta.color }}>
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 4 }} numberOfLines={1}>
                    {item.subject}
                  </Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                      Category: {item.category || "General"}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textTertiary }}>
                      {dateStr}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
