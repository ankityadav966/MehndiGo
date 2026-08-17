import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../../constants/Colors";

function ArtistServicesMenu({ services, selectedService, onSelectService }) {
  if (!services || services.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No services listed by this artist yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Services & Packages</Text>
      {services.map((item) => {
        const isSelected = selectedService?.id === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.serviceCard, isSelected && styles.selectedCard]}
            onPress={() => onSelectService(item)}
            activeOpacity={0.8}
          >
            <View style={styles.leftInfo}>
              <Text style={styles.title}>{item.specialization_name || item.name || "Mehendi Package"}</Text>
              <Text style={styles.category}>{item.category || "Bridal / Event"}</Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{item.duration_minutes || 60} mins</Text>
              </View>
            </View>
            <View style={styles.rightPrice}>
              <Text style={styles.price}>₹{item.minimum_price || item.price || 500}</Text>
              <View style={[styles.selectBtn, isSelected && styles.selectedBtn]}>
                <Text style={[styles.selectBtnText, isSelected && styles.selectedBtnText]}>
                  {isSelected ? "Selected" : "Select"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text || "#1D1D1D",
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedCard: {
    borderColor: Colors.primary || "#9C1344",
    backgroundColor: "#FFF1F5",
  },
  leftInfo: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text || "#1D1D1D",
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.primary || "#9C1344",
    fontWeight: "500",
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary || "#666666",
  },
  rightPrice: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary || "#9C1344",
  },
  selectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  selectedBtn: {
    backgroundColor: Colors.primary || "#9C1344",
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text || "#1D1D1D",
  },
  selectedBtnText: {
    color: "#FFFFFF",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});

export default React.memo(ArtistServicesMenu);
