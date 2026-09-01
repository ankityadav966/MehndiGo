import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";

const REASONS = [
  "Change of Plans",
  "Found another artist",
  "Not required anymore",
  "Other",
];

export default function BookingCancellationScreen({ navigation }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherReason, setOtherReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleCancel = () => {
    if (!selectedReason) {
      Alert.alert("Select Reason", "Please select a reason for cancellation");
      return;
    }
    if (!confirmed) {
      Alert.alert("Confirmation", "Please confirm the refund terms");
      return;
    }
    navigation.navigate("MyBookings");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cancel Booking</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.bookingIdLabel}>Booking ID</Text>
            <Text style={styles.bookingId}>#MG202600123</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reason for Cancellation</Text>

            {REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.radioRow}
                onPress={() => setSelectedReason(reason)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selectedReason === reason && styles.radioOuterSelected,
                  ]}
                >
                  {selectedReason === reason && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{reason}</Text>
              </TouchableOpacity>
            ))}

            {selectedReason === "Other" && (
              <TextInput
                value={otherReason}
                onChangeText={setOtherReason}
                placeholder="Please specify your reason"
                placeholderTextColor="#9E9E9E"
                style={styles.textInput}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConfirmed(!confirmed)}
          >
            <View
              style={[styles.checkbox, confirmed && styles.checkboxChecked]}
            >
              {confirmed && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I understand that refund will be processed within 5-7 business days
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  bookingIdLabel: {
    fontSize: 12,
    color: "#7A7A7A",
  },
  bookingId: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F7146B",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1D",
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#F7146B",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F7146B",
  },
  radioLabel: {
    fontSize: 15,
    color: "#1D1D1D",
    marginLeft: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E2E6ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#1D1D1D",
    backgroundColor: "#F2F4F7",
    marginTop: 8,
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D9D9D9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#F7146B",
    borderColor: "#F7146B",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: "#7A7A7A",
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: "#E53030",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
