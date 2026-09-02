import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect } from "react";
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
import { MEHNDI_CATEGORY_NAMES as CATEGORIES } from "../../constants/MehndiCategories";

export default function EditServiceScreen({ route, navigation }) {
  const { id } = route.params || {};

  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serviceImage, setServiceImage] = useState(null);

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

  const fetchServiceDetail = React.useCallback(async () => {
    try {
      const data = await getArtistServiceById(id);
      setServiceName(data.specialization_name || data.title || "");
      setCategory(data.category || "Bridal");
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
      setServiceImage(data.service_image);
    } catch (err) {
      Alert.alert("Error", "Failed to retrieve service details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow gallery access in settings to update the service image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setServiceImage(result.assets[0].uri);
    }
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
    setSaving(true);
    try {
      let uploadedUrl = serviceImage;
      const isLocal = (val) => {
        if (!val) return false;
        return (
          val.startsWith("file://") ||
          val.startsWith("content://") ||
          val.startsWith("ph://") ||
          val.startsWith("assets-library://")
        );
      };

      if (serviceImage && isLocal(serviceImage)) {
        // Upload the new service photo
        const uploadRes = await uploadPortfolioMedia([serviceImage]);
        if (uploadRes && uploadRes.length > 0) {
          uploadedUrl = uploadRes[0].url;
        }
      }

      const servicePayload = {
        specialization_name: (serviceName || "").trim(),
        category: category || "Bridal",
        minimum_price: Number(price),
        duration_minutes: Number(duration),
        description: (description || "").trim(),
        service_image: uploadedUrl,
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
          <Text style={styles.label}>Service Cover Image</Text>
          <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
            {serviceImage ? (
              <Image source={{ uri: serviceImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={28} color={Colors.textTertiary} />
                <Text style={styles.imagePlaceholderText}>Upload Service Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Service Name *</Text>
          <TextInput
            placeholder="e.g. Bridal Premium Mehndi"
            placeholderTextColor={Colors.textTertiary}
            value={serviceName}
            onChangeText={setServiceName}
            style={styles.input}
          />

          <Text style={styles.label}>Category *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownText}>{category}</Text>
            <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownList}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.dropdownItem, cat === category && styles.dropdownItemActive]}
                  onPress={() => {
                    setCategory(cat);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, cat === category && styles.dropdownItemTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  imagePickerContainer: { height: 150, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, overflow: "hidden", backgroundColor: Colors.white, marginBottom: 12 },
  previewImage: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { fontSize: 12, color: Colors.textTertiary, marginTop: 6, fontWeight: "600" }
});
