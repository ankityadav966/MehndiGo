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

      <View style={styles.header}>
        <Ionicons name="chevron-back" size={24} color={Colors.text} />
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text} />
      </View>

      <View style={styles.imageCard}>
        <Image
          source={require("../../assets/images/o3.png")}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <Text style={styles.title}>Make Every Moment Special</Text>
      <Text style={styles.subtitle}>Discover talented artists</Text>
      <Text style={styles.subtitle}>perfectly suited for your events.</Text>

      <Pressable
        style={styles.button}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={styles.buttonText}>Next</Text>
      </Pressable>
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
    paddingTop: 8,
  },
  imageCard: {
    width: "100%",
    height: 320,
    backgroundColor: Colors.background,
    borderRadius: 30,
    marginTop: 30,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  title: {
    marginTop: 35,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: 8,
  },
  button: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
