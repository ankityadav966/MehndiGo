import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { getArtistAvailability, updateArtistAvailability } from "../../services/artist";

const DAYS = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
  { key: "SATURDAY", label: "Saturday" },
  { key: "SUNDAY", label: "Sunday" }
];

export default function AvailabilityCalendarScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [breakStart, setBreakStart] = useState("14:00");
  const [breakEnd, setBreakEnd] = useState("15:00");
  const [selectedDays, setSelectedDays] = useState(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

  useEffect(() => {
    async function loadSchedule() {
      try {
        // Load cached schedule immediately for 0ms restore
        const localCache = await AsyncStorage.getItem("@mehndigo_artist_availability");
        if (localCache) {
          try {
            const parsed = JSON.parse(localCache);
            if (parsed) {
              if (parsed.is_available !== undefined) setIsAvailable(Boolean(parsed.is_available));
              if (parsed.working_start_time) setStartTime(parsed.working_start_time);
              if (parsed.working_end_time) setEndTime(parsed.working_end_time);
              if (parsed.break_start_time) setBreakStart(parsed.break_start_time);
              if (parsed.break_end_time) setBreakEnd(parsed.break_end_time);
              if (Array.isArray(parsed.working_days) && parsed.working_days.length > 0) {
                setSelectedDays(parsed.working_days);
              }
              setLoading(false);
            }
          } catch (e) {}
        }

        const data = await getArtistAvailability();
        if (data) {
          setIsAvailable(data.is_available !== false && data.is_available !== 0 && data.is_available !== "0");
          if (data.working_start_time) setStartTime(data.working_start_time);
          if (data.working_end_time) setEndTime(data.working_end_time);
          if (data.break_start_time) setBreakStart(data.break_start_time);
          if (data.break_end_time) setBreakEnd(data.break_end_time);
          
          let parsedDays = null;
          if (Array.isArray(data.working_days)) {
            parsedDays = data.working_days;
          } else if (typeof data.working_days === "string" && data.working_days.trim()) {
            try {
              const j = JSON.parse(data.working_days);
              if (Array.isArray(j)) parsedDays = j;
            } catch (e) {
              parsedDays = data.working_days.split(",").map(d => d.trim().toUpperCase());
            }
          }
          if (parsedDays && Array.isArray(parsedDays) && parsedDays.length > 0) {
            const canonical = parsedDays.map(d => String(d).toUpperCase().trim());
            setSelectedDays(canonical);
            AsyncStorage.setItem("@mehndigo_artist_availability", JSON.stringify({
              is_available: data.is_available,
              working_days: canonical,
              working_start_time: data.working_start_time || startTime,
              working_end_time: data.working_end_time || endTime,
              break_start_time: data.break_start_time || breakStart,
              break_end_time: data.break_end_time || breakEnd
            })).catch(() => {});
          }
        }
      } catch (err) {
        if (__DEV__) console.log("Failed to load availability:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, []);

  const toggleDay = (dayKey) => {
    const canonicalKey = String(dayKey).toUpperCase().trim();
    if (selectedDays.includes(canonicalKey)) {
      setSelectedDays(selectedDays.filter((d) => d !== canonicalKey));
    } else {
      setSelectedDays([...selectedDays, canonicalKey]);
    }
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      Alert.alert("Error", "Please select at least one working day.");
      return;
    }
    setSaving(true);
    const schedulePayload = {
      is_available: isAvailable,
      working_days: selectedDays,
      working_start_time: startTime,
      working_end_time: endTime,
      break_start_time: breakStart,
      break_end_time: breakEnd
    };
    try {
      await AsyncStorage.setItem("@mehndigo_artist_availability", JSON.stringify(schedulePayload));
      await updateArtistAvailability(schedulePayload);
      Alert.alert("Saved 🎉", "Your availability and working schedule have been updated successfully.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

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
          Set your weekly working hours, break periods, and working days.
        </Text>

        {/* Master Availability Toggle */}
        <View style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <View>
              <Text style={styles.dayName}>Accepting New Bookings</Text>
              <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {isAvailable ? "You are currently visible and bookable" : "You are currently marked as unavailable"}
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: "#E0E0E0", true: "#FCCFDF" }}
              thumbColor={isAvailable ? PRIMARY : "#CCC"}
            />
          </View>
        </View>

        {/* Working Hours Card */}
        <View style={styles.dayCard}>
          <Text style={styles.dayName}>Working Hours</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Start Time (HH:mm)</Text>
              <TextInput
                placeholder="09:00"
                placeholderTextColor="#999"
                value={startTime}
                onChangeText={setStartTime}
                style={styles.timeInput}
              />
            </View>
            <Text style={styles.timeSeparator}>to</Text>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>End Time (HH:mm)</Text>
              <TextInput
                placeholder="20:00"
                placeholderTextColor="#999"
                value={endTime}
                onChangeText={setEndTime}
                style={styles.timeInput}
              />
            </View>
          </View>
        </View>

        {/* Break Hours Card */}
        <View style={styles.dayCard}>
          <Text style={styles.dayName}>Daily Break Time</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Break Start (HH:mm)</Text>
              <TextInput
                placeholder="14:00"
                placeholderTextColor="#999"
                value={breakStart}
                onChangeText={setBreakStart}
                style={styles.timeInput}
              />
            </View>
            <Text style={styles.timeSeparator}>to</Text>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Break End (HH:mm)</Text>
              <TextInput
                placeholder="15:00"
                placeholderTextColor="#999"
                value={breakEnd}
                onChangeText={setBreakEnd}
                style={styles.timeInput}
              />
            </View>
          </View>
        </View>

        {/* Working Days */}
        <Text style={[styles.subtitle, { marginTop: 10, fontWeight: "700", color: "#333" }]}>
          Working Days
        </Text>
        {DAYS.map((item) => {
          const isEnabled = selectedDays.includes(item.key);
          return (
            <View key={item.key} style={[styles.dayCard, !isEnabled && styles.dayCardDisabled]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayName, !isEnabled && styles.dayNameDisabled]}>
                    {item.label}
                  </Text>
                  {isEnabled && <View style={styles.activeDot} />}
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleDay(item.key)}
                  trackColor={{ false: "#E0E0E0", true: "#FCCFDF" }}
                  thumbColor={isEnabled ? PRIMARY : "#CCC"}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Availability</Text>
          )}
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
