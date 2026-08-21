import React, { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import Alert from "../../utils/Alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";
import { fetchArtistServices } from "../../services/customer";

export default function SelectService({ route, navigation }) {
  const { artistId, selectedDate, selectedTimeSlot, selectedArt, services: initialServices } = route.params || {};

  const hasInitial = Array.isArray(initialServices) && initialServices.length > 0;
  const [services, setServices] = useState(hasInitial ? initialServices : []);
  const [selectedServiceId, setSelectedServiceId] = useState(hasInitial ? initialServices[0].id : null);
  const [loading, setLoading] = useState(!hasInitial);

  useEffect(() => {
    if (!artistId) {
      Alert.alert("Error", "No artist selected.");
      navigation.goBack();
      return;
    }

    const loadServices = async () => {
      try {
        const data = await fetchArtistServices(artistId);
        const list = data || [];
        setServices(list);
        if (list.length > 0) {
          setSelectedServiceId((prev) => prev || list[0].id);
        }
      } catch (err) {
        if (!hasInitial) {
          Alert.alert("Error", "Failed to fetch artist services.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [artistId, hasInitial]);

  const handleContinue = () => {
    if (!selectedServiceId) {
      Alert.alert("Required", "Please select a mehndi service to continue.");
      return;
    }

    navigation.navigate("SelectDate", {
      artistId,
      serviceId: selectedServiceId,
      selectedDate,
      selectedTimeSlot,
      selectedArt
    });
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedServiceId === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.serviceCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => setSelectedServiceId(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.category || "Mehndi"}</Text>
            </View>
            <View style={styles.durationTag}>
              <Ionicons name="time-outline" size={10} color={Colors.textSecondary} />
              <Text style={styles.durationTagText}> {item.duration_minutes || 60} mins</Text>
            </View>
          </View>
          
          <View style={styles.cardBody}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.serviceName}>{item.specialization_name || item.name}</Text>
              <Text style={styles.serviceDesc} numberOfLines={3}>
                {item.description || "Beautiful custom mehndi design and premium styling."}
              </Text>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceValue}>₹{item.minimum_price}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="home-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.serviceMetaText}> Home Service Available</Text>
            </View>
            <View style={styles.selectIndicator}>
              <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={16} color={isSelected ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.selectIndicatorText, isSelected ? styles.selectIndicatorTextActive : null]}>
                {isSelected ? "Selected" : "Select"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Service</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No services listed by this artist.</Text>
            </View>
          }
        />
      )}

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.continueBtn, !selectedServiceId && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!selectedServiceId}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  serviceCard: {
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: Colors.white,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight + "08" },
  cardHeader: { width: "100%" },
  tagRow: { flexDirection: "row", marginBottom: 8, gap: 8 },
  categoryTag: { backgroundColor: Colors.primary + "10", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryTagText: { fontSize: 10, color: Colors.primary, fontWeight: "700" },
  durationTag: { backgroundColor: Colors.inputBackground, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: "row", alignItems: "center" },
  durationTagText: { fontSize: 10, color: Colors.textSecondary },
  cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 4 },
  serviceName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  serviceDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 16 },
  priceContainer: { alignItems: "flex-end", minWidth: 90 },
  priceLabel: { fontSize: 9, color: Colors.textTertiary, textTransform: "uppercase" },
  priceValue: { fontSize: 18, fontWeight: "850", color: Colors.primary, marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 12, paddingTop: 10 },
  serviceMetaText: { fontSize: 11, color: Colors.textSecondary },
  selectIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectIndicatorText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  selectIndicatorTextActive: { color: Colors.primary, fontWeight: "700" },
  bottom: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  continueBtn: { height: 48, backgroundColor: Colors.primary, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  disabledBtn: { backgroundColor: Colors.textTertiary },
  continueText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  emptyContainer: { paddingVertical: 80, alignItems: "center" },
  emptyText: { fontSize: 13, color: Colors.textTertiary, marginTop: 8 }
});
