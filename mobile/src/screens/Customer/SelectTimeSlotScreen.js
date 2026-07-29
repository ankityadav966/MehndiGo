import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import moment from "moment";
import { fetchArtistAvailability } from "../../services/customer";

export default function SelectTimeSlotScreen({ route, navigation }) {
  const { artistId, serviceId, selectedDate: paramDate } = route.params || {};

  // Single Date & Single Slot Rule: Exactly 1 Date (string YYYY-MM-DD)
  const targetDate = typeof paramDate === "string" ? paramDate : (Array.isArray(paramDate) ? paramDate[0] : moment().format("YYYY-MM-DD"));

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId || !targetDate) {
      Alert.alert("Error", "Missing booking date context.");
      navigation.goBack();
      return;
    }

    const loadSlots = async () => {
      try {
        const data = await fetchArtistAvailability(artistId);
        
        // Filter slots matching the target date
        const daySlots = (data || []).filter((slot) => {
          const slotDate = moment(slot.start_time).format("YYYY-MM-DD");
          return slotDate === targetDate;
        });

        // Fallback standard time slots if no availability record is seeded for this date
        let finalSlots = daySlots;
        if (daySlots.length === 0) {
          finalSlots = [
            { id: `slot_${targetDate}_10am`, start_time: `${targetDate}T10:00:00.000Z`, end_time: `${targetDate}T13:00:00.000Z`, is_booked: false },
            { id: `slot_${targetDate}_02pm`, start_time: `${targetDate}T14:00:00.000Z`, end_time: `${targetDate}T17:00:00.000Z`, is_booked: false },
            { id: `slot_${targetDate}_06pm`, start_time: `${targetDate}T18:00:00.000Z`, end_time: `${targetDate}T21:00:00.000Z`, is_booked: false }
          ];
        }

        setAvailableSlots(finalSlots);

        // Pre-select first non-booked slot
        const firstAvailable = finalSlots.find(s => !s.is_booked);
        if (firstAvailable) {
          setSelectedSlotId(firstAvailable.id);
        }
      } catch (err) {
        Alert.alert("Error", "Failed to fetch time slots for selected date.");
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [artistId, targetDate]);

  const handleSlotPress = (slot) => {
    if (slot.is_booked) {
      Alert.alert("Unavailable", "This time slot is already booked. Please select another slot.");
      return;
    }
    // Single Time Slot Rule: Selecting a slot replaces any previous selection automatically!
    setSelectedSlotId(slot.id);
  };

  const handleContinue = () => {
    if (!selectedSlotId) {
      Alert.alert("Required", "Please choose 1 time slot to proceed with your booking.");
      return;
    }

    const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot) {
      Alert.alert("Error", "Selected time slot is invalid.");
      return;
    }

    const startStr = moment(chosenSlot.start_time).format("hh:mm A");
    const endStr = moment(chosenSlot.end_time).format("hh:mm A");
    const timeLabel = `${startStr} - ${endStr}`;
    const cleanSlotId = String(chosenSlot.id).startsWith("slot_") ? null : chosenSlot.id;

    // Pass strictly 1 date & 1 time slot to AddressSelection
    navigation.navigate("AddressSelection", {
      artistId,
      serviceId,
      selectedDate: targetDate,
      slotId: cleanSlotId,
      timeLabel: timeLabel
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select 1 Time Slot</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.dateHeaderCard}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.dateHeaderText}>
              {moment(targetDate).format("dddd, DD MMMM YYYY")}
            </Text>
          </View>

          <Text style={styles.instructionText}>
            Select exactly 1 time slot for your mehndi session:
          </Text>

          <View style={styles.slotContainer}>
            {availableSlots.map((item) => {
              const startLabel = moment(item.start_time).format("hh:mm A");
              const endLabel = moment(item.end_time).format("hh:mm A");
              const label = `${startLabel} - ${endLabel}`;
              const isSelected = selectedSlotId === item.id;
              const isBooked = item.is_booked;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={isBooked ? 1 : 0.8}
                  disabled={isBooked}
                  onPress={() => handleSlotPress(item)}
                  style={[
                    styles.slotCard,
                    isSelected && styles.selectedSlot,
                    isBooked && styles.bookedSlot
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={isBooked ? "close-circle" : isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isBooked ? Colors.error : isSelected ? Colors.white : Colors.textTertiary}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.slotText, isSelected && styles.selectedText, isBooked && styles.bookedText]}>
                      {label}
                    </Text>
                  </View>
                  {isBooked ? (
                    <Text style={styles.bookedBadge}>Already Booked</Text>
                  ) : isSelected ? (
                    <Text style={styles.selectedBadge}>Selected</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <CustomButton
          title="Continue to Address"
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
  dateHeaderCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, marginHorizontal: 16, marginVertical: 12, padding: 14, borderRadius: 14, elevation: 1 },
  dateHeaderText: { fontSize: 14, fontWeight: "700", color: Colors.text, marginLeft: 10 },
  instructionText: { fontSize: 12, color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 12 },
  slotContainer: { paddingHorizontal: 16 },
  slotCard: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, elevation: 1 },
  selectedSlot: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bookedSlot: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB", opacity: 0.7 },
  slotText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  selectedText: { color: Colors.white, fontWeight: "700" },
  bookedText: { color: Colors.textTertiary, textDecorationLine: "line-through" },
  selectedBadge: { fontSize: 11, fontWeight: "700", color: Colors.white },
  bookedBadge: { fontSize: 11, fontWeight: "700", color: Colors.error },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border }
});
