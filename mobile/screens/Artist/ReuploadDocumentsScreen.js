import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";

const DOCUMENTS = [
  { key: "aadhaarFront", label: "Aadhaar Front", icon: "card-outline" },
  { key: "aadhaarBack", label: "Aadhaar Back", icon: "card-outline" },
  { key: "panCard", label: "PAN Card", icon: "document-text-outline" },
  { key: "profilePhoto", label: "Profile Photo", icon: "person-outline" },
];

export default function ReuploadDocumentsScreen({ navigation }) {
  const [uploaded, setUploaded] = useState({});

  const pickDocument = async (docKey) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploaded((prev) => ({ ...prev, [docKey]: result.assets[0].uri }));
    }
  };

  const handleSubmit = () => {
    const allUploaded = DOCUMENTS.every((doc) => uploaded[doc.key]);
    if (!allUploaded) {
      Alert.alert("Incomplete", "Please upload all required documents.");
      return;
    }
    Alert.alert("Submitted", "Your documents have been submitted for re-verification.");
    navigation.navigate("ApprovalPending");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reupload Documents</Text>
          <View style={styles.empty} />
        </View>

        <Text style={styles.subtitle}>
          Please upload clear and valid documents for re-verification.
        </Text>

        {DOCUMENTS.map((doc) => (
          <TouchableOpacity
            key={doc.key}
            style={styles.uploadCard}
            onPress={() => pickDocument(doc.key)}
          >
            {uploaded[doc.key] ? (
              <Image source={{ uri: uploaded[doc.key] }} style={styles.uploadPreview} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name={doc.icon} size={32} color={PRIMARY} />
                <Text style={styles.uploadLabel}>{doc.label}</Text>
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </View>
            )}
            {uploaded[doc.key] && (
              <View style={styles.uploadedOverlay}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={styles.uploadedText}>{doc.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  uploadCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 14,
    height: 140,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadLabel: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  uploadHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  uploadedOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF8FA",
  },
  submitButton: {
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
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
