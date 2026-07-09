import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { submitSupportTicket } from "../../services/customer";

const CATEGORIES = [
  "Booking Issue",
  "Payment Issue",
  "Artist Issue",
  "Other",
];

import * as ImagePicker from "expo-image-picker";
import { uploadPortfolioMedia } from "../../services/artist";

export default function SupportTicketScreen({ navigation }) {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachmentUri, setAttachmentUri] = useState(null);

  const pickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access to attach images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAttachmentUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!category || !subject || !description) return;
    setSubmitting(true);
    try {
      let remoteAttachmentUrl = null;
      if (attachmentUri) {
        const uploadResult = await uploadPortfolioMedia([{ uri: attachmentUri }]);
        if (uploadResult && uploadResult.length > 0) {
          remoteAttachmentUrl = uploadResult[0].url;
        }
      }

      const response = await submitSupportTicket({
        category,
        subject,
        description,
        attachments: remoteAttachmentUrl
      });
      Alert.alert(
        "Ticket Submitted",
        `Your ticket #${response.id} has been raised successfully. Our support team will get back to you shortly.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Submission Failed", err.message || "Failed to raise support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Raise a Ticket</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Issue Category</Text>

            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject</Text>

            <TextInput
              style={styles.input}
              placeholder="Brief subject of your issue"
              placeholderTextColor="#CCC"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>

            <TextInput
              style={styles.textarea}
              placeholder="Describe your issue in detail..."
              placeholderTextColor="#CCC"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
            <Ionicons name="image-outline" size={20} color="#F7146B" />
            <Text style={styles.attachBtnText}>
              {attachmentUri ? "Change Attached Image" : "Attach Image (Optional)"}
            </Text>
          </TouchableOpacity>

          {attachmentUri && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, backgroundColor: "#F2F4F7", padding: 10, borderRadius: 12 }}>
              <Ionicons name="document-attach-outline" size={20} color={Colors.primary || "#F7146B"} />
              <Text style={{ flex: 1, marginLeft: 8, fontSize: 13, color: "#555" }} numberOfLines={1}>
                {attachmentUri.split("/").pop()}
              </Text>
              <TouchableOpacity onPress={() => setAttachmentUri(null)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!category || !subject || !description || submitting) &&
                styles.submitBtnDisabled,
            ]}
            disabled={!category || !subject || !description || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    fontWeight: "500",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E6ED",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryChipActive: {
    backgroundColor: "#F7146B",
    borderColor: "#F7146B",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#FFF",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E6ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#F2F4F7",
  },
  textarea: {
    height: 140,
    borderWidth: 1,
    borderColor: "#E2E6ED",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 15,
    color: "#111",
    backgroundColor: "#F2F4F7",
  },
  attachBtn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F7146B",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "#FFF8FA",
  },
  attachBtnText: {
    color: "#F7146B",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F7146B",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 40,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
});