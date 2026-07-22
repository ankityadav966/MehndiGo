import { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import moment from "moment";
import { fetchArtistAvailability } from "../../services/customer";
import { checkRestrictedBooking } from "../../services/booking";

export default function SelectDateScreen({ route, navigation }) {
  const { artistId, serviceId, selectedDate: initialDate, selectedTimeSlot } = route.params || {};

  const [selectedDates, setSelectedDates] = useState(
    initialDate ? [initialDate] : [new Date().toISOString().split("T")[0]]
  );
  const [availabilityDates, setAvailabilityDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId || !serviceId) {
      Alert.alert("Error", "Missing booking context details.");
      navigation.goBack();
      return;
    }

    const checkRestrictions = async () => {
      try {
        const check = await checkRestrictedBooking();
        if (check?.hasRestricted) {
          Alert.alert(
            "Pending Booking Payment",
            "You have a previous booking that still requires payment completion or artist confirmation.\n\nPlease complete that booking before creating a new one.",
            [
              {
                text: "Complete Payment",
                onPress: () => {
                  navigation.navigate("BookingSettlement", { bookingId: check.bookingId });
                }
              },
              {
                text: "View Booking",
                onPress: () => {
                  navigation.navigate("BookingDetails", { bookingId: check.bookingId });
                }
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  navigation.goBack();
                }
              }
            ],
            { cancelable: false }
          );
          return false;
        }
        return true;
      } catch (err) {
        console.log("Failed to check booking restrictions:", err.message);
        return true;
      }
    };

    const loadArtistAvailability = async () => {
      const isAllowed = await checkRestrictions();
      if (!isAllowed) return;

      try {
        const slots = await fetchArtistAvailability(artistId);
        const dates = (slots || [])
          .filter(slot => !slot.is_booked)
          .map(slot => moment(slot.start_time).format("YYYY-MM-DD"));
        // Keep unique dates
        setAvailabilityDates([...new Set(dates)]);
      } catch (err) {
        console.log("Failed to load availability for calendar:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadArtistAvailability();
  }, [artistId, serviceId]);

  const handleContinue = () => {
    navigation.navigate("SelectTimeSlot", {
      artistId,
      serviceId,
      selectedDates,
      selectedTimeSlot
    });
  };

  const getMarkedDates = () => {
    const marked = {};
    
    // Mark all dates where the artist has available slots
    availabilityDates.forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: Colors.primary,
        activeOpacity: 0
      };
    });

    // Mark the selected dates
    selectedDates.forEach(date => {
      marked[date] = {
        ...marked[date],
        selected: true,
        selectedColor: Colors.primary,
        selectedTextColor: Colors.white
      };
    });

    return marked;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Date</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.calendarCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <Calendar
              current={selectedDates[0]}
              onDayPress={(day) => {
                const dateStr = day.dateString;
                if (selectedDates.includes(dateStr)) {
                  if (selectedDates.length > 1) {
                    setSelectedDates(prev => prev.filter(d => d !== dateStr));
                  }
                } else {
                  setSelectedDates(prev => [...prev, dateStr]);
                }
              }}
              hideExtraDays
              enableSwipeMonths
              minDate={new Date().toISOString().split("T")[0]}
              renderArrow={(direction) => (
                <Ionicons name={direction === "left" ? "chevron-back" : "chevron-forward"} size={20} color={Colors.text} />
              )}
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: Colors.white,
                calendarBackground: Colors.white,
                textSectionTitleColor: Colors.textTertiary,
                monthTextColor: Colors.text,
                textMonthFontSize: 16,
                textMonthFontWeight: "700",
                dayTextColor: Colors.text,
                textDayFontSize: 14,
                selectedDayBackgroundColor: Colors.primary,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.primary,
                arrowColor: Colors.text,
              }}
            />
            <View style={styles.legendContainer}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Dates with pink dots indicate when artist is available.</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <CustomButton title="Continue" onPress={handleContinue} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  calendarCard: { flex: 1, paddingHorizontal: 16, marginTop: 10 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  legendContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 20 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 8 },
  legendText: { fontSize: 12, color: Colors.textSecondary },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
});
