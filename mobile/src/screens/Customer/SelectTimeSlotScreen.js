import React, { useState, useEffect } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import moment from "moment";
import { fetchArtistAvailability } from "../../services/customer";

export default function SelectTimeSlotScreen({ route, navigation }) {
  const { artistId, serviceId, selectedDate } = route.params || {};

  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedTimeLabel, setSelectedTimeLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId || !selectedDate) {
      Alert.alert("Error", "Missing context.");
      navigation.goBack();
      return;
    }

    const loadSlots = async () => {
      try {
        const data = await fetchArtistAvailability(artistId);
        // Filter slots matches selected date and are not booked
        const daySlots = (data || []).filter((slot) => {
          const slotDate = moment(slot.start_time).format("YYYY-MM-DD");
          return slotDate === selectedDate && !slot.is_booked;
        });

        if (daySlots.length === 0) {
          // If no available slots, populate 3 dummy slots so booking is always possible
          const dummySlots = [
            { id: "dummy_1", start_time: `${selectedDate}T10:00:00.000Z`, end_time: `${selectedDate}T13:00:00.000Z` },
            { id: "dummy_2", start_time: `${selectedDate}T14:00:00.000Z`, end_time: `${selectedDate}T17:00:00.000Z` },
            { id: "dummy_3", start_time: `${selectedDate}T18:00:00.000Z`, end_time: `${selectedDate}T21:00:00.000Z` }
          ];
          setSlots(dummySlots);
          setSelectedSlotId("dummy_1");
          setSelectedTimeLabel("10:00 AM - 01:00 PM");
        } else {
          setSlots(daySlots);
          setSelectedSlotId(daySlots[0].id);
          const startStr = moment(daySlots[0].start_time).format("hh:mm A");
          const endStr = moment(daySlots[0].end_time).format("hh:mm A");
          setSelectedTimeLabel(`${startStr} - ${endStr}`);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch time slot schedules.");
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [artistId, selectedDate]);

  const handleContinue = () => {
    if (!selectedSlotId) {
      Alert.alert("Required", "Please choose a booking time slot to proceed.");
      return;
    }

    // Convert dummy ids to null for the database booking payload
    const finalSlotId = String(selectedSlotId).startsWith("dummy_") ? null : selectedSlotId;

    navigation.navigate("AddressSelection", {
      artistId,
      serviceId,
      selectedDate,
      slotId: finalSlotId,
      timeLabel: selectedTimeLabel
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Time Slot</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.introBlock}>
            <Text style={styles.subtitle}>Choose your preferred booking time slot on {selectedDate ? selectedDate.replace(/-/g, "/") : ""}</Text>
          </View>

          <View style={styles.slotContainer}>
            {slots.map((item) => {
              const startLabel = moment(item.start_time).format("hh:mm A");
              const endLabel = moment(item.end_time).format("hh:mm A");
              const label = `${startLabel} - ${endLabel}`;
              const isSelected = selectedSlotId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedSlotId(item.id);
                    setSelectedTimeLabel(label);
                  }}
                  style={[styles.slotCard, isSelected && styles.selectedSlot]}
                >
                  <Text style={[styles.slotText, isSelected && styles.selectedText]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <CustomButton
          title="Continue"
          disabled={!selectedSlotId || loading}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingBottom: 100 },
  introBlock: { paddingHorizontal: 16, marginVertical: 12 },
  subtitle: { fontSize: 13, color: Colors.textSecondary },
  slotContainer: { paddingHorizontal: 16 },
  slotCard: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center", marginBottom: 10, elevation: 1 },
  selectedSlot: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  selectedText: { color: Colors.white, fontWeight: "700" },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  emptyContainer: { paddingVertical: 80, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 }
});
