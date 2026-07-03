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

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const requirements = [
    { label: "At least 8 characters", met: newPassword.length >= 8 },
    {
      label: "Contains a uppercase letter",
      met: /[A-Z]/.test(newPassword),
    },
    {
      label: "Contains a lowercase letter",
      met: /[a-z]/.test(newPassword),
    },
    { label: "Contains a number", met: /\d/.test(newPassword) },
    {
      label: "Contains a special character",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    },
  ];

  const isValid =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    requirements.every((r) => r.met);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#9E9E9E"
              secureTextEntry={!showCurrent}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons
                name={showCurrent ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9E9E9E"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#9E9E9E"
              secureTextEntry={!showNew}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9E9E9E"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#9E9E9E"
              secureTextEntry={!showConfirm}
              style={styles.input}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9E9E9E"
              />
            </TouchableOpacity>
          </View>

          {newPassword.length > 0 && (
            <View style={styles.requirements}>
              {requirements.map((req, index) => (
                <View key={index} style={styles.requirementRow}>
                  <Ionicons
                    name={req.met ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={req.met ? "#22C55E" : "#D9D9D9"}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      req.met && styles.requirementMet,
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          disabled={!isValid}
          onPress={() => {}}
        >
          <Text style={styles.buttonText}>Change Password</Text>
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
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    marginBottom: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1D",
    marginBottom: 8,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: "#E2E6ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1D1D1D",
  },
  requirements: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 13,
    color: "#7A7A7A",
    marginLeft: 10,
  },
  requirementMet: {
    color: "#22C55E",
  },
  button: {
    backgroundColor: "#F7146B",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
