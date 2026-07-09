import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PublicProfileScreen({ navigation }) {
  const portfolioImages = [
    "https://picsum.photos/300?1",
    "https://picsum.photos/300?2",
    "https://picsum.photos/300?3",
    "https://picsum.photos/300?4",
    "https://picsum.photos/300?5",
    "https://picsum.photos/300?6",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: "https://picsum.photos/300",
            }}
            style={styles.profileImage}
          />

          <Text style={styles.name}>Priyo Mehndi Artist</Text>

          <Text style={styles.location}>📍 Bengaluru, Karnataka</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.star}>⭐⭐⭐⭐⭐</Text>

            <Text style={styles.ratingText}>4.8 (120 Reviews)</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>120+</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>3 Years</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
        </View>

        {/* Portfolio */}
        <Text style={styles.sectionTitle}>My Portfolio</Text>

        <View style={styles.gallery}>
          {portfolioImages.map((img, index) => (
            <Image
              key={index}
              source={{ uri: img }}
              style={styles.galleryImage}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scrollContainer: {
    padding: 16,
    paddingBottom: 120,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 15,
    elevation: 0.5,
  },

  profileImage: {
    width: 95,
    height: 95,
    borderRadius: 50,
    marginBottom: 12,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },

  location: {
    color: "#777",
    marginTop: 4,
    fontSize: 13,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  star: {
    fontSize: 13,
  },

  ratingText: {
    marginLeft: 5,
    color: "#555",
    fontSize: 13,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 4,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    // elevation: 2,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F7146B",
  },

  statLabel: {
    marginTop: 5,
    color: "#777",
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },

  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  galleryImage: {
    width: "31%",
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
  },

  editBtn: {
    backgroundColor: "#F7146B",
    marginTop: 15,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },

  editBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
