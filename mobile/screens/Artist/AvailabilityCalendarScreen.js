import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AvailabilityCalendarScreen({ navigation }) {
  const [availability, setAvailability] = useState(
    DAYS.map((day) => ({
      day,
      enabled: day !== "Sunday",
      startTime: day === "Sunday" ? "" : "09:00",
      endTime: day === "Sunday" ? "" : "18:00",
    }))
  );

  const toggleDay = (index) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setAvailability(updated);
  };

  const updateTime = (index, field, value) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  const handleSave = () => {
    Alert.alert("Saved", "Your availability has been updated successfully.");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Availability</Text>
          <View style={styles.empty} />
        </View>

        <Text style={styles.subtitle}>
          Set your weekly working hours. Customers can only book during available slots.
        </Text>

        {availability.map((item, index) => (
          <View key={item.day} style={[styles.dayCard, !item.enabled && styles.dayCardDisabled]}>
            <View style={styles.dayHeader}>
              <View style={styles.dayInfo}>
                <Text style={[styles.dayName, !item.enabled && styles.dayNameDisabled]}>
                  {item.day}
                </Text>
                {item.enabled && (
                  <View style={styles.activeDot} />
                )}
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleDay(index)}
                trackColor={{ false: "#E0E0E0", true: "#FCCFDF" }}
                thumbColor={item.enabled ? PRIMARY : "#CCC"}
              />
            </View>

            {item.enabled && (
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TextInput
                    placeholder="09:00"
                    placeholderTextColor="#999"
                    value={item.startTime}
                    onChangeText={(val) => updateTime(index, "startTime", val)}
                    style={styles.timeInput}
                  />
                </View>
                <Text style={styles.timeSeparator}>to</Text>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    placeholder="18:00"
                    placeholderTextColor="#999"
                    value={item.endTime}
                    onChangeText={(val) => updateTime(index, "endTime", val)}
                    style={styles.timeInput}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Availability</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PRIMARY = "#F7146B";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  empty: {
    width: 40,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    paddingHorizontal: 16,
    marginBottom: 18,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  dayCardDisabled: {
    opacity: 0.55,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  dayNameDisabled: {
    color: "#999",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginLeft: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
    gap: 8,
  },
  timeField: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginBottom: 6,
  },
  timeInput: {
    height: 48,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111",
  },
  timeSeparator: {
    fontSize: 14,
    color: "#999",
    paddingBottom: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF8FA",
  },
  saveButton: {
    height: 56,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
