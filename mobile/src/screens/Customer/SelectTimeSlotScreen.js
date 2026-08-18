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
  const { artistId, serviceId, selectedDate: paramDate, selectedArt } = route.params || {};

  const targetDate = typeof paramDate === "string" ? paramDate : (Array.isArray(paramDate) ? paramDate[0] : moment().format("YYYY-MM-DD"));
  const isToday = moment(targetDate).isSame(moment(), "day");

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
        const rawData = await fetchArtistAvailability(artistId);
        const slotsList = Array.isArray(rawData) ? rawData : (rawData?.slots || rawData?.data || []);

        // Filter slots matching target date
        let daySlots = (slotsList || []).filter((slot) => {
          const sDate = slot.date || (slot.start_time ? moment(slot.start_time).format("YYYY-MM-DD") : null);
          return sDate === targetDate;
        });

        const isToday = moment(targetDate).isSame(moment(), "day");
        const now = moment();
        // Buffer: 30 minutes to allow artist preparation and travel
        const bufferMinutes = 30;

        const parseSlotMoment = (timeStr, dateStr) => {
          if (!timeStr) return null;
          // Try parsing formatted string like "09:00 AM" or ISO timestamp
          const m = moment(`${dateStr} ${timeStr}`, ["YYYY-MM-DD hh:mm A", "YYYY-MM-DD h:mm A", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"]);
          return m.isValid() ? m : null;
        };

        // Standard 6 dynamic slots throughout the day if none from backend or to supplement
        const standardTimes = [
          "08:00 AM",
          "10:30 AM",
          "01:00 PM",
          "03:30 PM",
          "06:00 PM",
          "08:30 PM"
        ];

        if (!daySlots || daySlots.length === 0) {
          daySlots = standardTimes.map((t, idx) => {
            const slotMoment = parseSlotMoment(t, targetDate);
            const isPast = isToday && slotMoment && slotMoment.clone().subtract(bufferMinutes, "minutes").isBefore(now);
            return {
              id: `def_${targetDate}_${idx}`,
              artist_id: artistId,
              date: targetDate,
              time_slot: t,
              slot_time: t,
              is_available: !isPast,
              status: isPast ? "past" : "available"
            };
          });
        } else {
          // Process slots returned from artist schedule / backend
          daySlots = daySlots.map((slot, idx) => {
            const timeLabel = slot.time_slot || slot.slot_time || (slot.start_time ? moment(slot.start_time).format("hh:mm A") : "10:00 AM");
            const slotMoment = parseSlotMoment(timeLabel, targetDate) || (slot.start_time ? moment(slot.start_time) : null);
            const isPast = isToday && slotMoment && slotMoment.clone().subtract(bufferMinutes, "minutes").isBefore(now);
            const isBooked = slot.is_booked || slot.status === "booked";

            return {
              ...slot,
              id: slot.id || `slot_${targetDate}_${idx}`,
              time_slot: timeLabel,
              slot_time: timeLabel,
              is_available: !isPast && !isBooked,
              status: isBooked ? "booked" : (isPast ? "past" : "available")
            };
          });
        }

        setAvailableSlots(daySlots);

        // Pre-select first available FUTURE slot
        const firstAvail = daySlots.find(s => s.is_available && s.status === "available");
        if (firstAvail) {
          setSelectedSlotId(firstAvail.id);
        } else {
          setSelectedSlotId(null);
        }
      } catch (err) {
        console.log("Error loading availability slots:", err.message);
        Alert.alert("Error", "Failed to fetch time slots for selected date.");
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [artistId, targetDate]);

  const handleSlotPress = (slot) => {
    if (!slot.is_available || slot.status === "booked" || slot.status === "past") {
      Alert.alert("Unavailable Slot", "This time slot is not available for booking. Please pick another slot.");
      return;
    }
    setSelectedSlotId(slot.id);
  };

  const [isNavigating, setIsNavigating] = useState(false);

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
    
    if (isNavigating) return;
    setIsNavigating(true);

    const timeLabel = chosenSlot.time_slot || chosenSlot.slot_time || (chosenSlot.start_time ? moment(chosenSlot.start_time).format("hh:mm A") : "10:00 AM");
    const cleanSlotId = String(chosenSlot.id).startsWith("def_") || String(chosenSlot.id).startsWith("slot_") ? null : chosenSlot.id;

    navigation.navigate("AddressSelection", {
      artistId,
      serviceId,
      selectedDate: targetDate,
      slotId: cleanSlotId,
      timeLabel: timeLabel,
      selectedArt
    });
    
    setTimeout(() => setIsNavigating(false), 500);
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

          {isToday && availableSlots.length > 0 && !availableSlots.some(s => s.is_available) ? (
            <View style={styles.noSlotsCard}>
              <Ionicons name="time-outline" size={28} color={Colors.primary} />
              <Text style={styles.noSlotsTitle}>No slots remaining today</Text>
              <Text style={styles.noSlotsSub}>All time slots for today have already passed. Please select tomorrow or an upcoming date.</Text>
              <TouchableOpacity
                style={styles.pickTomorrowBtn}
                onPress={() => {
                  navigation.replace("SelectTimeSlot", {
                    artistId,
                    serviceId,
                    selectedDate: moment().add(1, "day").format("YYYY-MM-DD"),
                    selectedArt
                  });
                }}
              >
                <Ionicons name="arrow-forward-circle" size={18} color={Colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.pickTomorrowBtnText}>View Tomorrow's Slots</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.slotContainer}>
            {availableSlots.map((item) => {
              const label = item.time_slot || item.slot_time || (item.start_time ? moment(item.start_time).format("hh:mm A") : "10:00 AM");
              const isSelected = selectedSlotId === item.id;
              const isBookedOrPast = !item.is_available || item.status === "booked" || item.status === "past";
              const isBooked = item.status === "booked";
              const isPast = item.status === "past";

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={isBookedOrPast ? 1 : 0.8}
                  disabled={isBookedOrPast}
                  onPress={() => handleSlotPress(item)}
                  style={[
                    styles.slotCard,
                    isSelected && styles.selectedSlot,
                    isBookedOrPast && styles.bookedSlot
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={isBookedOrPast ? "close-circle" : isSelected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={isBookedOrPast ? Colors.textTertiary : isSelected ? Colors.white : Colors.textTertiary}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.slotText, isSelected && styles.selectedText, isBookedOrPast && styles.bookedText]}>
                      {label}
                    </Text>
                  </View>
                  {isBooked ? (
                    <Text style={styles.bookedBadge}>Already Booked</Text>
                  ) : isPast ? (
                    <Text style={styles.bookedBadge}>Passed</Text>
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
  noSlotsCard: {
    backgroundColor: "#FFF4F2",
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECDCA"
  },
  noSlotsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B42318",
    marginTop: 8,
    marginBottom: 4
  },
  noSlotsSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14
  },
  pickTomorrowBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10
  },
  pickTomorrowBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700"
  },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border }
});
