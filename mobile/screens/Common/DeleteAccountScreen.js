import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeleteAccountScreen({ navigation }) {
  const [confirmText, setConfirmText] = useState("");
  const [understood, setUnderstood] = useState(false);

  const isValid = confirmText === "DELETE" && understood;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="warning-outline" size={40} color="#E53030" />
        </View>

        <Text style={styles.title}>Delete Account</Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Deleting your account is permanent. All your data including booking
            history, personal information, and preferences will be erased. This
            action cannot be undone.
          </Text>
        </View>

        <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          placeholder='Type "DELETE" to confirm'
          placeholderTextColor="#9E9E9E"
          style={styles.textInput}
          autoCapitalize="characters"
        />

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setUnderstood(!understood)}
        >
          <View
            style={[styles.checkbox, understood && styles.checkboxChecked]}
          >
            {understood && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            I understand this action is irreversible
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, !isValid && styles.deleteButtonDisabled]}
          disabled={!isValid}
          onPress={() => {}}
        >
          <Text style={styles.deleteButtonText}>Delete My Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.keepButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.keepButtonText}>Keep My Account</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D1D1D",
  },
  scrollContainer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1D1D1D",
    marginBottom: 16,
  },
  warningCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#FFE0E0",
    marginBottom: 24,
    width: "100%",
  },
  warningText: {
    fontSize: 14,
    color: "#7A7A7A",
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1D",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E2E6ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#1D1D1D",
    backgroundColor: "#F2F4F7",
    fontSize: 15,
    width: "100%",
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 32,
    alignSelf: "flex-start",
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
  deleteButton: {
    backgroundColor: "#E53030",
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  keepButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  keepButtonText: {
    color: "#F7146B",
    fontSize: 15,
    fontWeight: "600",
  },
});
