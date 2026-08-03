import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function Onboarding3({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.text}
          />
        </Pressable>

        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color={Colors.text}
        />
      </View>

      {/* Image */}
      <View style={styles.imageCard}>
        <Image
          source={require("../../assets/images/q.png")}
          style={styles.image}
        />
      </View>

      {/* Content */}
      <Text style={styles.title}>
        Make Every{" "}
        <Text style={{ color: Colors.primary }}>
          Moment Special
        </Text>
      </Text>

      <Text style={styles.subtitle}>
        Find verified mehndi artists for every occasion.
      </Text>

      <Text style={styles.subtitle}>
        Book with confidence and create unforgettable memories.
      </Text>

      {/* Next Button */}
      <Pressable
        style={styles.button}
        onPress={async () => {
          try {
            const AsyncStorage = require("@react-native-async-storage/async-storage").default;
            await AsyncStorage.setItem("hasSeenOnboarding", "true");
          } catch (e) {}
          navigation.replace("Login");
        }}
      >
        <Text style={styles.buttonText}>Get Started</Text>

        <Ionicons
          name="arrow-forward"
          size={20}
          color="#fff"
          style={{ marginLeft: 8 }}
        />
      </Pressable>

      {/* Indicator */}
      <View style={styles.dots}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.activeDot]} />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  imageCard: {
    width: "100%",
    height: 330,
    backgroundColor: "#FFF5F8",
    borderRadius: 28,
    overflow: "hidden",
    marginTop: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  title: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 34,
  },

  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 12,
  },

  button: {
    marginTop: 45,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",

    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F6C7D6",
    marginHorizontal: 5,
  },

  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
});