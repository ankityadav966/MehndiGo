import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { useAuth } from "../../context/AuthContext";
import { useArtistOnboarding } from "../../context/ArtistOnboardingContext";
import apiRequest from "../../services/api";

export default function RoleSelectionScreen({ navigation }) {
  const [selectedRole, setSelectedRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const { setUserRole } = useAuth();
  const { artistProfileCompleted, artistApproved } = useArtistOnboarding();

  const handleContinue = async () => {
    if (loading) return;
    setLoading(true);

    const mappedRole = selectedRole === "customer" ? "USER" : "ARTIST";

    try {
      // Save selected role to backend profile
      await apiRequest("PUT", "/api/v1/mehndigo/user/profile", { role: mappedRole }, true);
    } catch (e) {
      console.log("[ROLE SELECTION] Profile update note:", e.message);
    }

    try {
      await setUserRole(mappedRole);
    } catch (e) {}

    setLoading(false);

    if (mappedRole === "USER") {
      navigation.reset({
        index: 0,
        routes: [{ name: "CustomerStack" }],
      });
      return;
    }

    if (!artistProfileCompleted) {
      navigation.reset({
        index: 0,
        routes: [{ name: "ArtistFlowStack" }],
      });
      return;
    }

    if (!artistApproved) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "ArtistFlowStack",
            params: { initialScreen: "ApprovalPending" },
          },
        ],
      });
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: "ArtistStack" }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose Your Role</Text>
      <Text style={styles.subtitle}>Select an option to continue</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.roleCard,
          selectedRole === "customer" && styles.selectedCard,
        ]}
        onPress={() => setSelectedRole("customer")}
      >
        <View>
          <Text style={styles.roleTitle}>I am a Customer</Text>
          <Text style={styles.roleSubtitle}>Book Mehndi Services</Text>
        </View>

        <View
          style={[
            styles.radioCircle,
            selectedRole === "customer" && styles.activeCircle,
          ]}
        >
          {selectedRole === "customer" && <Text style={styles.check}>✓</Text>}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.roleCard,
          selectedRole === "artist" && styles.selectedCard,
        ]}
        onPress={() => setSelectedRole("artist")}
      >
        <View>
          <Text style={styles.roleTitle}>I am an Artist</Text>
          <Text style={styles.roleSubtitle}>Offer Mehndi Services</Text>
        </View>

        <View
          style={[
            styles.radioCircle,
            selectedRole === "artist" && styles.activeCircle,
          ]}
        >
          {selectedRole === "artist" && <Text style={styles.check}>✓</Text>}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.disabledButton]}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.continueText}>Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  roleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    backgroundColor: Colors.inputBackground,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + "20",
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  roleSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  activeCircle: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  check: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  continueButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  continueText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
