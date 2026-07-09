import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

const bookedSlots = ["10:00 AM", "02:00 PM", "05:00 PM"];

const generateDates = () => {
  const today = new Date();
  const dates = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    dates.push({
      dayName: dayNames[date.getDay()],
      date: date.getDate(),
      fullDate: date,
      isToday: date.toDateString() === today.toDateString(),
    });
  }

  return dates;
};

export default function AvailabilityScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const monthYear = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dates = generateDates();

  const isBooked = (slot) => bookedSlots.includes(slot);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#1D1D1D" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Availability</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.monthLabel}>
          <Ionicons name="calendar-outline" size={20} color="#F7146B" />

          <Text style={styles.monthText}>{monthYear}</Text>
        </View>

        <View style={styles.dateGrid}>
          <View style={styles.dateHeaderRow}>
            {dayNames.map((day) => (
              <View key={day} style={styles.dayNameCell}>
                <Text style={styles.dayNameText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.dateRow}>
            {dates.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCell,
                  item.isToday && styles.todayCell,
                  selectedDate?.toDateString() ===
                    item.fullDate.toDateString() && styles.selectedDateCell,
                ]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    item.isToday && styles.todayText,
                    selectedDate?.toDateString() ===
                      item.fullDate.toDateString() && styles.selectedDateText,
                  ]}
                >
                  {item.date}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available Time Slots</Text>

        <View style={styles.slotGrid}>
          {timeSlots.map((slot) => {
            const booked = isBooked(slot);
            const selected = selectedSlot === slot;

            return (
              <TouchableOpacity
                key={slot}
                disabled={booked}
                style={[
                  styles.slotCard,
                  booked && styles.slotBooked,
                  selected && styles.slotSelected,
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text
                  style={[
                    styles.slotText,
                    booked && styles.slotTextBooked,
                    selected && styles.slotTextSelected,
                  ]}
                >
                  {slot}
                </Text>

                {booked && (
                  <Text style={styles.bookedLabel}>Booked</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE4EF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  monthLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  dateGrid: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  dayNameCell: {
    width: 40,
    alignItems: "center",
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dateCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  todayCell: {
    borderWidth: 2,
    borderColor: "#F7146B",
  },
  selectedDateCell: {
    backgroundColor: "#F7146B",
  },
  dateNumber: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  todayText: {
    color: "#F7146B",
  },
  selectedDateText: {
    color: "#FFF",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  slotCard: {
    width: "47%",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
    alignItems: "center",
  },
  slotBooked: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E5E5E5",
  },
  slotSelected: {
    backgroundColor: "#F7146B",
    borderColor: "#F7146B",
  },
  slotText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  slotTextBooked: {
    color: "#BBB",
    textDecorationLine: "line-through",
  },
  slotTextSelected: {
    color: "#FFF",
    fontWeight: "600",
  },
  bookedLabel: {
    fontSize: 10,
    color: "#CCC",
    marginTop: 2,
    fontWeight: "500",
  },
});
