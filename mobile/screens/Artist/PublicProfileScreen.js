import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Colors from "../../constants/Colors";

export default function PublicProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.name}>Aisha Khan</Text>
          <Text style={styles.tagline}>Bridal and event mehendi artist</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Text key={i} style={styles.star}>⭐</Text>
            ))}
          </View>
          <Text style={styles.rating}>4.9 · 120 reviews</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.sectionText}>Experienced mehendi artist with a flair for bridal, engagement, and party designs. Available for events across Mumbai and nearby cities.</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.sectionText}>Bridal Mehendi · Arabic · Floral · Modern</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.sectionText}>Weekdays: 10am - 8pm · Weekends: 9am - 10pm</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryLight + "20" },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
  heroCard: { backgroundColor: Colors.white, borderRadius: 28, padding: 24, marginBottom: 18, shadowColor: Colors.shadow, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  name: { fontSize: 26, fontWeight: "700", color: Colors.text },
  tagline: { marginTop: 10, fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  starsRow: { flexDirection: "row", marginTop: 10, gap: 2 },
  star: { fontSize: 16 },
  rating: { marginTop: 10, fontSize: 14, fontWeight: "700", color: Colors.primary },
  sectionCard: { backgroundColor: Colors.white, borderRadius: 24, padding: 20, marginBottom: 14, shadowColor: Colors.shadow, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  sectionText: { marginTop: 10, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
