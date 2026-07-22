import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const categories = [
  "Mehndi",
  "Makeup",
  "Photography",
  "Hair",
  "Nails",
];

const priceRanges = [
  { label: "Under ₹1,000", value: "0-1000" },
  { label: "₹1,000 - ₹3,000", value: "1000-3000" },
  { label: "₹3,000 - ₹5,000", value: "3000-5000" },
  { label: "₹5,000+", value: "5000+" },
];

const ratings = ["4.5+", "4.0+", "3.5+", "3.0+"];

export default function FiltersScreen({ navigation }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [location, setLocation] = useState("");

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const clearAll = () => {
    setSelectedCategories([]);
    setSelectedPrice("");
    setSelectedRating("");
    setLocation("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#1D1D1D" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Filters</Text>

        <TouchableOpacity onPress={clearAll}>
          <Text style={styles.clearAll}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Category</Text>

        <View style={styles.checkboxGroup}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.checkboxRow}
              onPress={() => toggleCategory(cat)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedCategories.includes(cat) && styles.checkboxActive,
                ]}
              >
                {selectedCategories.includes(cat) && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>

              <Text style={styles.checkboxLabel}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Price Range</Text>

        <View style={styles.chipGroup}>
          {priceRanges.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.chip,
                selectedPrice === item.value && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedPrice(
                  selectedPrice === item.value ? "" : item.value,
                )
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedPrice === item.value && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Rating</Text>

        <View style={styles.chipGroup}>
          {ratings.map((rating) => (
            <TouchableOpacity
              key={rating}
              style={[
                styles.chip,
                selectedRating === rating && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedRating(selectedRating === rating ? "" : rating)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selectedRating === rating && styles.chipTextActive,
                ]}
              >
                {rating} â­
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Location</Text>

        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color="#999" />

          <TextInput
            style={styles.input}
            placeholder="Enter city or area"
            placeholderTextColor="#999"
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.applyBtn}>
        <Text style={styles.applyBtnText}>Apply Filters</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE4EF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  clearAll: {
    fontSize: 14,
    color: "#F7146B",
    fontWeight: "600",
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
    marginTop: 10,
  },
  checkboxGroup: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 6,
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: "#F7146B",
    borderColor: "#F7146B",
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  chipActive: {
    backgroundColor: "#F7146B",
    borderColor: "#F7146B",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: "#FFE4EF",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111",
  },
  applyBtn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F7146B",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#F7146B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  applyBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
