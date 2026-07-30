import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import CustomButton from "../../components/CustomButton";
import Alert from "../../utils/Alert";
import {
  getCustomerAddresses,
  saveCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deleteCustomerAddress,
} from "../../services/customer";
import { setActiveAddress } from "../../utils/locationManager";

export default function SavedAddressesScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Add / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [label, setLabel] = useState("Home");
  const [houseFlat, setHouseFlat] = useState("");
  const [landmark, setLandmark] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [state, setState] = useState("Rajasthan");
  const [pincode, setPincode] = useState("302001");
  const [isDefault, setIsDefault] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await getCustomerAddresses();
      const list = data || [];
      setAddresses(list);

      // Cache primary address active state
      const primary = list.find((a) => a.is_default) || list[0];
      if (primary) {
        await setActiveAddress(primary);
      }
    } catch (e) {
      console.log("Error fetching saved addresses:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAddModal = () => {
    setEditingId(null);
    setLabel("Home");
    setHouseFlat("");
    setLandmark("");
    setFullAddress("");
    setCity("Jaipur");
    setState("Rajasthan");
    setPincode("302001");
    setIsDefault(addresses.length === 0);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setLabel(item.label || item.name || "Home");
    setHouseFlat(item.house_flat || item.houseFlat || item.address_line_2 || "");
    setLandmark(item.landmark || "");
    setFullAddress(item.address_line_1 || item.fullAddress || "");
    setCity(item.city || "Jaipur");
    setState(item.state || "Rajasthan");
    setPincode(item.pincode || "302001");
    setIsDefault(!!item.is_default);
    setModalVisible(true);
  };

  const handleSaveModal = async () => {
    if (!fullAddress && !houseFlat) {
      Alert.alert("Required Field", "Please enter house/flat or full address.");
      return;
    }

    setModalLoading(true);
    try {
      const payload = {
        name: label,
        label,
        addressLine1: fullAddress || `${houseFlat}, ${city}`,
        fullAddress: fullAddress || `${houseFlat}, ${city}`,
        houseFlat,
        house_flat: houseFlat,
        landmark,
        city,
        state,
        pincode,
        isDefault,
        is_default: isDefault,
      };

      if (editingId) {
        await updateCustomerAddress(editingId, payload);
      } else {
        await saveCustomerAddress(payload);
      }

      setModalVisible(false);
      fetchAddresses();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to save address.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetPrimary = async (item) => {
    try {
      setLoading(true);
      await setDefaultCustomerAddress(item.id);
      await setActiveAddress(item);
      fetchAddresses();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to set primary address.");
      setLoading(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Address", `Are you sure you want to delete '${item.label || item.name}' address?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await deleteCustomerAddress(item.id);
            fetchAddresses();
          } catch (e) {
            Alert.alert("Error", e.message || "Failed to delete address.");
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderAddressItem = ({ item }) => {
    const isPrimary = item.is_default;
    const tag = item.label || item.name || "Home";

    return (
      <View style={[styles.card, isPrimary && styles.cardPrimary]}>
        <View style={styles.cardHeader}>
          <View style={styles.tagBadge}>
            <Ionicons
              name={tag === "Home" ? "home-outline" : tag === "Work" ? "briefcase-outline" : "location-outline"}
              size={14}
              color={Colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.tagText}>{tag}</Text>
          </View>

          {isPrimary && (
            <View style={styles.primaryBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.primaryBadgeText}>Primary Address</Text>
            </View>
          )}
        </View>

        <Text style={styles.addressLine1}>
          {[item.house_flat || item.houseFlat, item.landmark, item.address_line_1 || item.fullAddress]
            .filter(Boolean)
            .join(", ")}
        </Text>
        <Text style={styles.addressLine2}>
          {[item.city, item.state, item.pincode].filter(Boolean).join(", ")}
        </Text>

        <View style={styles.cardActions}>
          {!isPrimary && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetPrimary(item)}>
              <Text style={styles.setPrimaryBtnText}>Set as Primary</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={16} color="#374151" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity style={styles.addBtnHeader} onPress={openAddModal}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Body List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderAddressItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAddresses();
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={56} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Saved Addresses Yet</Text>
              <Text style={styles.emptySub}>
                Add your home or work address for 1-tap Mehendi booking services.
              </Text>
              <CustomButton title="Add New Address" onPress={openAddModal} style={{ marginTop: 16 }} />
            </View>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? "Edit Address" : "Add New Address"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Tag Row */}
              <Text style={styles.label}>Address Tag</Text>
              <View style={styles.tagRow}>
                {["Home", "Work", "Other"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.tagChip, label === item && styles.tagChipActive]}
                    onPress={() => setLabel(item)}
                  >
                    <Text style={[styles.tagChipText, label === item && styles.tagChipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>House / Flat No.</Text>
              <TextInput style={styles.input} placeholder="e.g. Flat 201" value={houseFlat} onChangeText={setHouseFlat} />

              <Text style={styles.label}>Landmark / Street</Text>
              <TextInput style={styles.input} placeholder="e.g. Near Market" value={landmark} onChangeText={setLandmark} />

              <Text style={styles.label}>Full Address *</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                multiline
                placeholder="Locality, Area..."
                value={fullAddress}
                onChangeText={setFullAddress}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>City</Text>
                  <TextInput style={styles.input} value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Pincode</Text>
                  <TextInput style={styles.input} value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
                </View>
              </View>

              {/* Set Primary Toggle */}
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsDefault(!isDefault)}>
                <Ionicons
                  name={isDefault ? "checkbox" : "square-outline"}
                  size={22}
                  color={isDefault ? Colors.primary : "#9CA3AF"}
                />
                <Text style={styles.checkboxText}>Set as Primary Address</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <CustomButton
                title={editingId ? "Update Address" : "Save Address"}
                onPress={handleSaveModal}
                loading={modalLoading}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  addBtnHeader: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPrimary: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  addressLine1: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  addressLine2: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  setPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
  },
  tagRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  tagChipActive: {
    backgroundColor: Colors.primary,
  },
  tagChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  tagChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  checkboxText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    fontWeight: "500",
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#F3F4F6",
  },
});
