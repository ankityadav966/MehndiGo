import { useEffect } from "react";
import { Image, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const hasSeen = await AsyncStorage.getItem("hasSeenOnboarding");
        if (hasSeen === "true") {
          navigation.replace("Login");
        } else {
          navigation.replace("Onboarding3");
        }
      } catch (e) {
        navigation.replace("Onboarding3");
      }
    };

    const timeout = setTimeout(checkOnboarding, 1500);
    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.content}>
        <Image
          source={require("../../assets/images/spll.png")}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1 },
  splashImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
