import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { submitSupportTicket } from "../../services/customer";
import { getCategoryListForRole, TICKET_PRIORITIES } from "../../constants/SupportCategories";
import * as ImagePicker from "expo-image-picker";
import { uploadPortfolioMedia } from "../../services/artist";
import { useAuth } from "../../context/AuthContext";

export default function SupportTicketScreen({ navigation }) {
  const { user } = useAuth();
  const isArtistUser = user?.role === "artist" || user?.role === "ARTIST";
  const categoryList = getCategoryListForRole(user?.role);

  const [category, setCategory] = useState(categoryList[0]?.label || "Booking Issue");
  const [priority, setPriority] = useState("MEDIUM");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUri, setAttachmentUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access to attach images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAttachmentUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !description.trim()) {
      Alert.alert("Required Fields", "Please enter both subject and description.");
      return;
    }
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
        priority,
        subject: subject.trim(),
        description: description.trim(),
        user_type: isArtistUser ? "ARTIST" : "CUSTOMER",
        attachments: remoteAttachmentUrl
      });
      const tid = response.id || response.ticket_id || Date.now();
      Alert.alert(
        "Ticket Submitted",
        `Your ticket #${tid} has been raised successfully. Our support team will get back to you shortly.`,
        [
          {
            text: "View Discussion",
            onPress: () => {
              navigation.replace("SupportTicketDetails", {
                ticketId: tid,
                ticket: {
                  id: tid,
                  subject: subject.trim(),
                  description: description.trim(),
                  category,
                  priority,
                  status: "OPEN",
                  created_at: new Date().toISOString()
                }
              });
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert("Submission Failed", err.message || "Failed to raise support ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#1D1D1D" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Raise a Support Ticket</Text>
          </View>

          <View style={styles.content}>
            {/* Issue Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Category</Text>
              <View style={styles.categoryRow}>
                {categoryList.map((cat) => {
                  const isActive = category === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.id || cat.label}
                      style={[
                        styles.categoryChip,
                        isActive && styles.categoryChipActive,
                      ]}
                      onPress={() => setCategory(cat.label)}
                    >
                      <Ionicons
                        name={cat.icon || "help-circle-outline"}
                        size={15}
                        color={isActive ? "#FFF" : (cat.color || "#888")}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          isActive && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Priority Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {TICKET_PRIORITIES.map((p) => {
                  const isPActive = priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.priorityChip,
                        isPActive && { backgroundColor: p.color, borderColor: p.color }
                      ]}
                      onPress={() => setPriority(p.value)}
                    >
                      <Text style={[styles.priorityChipText, isPActive && { color: "#FFF", fontWeight: "700" }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief summary of your issue..."
                placeholderTextColor="#999"
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            {/* Description Multiline */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Detailed Description *</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Explain what happened so our team can resolve it quickly..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Attachment Button */}
            <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
              <Ionicons name="camera-outline" size={20} color={Colors.primary || "#F7146B"} />
              <Text style={styles.attachBtnText}>
                {attachmentUri ? "Change Attached Screenshot" : "Attach Screenshot / Photo (Optional)"}
              </Text>
            </TouchableOpacity>

            {attachmentUri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: attachmentUri }} style={styles.previewImage} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#333" }} numberOfLines={1}>
                    Screenshot Attached
                  </Text>
                  <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Ready to upload</Text>
                </View>
                <TouchableOpacity onPress={() => setAttachmentUri(null)} style={{ padding: 6 }}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!category || !subject.trim() || !description.trim() || submitting) &&
                  styles.submitBtnDisabled,
              ]}
              disabled={!category || !subject.trim() || !description.trim() || submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFF" />
                  <Text style={styles.submitBtnText}>Submit Support Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    color: "#1D1D1D",
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
    marginBottom: 16,
    backgroundColor: "#FFF8FA",
  },
  attachBtnText: {
    color: "#F7146B",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },
  priorityChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E6ED",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  priorityChipText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
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