import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect, useCallback } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import Alert from "../../utils/Alert";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import { getArtistServiceById, updateArtistService, uploadPortfolioMedia } from "../../services/artist";
import { getCategories } from "../../services/category";

export default function EditServiceScreen({ route, navigation }) {
  const { id } = route.params || {};

  const [serviceName, setServiceName] = useState("");
  // category is stored as array of name strings
  const [category, setCategory] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // array of local URIs or server URIs

  // Packages list array state
  const [packages, setPackages] = useState([]);
  const [newPkg, setNewPkg] = useState({
    package_name: "",
    package_price: "",
    included_designs: "",
    duration: "60",
    number_of_hands: "2",
    number_of_feet: "0"
  });

  // Addons list array state
  const [addons, setAddons] = useState([]);
  const [newAddon, setNewAddon] = useState({
    addon_name: "",
    addon_price: "",
    description: ""
  });

  const fetchServiceDetail = useCallback(async () => {
    try {
      const data = await getArtistServiceById(id);
      setServiceName(data.specialization_name || data.title || "");

      // Parse category: may be array, JSON string, or plain string
      let parsedCat = data.category || [];
      if (typeof parsedCat === "string") {
        try { parsedCat = JSON.parse(parsedCat); } catch { parsedCat = [parsedCat]; }
      }
      setCategory(Array.isArray(parsedCat) ? parsedCat : (parsedCat ? [parsedCat] : []));

      setPrice(String(data.minimum_price || data.price || "0"));
      setDuration(String(data.duration_minutes || data.duration || "60"));
      setDescription(data.description || "");

      let parsedPackages = data.packages || [];
      if (typeof parsedPackages === 'string') {
        try { parsedPackages = JSON.parse(parsedPackages); } catch (e) { parsedPackages = []; }
      }
      setPackages(Array.isArray(parsedPackages) ? parsedPackages : []);

      let parsedAddons = data.addons || [];
      if (typeof parsedAddons === 'string') {
        try { parsedAddons = JSON.parse(parsedAddons); } catch (e) { parsedAddons = []; }
      }
      setAddons(Array.isArray(parsedAddons) ? parsedAddons : []);
      
      let parsedImages = data.service_image || [];
      if (typeof parsedImages === "string") {
        try { parsedImages = JSON.parse(parsedImages); } catch { parsedImages = [parsedImages]; }
      }
      setImages(Array.isArray(parsedImages) ? parsedImages : (parsedImages ? [parsedImages] : []));
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve service details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  // Fetch Admin categories from API
  useEffect(() => {
    (async () => {
      try {
        const list = await getCategories();
        const normalized = list
          .map((c) => (typeof c === "string" ? { name: c } : c))
          .filter((c) => c && c.name);
        setCategoriesList(normalized);
      } catch (e) {
        if (__DEV__) console.log("Failed to fetch categories:", e.message);
      } finally {
        setFetchingCategories(false);
      }
    })();
  }, []);

  const toggleCategory = useCallback((name) => {
    setCategory((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }, []);

  useEffect(() => {
    if (!id) {
      Alert.alert("Error", "Missing service parameter ID.");
      navigation.goBack();
      return;
    }
    const timer = setTimeout(() => {
      fetchServiceDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [id, fetchServiceDetail, navigation]);

  const MAX_IMAGES = 5;

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `You can add up to ${MAX_IMAGES} images.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access in settings to upload service images.");
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPackage = () => {
    if (!newPkg.package_name || !newPkg.package_price) {
      Alert.alert("Error", "Package name and price are required.");
      return;
    }
    setPackages([...packages, { ...newPkg }]);
    setNewPkg({
      package_name: "",
      package_price: "",
      included_designs: "",
      duration: "60",
      number_of_hands: "2",
      number_of_feet: "0"
    });
  };

  const handleAddAddon = () => {
    if (!newAddon.addon_name || !newAddon.addon_price) {
      Alert.alert("Error", "Addon name and price are required.");
      return;
    }
    setAddons([...addons, { ...newAddon }]);
    setNewAddon({
      addon_name: "",
      addon_price: "",
      description: ""
    });
  };

  const handleRemovePackage = (index) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const handleRemoveAddon = (index) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const sName = serviceName || "";
    if (!sName.trim() || !price || !duration) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }
    if (category.length === 0) {
      Alert.alert("Validation Error", "Please select at least one category.");
      return;
    }
    setSaving(true);
    try {
      const isLocal = (val) => {
        if (!val) return false;
        return (
          val.startsWith("file://") ||
          val.startsWith("content://") ||
          val.startsWith("ph://") ||
          val.startsWith("assets-library://")
        );
      };

      const localImages = images.filter(isLocal);
      const remoteImages = images.filter((img) => !isLocal(img));
      
      let finalImages = [...remoteImages];

      if (localImages.length > 0) {
        const uploadRes = await uploadPortfolioMedia(localImages);
        if (uploadRes && uploadRes.length > 0) {
          const uploadedUrls = uploadRes.map((res) => res.url);
          finalImages = [...finalImages, ...uploadedUrls];
        }
      }

      const uploadedImageValue = finalImages.length > 0 ? JSON.stringify(finalImages) : "[]";

      const servicePayload = {
        specialization_name: (serviceName || "").trim(),
        category: JSON.stringify(Array.isArray(category) ? category : [category]),
        minimum_price: Number(price),
        duration_minutes: Number(duration),
        description: (description || "").trim(),
        service_image: uploadedImageValue,
        packages: packages,
        addons
      };
      await updateArtistService(id, servicePayload);
      Alert.alert("Success 🎉", "Service details updated successfully.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Save Error", err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modify Service</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          {/* Image Picker */}
          <Text style={styles.label}>Service Images (Up to 5)</Text>
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

          <Text style={styles.label}>Service Name *</Text>
          <TextInput
            placeholder="e.g. Bridal Premium Mehndi"
            placeholderTextColor={Colors.textTertiary}
            value={serviceName}
            onChangeText={setServiceName}
            style={styles.input}
          />

          <Text style={styles.label}>Categories * (select all that apply)</Text>
          {fetchingCategories ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: "flex-start", marginBottom: 8 }} />
          ) : (
            <View style={styles.chipGroup}>
              {categoriesList.map((cat) => {
                const active = category.includes(cat.name);
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleCategory(cat.name)}
                  >
                    {active && <Ionicons name="checkmark" size={11} color={Colors.white} style={{ marginRight: 3 }} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {category.length > 0 && (
            <Text style={{ fontSize: 11, color: Colors.primary, marginTop: 6, fontWeight: "600" }}>
              ✓ {category.length} selected
            </Text>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Min Price (₹) *</Text>
              <TextInput
                placeholder="2500"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                style={styles.input}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Duration (mins) *</Text>
              <TextInput
                placeholder="120"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Explain mehndi style details..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            style={styles.textArea}
          />

          <View style={styles.divider} />

          {/* Sub-form: Add Packages */}
          <Text style={styles.sectionTitle}>Service Packages Offered</Text>
          <View style={styles.subForm}>
            <TextInput
              placeholder="Package Name (e.g. Luxury Bridal)"
              placeholderTextColor={Colors.textTertiary}
              value={newPkg.package_name}
              onChangeText={(val) => setNewPkg({ ...newPkg, package_name: val })}
              style={styles.subInput}
            />
            <TextInput
              placeholder="Price (₹)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={newPkg.package_price}
              onChangeText={(val) => setNewPkg({ ...newPkg, package_price: val })}
              style={styles.subInput}
            />
            <TextInput
              placeholder="Included designs description"
              placeholderTextColor={Colors.textTertiary}
              value={newPkg.included_designs}
              onChangeText={(val) => setNewPkg({ ...newPkg, included_designs: val })}
              style={styles.subInput}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddPackage}>
              <Text style={styles.addBtnText}>+ Add Package Option</Text>
            </TouchableOpacity>
          </View>
          {packages.map((p, idx) => (
            <View key={idx} style={styles.previewChip}>
              <Text style={styles.previewText}>
                📦 {p.package_name} - ₹{p.package_price}
              </Text>
              <TouchableOpacity onPress={() => handleRemovePackage(idx)}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Sub-form: Add Addons */}
          <Text style={styles.sectionTitle}>Add-on extras</Text>
          <View style={styles.subForm}>
            <TextInput
              placeholder="Addon Name (e.g. Glitter Work)"
              placeholderTextColor={Colors.textTertiary}
              value={newAddon.addon_name}
              onChangeText={(val) => setNewAddon({ ...newAddon, addon_name: val })}
              style={styles.subInput}
            />
            <TextInput
              placeholder="Price (₹)"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={newAddon.addon_price}
              onChangeText={(val) => setNewAddon({ ...newAddon, addon_price: val })}
              style={styles.subInput}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddAddon}>
              <Text style={styles.addBtnText}>+ Add Extra Addon</Text>
            </TouchableOpacity>
          </View>
          {addons.map((a, idx) => (
            <View key={idx} style={styles.previewChip}>
              <Text style={styles.previewText}>
                🎁 {a.addon_name} - +₹{a.addon_price}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveAddon(idx)}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {saving ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <CustomButton title="Save Changes Details" onPress={handleSave} />
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  form: { paddingHorizontal: 16, paddingTop: 10 },
  label: { fontSize: 12, fontWeight: "700", color: Colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { height: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 13, color: Colors.text, backgroundColor: Colors.white },
  dropdown: { height: 46, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.white },
  dropdownText: { fontSize: 13, color: Colors.text },
  dropdownList: { marginTop: 4, backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemActive: { backgroundColor: "#FFF0F4" },
  dropdownItemText: { fontSize: 12, color: Colors.text },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  textArea: { height: 70, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingTop: 10, fontSize: 13, color: Colors.text, backgroundColor: Colors.white, textAlignVertical: "top" },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.text, marginBottom: 10 },
  subForm: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  subInput: { height: 38, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, color: Colors.text, backgroundColor: Colors.background },
  addBtn: { height: 36, backgroundColor: "#FFF0F4", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  addBtnText: { color: Colors.primary, fontSize: 12, fontWeight: "700" },
  previewChip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10, marginTop: 8 },
  previewText: { fontSize: 12, color: Colors.text, fontWeight: "700" },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
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
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    padding: 2
  },
  addImageTile: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    gap: 4
  },
  addImageText: { fontSize: 11, color: Colors.textTertiary, fontWeight: "600" },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: Colors.white }
});
