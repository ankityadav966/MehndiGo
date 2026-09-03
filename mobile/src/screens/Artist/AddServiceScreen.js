/**
 * AddServiceScreen.js
 *
 * Artist → Services → Add New Service
 *
 * Features:
 *  - Multiple images (up to 5), stored as JSON array in service_image field
 *  - Dynamic categories from Admin API (GET /customer/categories)
 *  - Multi-select category chips (category names stored as array)
 *  - Price, Duration, Description fields
 *  - Service Type: Home Visit / Salon (maps to is_home_service / is_salon_service)
 *  - Duplicate-tap protection on Save button
 *  - Proper loading/saving/error states
 */

import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import { createArtistService, uploadPortfolioMedia } from "../../services/artist";
import { getCategories } from "../../services/category";

const MAX_IMAGES = 5;

const SERVICE_TYPES = [
  {
    key: "STANDARD",
    label: "Standard",
    icon: "star-outline",
    desc: "Standard service offering",
    service_tier: "STANDARD"
  },
  {
    key: "PREMIUM",
    label: "Premium",
    icon: "diamond-outline",
    desc: "Premium luxury offering",
    service_tier: "PREMIUM"
  }
];

export default function AddServiceScreen({ navigation }) {
  // Form state
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [serviceType, setServiceType] = useState("STANDARD");
  const [images, setImages] = useState([]); // array of local URIs

  // UI state
  const [categoriesList, setCategoriesList] = useState([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const isSaving = useRef(false); // guard against double-tap

  // ─── Load categories from Admin API ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const list = await getCategories();
        // Normalize: category API returns objects with {id, name, slug, status}
        const normalized = list
          .map((c) => (typeof c === "string" ? { name: c } : c))
          .filter((c) => c && c.name);
        setCategoriesList(normalized);
      } catch (e) {
        if (__DEV__) console.log("Failed to fetch categories:", e.message);
        // Silently fail — user can still type categories manually via name
      } finally {
        setFetchingCategories(false);
      }
    })();
  }, []);

  // ─── Toggle category chip ───────────────────────────────────────────────────
  const toggleCategory = useCallback((name) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }, []);

  // ─── Image picker ───────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can add up to ${MAX_IMAGES} images.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow gallery access in settings to upload service images."
      );
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      allowsMultipleSelection: true,
      selectionLimit: remaining
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Form validation ────────────────────────────────────────────────────────
  const validate = () => {
    if (!serviceName.trim()) {
      Alert.alert("Missing Field", "Please enter a service name.");
      return false;
    }
    if (selectedCategories.length === 0) {
      Alert.alert("Missing Field", "Please select at least one category.");
      return false;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price greater than ₹0.");
      return false;
    }
    if (!duration || isNaN(Number(duration)) || Number(duration) < 15 || Number(duration) > 720) {
      Alert.alert("Invalid Duration", "Duration must be between 15 and 720 minutes.");
      return false;
    }
    return true;
  };

  // ─── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isSaving.current) return; // Prevent double-tap
    if (!validate()) return;

    isSaving.current = true;
    setSaving(true);

    try {
      // 1. Upload all images
      let uploadedImageValue = null;
      if (images.length > 0) {
        const uploadResults = await uploadPortfolioMedia(images);
        const urls = uploadResults.map((r) => r.url).filter(Boolean);
        if (urls.length === 0) {
          throw new Error("Image upload failed. Please try again.");
        }
        // Store first image as cover; store all as JSON array string
        uploadedImageValue = urls.length === 1 ? urls[0] : JSON.stringify(urls);
      }

      // 2. Resolve service type flags
      const selectedType = SERVICE_TYPES.find((t) => t.key === serviceType) || SERVICE_TYPES[0];

      // 3. Create service
      await createArtistService({
        specialization_name: serviceName.trim(),
        category: JSON.stringify(selectedCategories), // array of category name strings
        description: description.trim(),
        minimum_price: Number(price),
        duration_minutes: Number(duration),
        service_image: uploadedImageValue,
        service_tier: selectedType.service_tier
      });

      Alert.alert("Service Added 🎉", "Your new service has been published.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not save service. Please try again.");
    } finally {
      setSaving(false);
      isSaving.current = false;
    }
  };

  // ─── Render image grid ──────────────────────────────────────────────────────
  const renderImages = () => (
    <View style={styles.imageGrid}>
      {images.map((uri, index) => (
        <View key={index} style={styles.imageTile}>
          <Image source={{ uri }} style={styles.imageTileImg} />
          {index === 0 && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>Cover</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => removeImage(index)}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}

      {images.length < MAX_IMAGES && (
        <TouchableOpacity style={styles.addImageTile} onPress={pickImages} activeOpacity={0.7}>
          <Ionicons name="camera-outline" size={26} color={Colors.textTertiary} />
          <Text style={styles.addImageText}>
            {images.length === 0 ? "Add Photos" : `+${MAX_IMAGES - images.length} more`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Render service type selector ───────────────────────────────────────────
  const renderServiceType = () => (
    <View style={styles.serviceTypeRow}>
      {SERVICE_TYPES.map((type) => {
        const active = serviceType === type.key;
        return (
          <TouchableOpacity
            key={type.key}
            style={[styles.serviceTypeCard, active && styles.serviceTypeCardActive]}
            onPress={() => setServiceType(type.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={type.icon}
              size={20}
              color={active ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.serviceTypeLabel, active && styles.serviceTypeLabelActive]}>
              {type.label}
            </Text>
            <Text style={styles.serviceTypeDesc}>{type.desc}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Service</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Service Photos</Text>
            <Text style={styles.sectionSubtitle}>
              Add up to {MAX_IMAGES} photos · First photo is used as cover
            </Text>
            {renderImages()}
          </View>

          <View style={styles.divider} />

          {/* Service Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bridal Premium Mehndi"
              placeholderTextColor={Colors.textTertiary}
              value={serviceName}
              onChangeText={setServiceName}
              maxLength={150}
              returnKeyType="next"
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your service style, what's included, experience..."
              placeholderTextColor={Colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          <View style={styles.divider} />

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.label}>Categories * (select all that apply)</Text>
            {fetchingCategories ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading categories…</Text>
              </View>
            ) : categoriesList.length === 0 ? (
              <Text style={styles.emptyNote}>No categories available from admin.</Text>
            ) : (
              <View style={styles.chipWrap}>
                {categoriesList.map((cat) => {
                  const active = selectedCategories.includes(cat.name);
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleCategory(cat.name)}
                      activeOpacity={0.8}
                    >
                      {active && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color={Colors.white}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {selectedCategories.length > 0 && (
              <Text style={styles.selectedNote}>
                ✓ {selectedCategories.length} selected:{" "}
                {selectedCategories.slice(0, 3).join(", ")}
                {selectedCategories.length > 3 ? ` +${selectedCategories.length - 3} more` : ""}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Price & Duration */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Starting Price (₹) *</Text>
                <View style={styles.priceInput}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.priceTextInput}
                    placeholder="2500"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={(v) => setPrice(v.replace(/[^0-9]/g, ""))}
                    maxLength={7}
                  />
                </View>
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Duration (minutes) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="120"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Service Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Service Type *</Text>
            <Text style={styles.sectionSubtitle}>
              Choose where you provide this service
            </Text>
            {renderServiceType()}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.saveButtonText}>Saving Service…</Text>
              </View>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.saveButtonText}>Save Service</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scrollContent: { paddingBottom: 30 },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  divider: { height: 1, backgroundColor: Colors.border, marginTop: 16 },

  sectionHeader: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 11, color: Colors.textSecondary, marginBottom: 10 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3
  },

  // ── Images ────────────────────────────────────────────────────────────────
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  imageTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative"
  },
  imageTileImg: { width: "100%", height: "100%", resizeMode: "cover" },
  coverBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(233,30,99,0.78)",
    paddingVertical: 2,
    alignItems: "center"
  },
  coverBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: Colors.white,
    borderRadius: 10
  },
  addImageTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },
  addImageText: { fontSize: 10, color: Colors.textTertiary, fontWeight: "600" },

  // ── Inputs ────────────────────────────────────────────────────────────────
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.white
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: Colors.white
  },
  charCount: { fontSize: 10, color: Colors.textTertiary, textAlign: "right", marginTop: 4 },

  priceInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingLeft: 12
  },
  currencySymbol: { fontSize: 16, fontWeight: "700", color: Colors.primary, marginRight: 4 },
  priceTextInput: { flex: 1, fontSize: 14, color: Colors.text },

  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },

  // ── Categories ────────────────────────────────────────────────────────────
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  loadingText: { fontSize: 12, color: Colors.textSecondary },
  emptyNote: { fontSize: 12, color: Colors.textTertiary, fontStyle: "italic" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: Colors.white },
  selectedNote: {
    marginTop: 10,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600"
  },

  // ── Service Type ──────────────────────────────────────────────────────────
  serviceTypeRow: { flexDirection: "row", gap: 10 },
  serviceTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: "center",
    gap: 4
  },
  serviceTypeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF0F5"
  },
  serviceTypeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    textAlign: "center"
  },
  serviceTypeLabelActive: { color: Colors.primary },
  serviceTypeDesc: {
    fontSize: 9,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 13
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  saveButton: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 }
});
