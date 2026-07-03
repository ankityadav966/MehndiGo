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
  const { artistId, serviceId, selectedDates } = route.params || {};
  const dateList = Array.isArray(selectedDates) ? selectedDates : [selectedDates || new Date().toISOString().split("T")[0]];

  const [slots, setSlots] = useState({});
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId || dateList.length === 0) {
      Alert.alert("Error", "Missing context.");
      navigation.goBack();
      return;
    }

    const loadSlots = async () => {
      try {
        const data = await fetchArtistAvailability(artistId);
        
        // Filter slots that match selected dates and are not booked
        const daySlots = (data || []).filter((slot) => {
          const slotDate = moment(slot.start_time).format("YYYY-MM-DD");
          return dateList.includes(slotDate) && !slot.is_booked;
        });

        // Group slots by date
        const grouped = {};
        dateList.forEach((date) => {
          grouped[date] = daySlots.filter((slot) => moment(slot.start_time).format("YYYY-MM-DD") === date);
        });

        // If a date has no available slots, populate dummy slots for that date!
        dateList.forEach((date) => {
          if (grouped[date].length === 0) {
            grouped[date] = [
              { id: `dummy_${date}_1`, start_time: `${date}T10:00:00.000Z`, end_time: `${date}T13:00:00.000Z` },
              { id: `dummy_${date}_2`, start_time: `${date}T14:00:00.000Z`, end_time: `${date}T17:00:00.000Z` },
              { id: `dummy_${date}_3`, start_time: `${date}T18:00:00.000Z`, end_time: `${date}T21:00:00.000Z` }
            ];
          }
        });

        setSlots(grouped);

        // Pre-select first slot of each date
        const initialSelected = [];
        Object.keys(grouped).forEach((date) => {
          if (grouped[date].length > 0) {
            initialSelected.push(grouped[date][0].id);
          }
        });
        setSelectedSlotIds(initialSelected);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch time slot schedules.");
      } finally {
        setLoading(false);
      }
    };

    loadSlots();
  }, [artistId, selectedDates]);

  const handleSlotPress = (itemId) => {
    if (selectedSlotIds.includes(itemId)) {
      if (selectedSlotIds.length > 1) {
        setSelectedSlotIds((prev) => prev.filter((id) => id !== itemId));
      } else {
        Alert.alert("Notice", "You must keep at least one time slot selected.");
      }
    } else {
      setSelectedSlotIds((prev) => [...prev, itemId]);
    }
  };

  const handleContinue = () => {
    if (selectedSlotIds.length === 0) {
      Alert.alert("Required", "Please choose a booking time slot to proceed.");
      return;
    }

    const labels = [];
    const dbSlotIds = [];
    
    Object.keys(slots).forEach((date) => {
      slots[date].forEach((slot) => {
        if (selectedSlotIds.includes(slot.id)) {
          const formattedDate = moment(date).format("DD MMM");
          const startStr = moment(slot.start_time).format("hh:mm A");
          const endStr = moment(slot.end_time).format("hh:mm A");
          labels.push(`${formattedDate} (${startStr} - ${endStr})`);
          if (!String(slot.id).startsWith("dummy_")) {
            dbSlotIds.push(slot.id);
          }
        }
      });
    });

    navigation.navigate("AddressSelection", {
      artistId,
      serviceId,
      selectedDate: dateList.join(","),
      slotId: dbSlotIds,
      timeLabel: labels.join(", ")
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Time Slots</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.introBlock}>
            <Text style={styles.subtitle}>Choose one or more time slots for your selected dates:</Text>
          </View>

          {Object.keys(slots).map((date) => (
            <View key={date} style={{ marginBottom: 20, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.primary, marginBottom: 8, textTransform: "uppercase" }}>
                📅 {moment(date).format("dddd, DD MMMM YYYY")}
              </Text>
              
              <View style={styles.slotContainer}>
                {slots[date].map((item) => {
                  const startLabel = moment(item.start_time).format("hh:mm A");
                  const endLabel = moment(item.end_time).format("hh:mm A");
                  const label = `${startLabel} - ${endLabel}`;
                  const isSelected = selectedSlotIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => handleSlotPress(item.id)}
                      style={[styles.slotCard, isSelected && styles.selectedSlot]}
                    >
                      <Text style={[styles.slotText, isSelected && styles.selectedText]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <CustomButton
          title={`Book ${selectedSlotIds.length} Slot${selectedSlotIds.length > 1 ? "s" : ""} & Continue`}
          disabled={selectedSlotIds.length === 0 || loading}
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
