import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function BecomeArtistScreen({ navigation }) {
  const benefits = ["Get More Leads", "Verified Profile", "Secure Payments", "Grow Your Business"];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/o1.png")}
              style={styles.artistImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>
            Become <Text style={{ color: Colors.primary }}>Verified Artist</Text>
          </Text>
          <Text style={styles.subtitle}>
            Join thousands of artists on Mehandigo and start receiving premium bookings from customers near you.
          </Text>
          <View style={styles.benefitsCard}>
            {benefits.map((item, index) => (
              <View key={index} style={styles.benefitRow}>
                <View style={styles.checkCircle}>
                  <Text style={styles.check}>✓</Text>
                </View>
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.joinButton}
            onPress={() => navigation.navigate("PersonalDetails")}
          >
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 20 },
  imageContainer: { alignItems: "center", marginTop: 10 },
  artistImage: { width: 220, height: 280, borderRadius: 20 },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text, textAlign: "center", marginTop: 20 },
  subtitle: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, textAlign: "center", marginTop: 8, paddingHorizontal: 15 },
  benefitsCard: { backgroundColor: Colors.primaryLight + "40", borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, marginTop: 25 },
  benefitText: { fontSize: 14, fontWeight: "500", color: Colors.text },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  checkCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  check: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  joinButton: { height: 52, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: 30 },
  joinButtonText: { fontSize: 16, fontWeight: "600", color: Colors.white },
});
