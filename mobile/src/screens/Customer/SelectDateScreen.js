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
  const { artistId, serviceId, selectedDate: initialDate, selectedTimeSlot, selectedArt } = route.params || {};

  // Single Date Selection Rule: Exactly 1 selected date string (YYYY-MM-DD)
  const todayStr = moment().format("YYYY-MM-DD");
  const [selectedDate, setSelectedDate] = useState(
    initialDate && moment(initialDate, "YYYY-MM-DD", true).isValid() ? initialDate : todayStr
  );
  const [availabilityDates, setAvailabilityDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId || !serviceId) {
      Alert.alert("Error", "Missing booking context details.");
      navigation.goBack();
      return;
    }

    const loadData = async () => {
      try {
        const [check, slots] = await Promise.all([
          checkRestrictedBooking().catch((err) => {
            console.log("Failed to check booking restrictions:", err.message);
            return { hasRestricted: false };
          }),
          fetchArtistAvailability(artistId).catch((err) => {
            console.log("Failed to load availability for calendar:", err.message);
            return [];
          })
        ]);

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
          return;
        }

        const dates = (slots || [])
          .filter(slot => !slot.is_booked)
          .map(slot => moment(slot.start_time).format("YYYY-MM-DD"));
        setAvailabilityDates([...new Set(dates)]);
      } catch (err) {
        console.log("Error loading date selection:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [artistId, serviceId]);

  const [isNavigating, setIsNavigating] = useState(false);

  const handleContinue = () => {
    if (!selectedDate) {
      Alert.alert("Required", "Please select a booking date to proceed.");
      return;
    }
    if (isNavigating) return;
    setIsNavigating(true);

    // Pass strictly 1 selected date to SelectTimeSlotScreen
    navigation.navigate("SelectTimeSlot", {
      artistId,
      serviceId,
      selectedDate,
      selectedTimeSlot,
      selectedArt
    });
    
    // reset lock after a short delay
    setTimeout(() => setIsNavigating(false), 500);
  };


  const getMarkedDates = () => {
    const marked = {};
    
    // Mark dates where artist is available
    availabilityDates.forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: Colors.primary
      };
    });

    // Highlight the single selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: Colors.primary,
        selectedTextColor: Colors.white
      };
    }

    return marked;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select 1 Booking Date</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.calendarCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.selectedDateBadge}>
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.selectedDateBadgeText}>
                Selected Date: {moment(selectedDate).format("dddd, DD MMMM YYYY")}
              </Text>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                const dateStr = day.dateString;
                // Single Date Rule: Selecting a date automatically replaces previous date!
                setSelectedDate(dateStr);
              }}
              hideExtraDays
              enableSwipeMonths
              minDate={todayStr}
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
              <Text style={styles.legendText}>Dates with dots indicate artist availability. Tap any date to select 1 date.</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <CustomButton
          title={`Continue with ${moment(selectedDate).format("DD MMM YYYY")}`}
          onPress={handleContinue}
          disabled={!selectedDate || loading}
        />
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
  selectedDateBadge: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary + "10", padding: 12, borderRadius: 12, marginBottom: 14 },
  selectedDateBadgeText: { fontSize: 13, fontWeight: "700", color: Colors.primary, marginLeft: 8 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  legendContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 20 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 8 },
  legendText: { fontSize: 11, color: Colors.textSecondary, flex: 1 },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
});
