import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/Auth/SplashScreen";
import Onboarding3 from "../screens/Auth/Onboarding3";
import LoginScreen from "../screens/Auth/LoginScreen";
import OtpScreen from "../screens/Auth/OtpScreen";
import ArtistFlowStack from "./ArtistFlowStack";
import ArtistStack from "./ArtistStack";
import CustomerStack from "./CustomerStack";
import { useAuth } from "../context/AuthContext";
import { useArtistOnboarding } from "../context/ArtistOnboardingContext";
import { View, ActivityIndicator } from "react-native";
import Colors from "../constants/Colors";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { artistProfileCompleted } = useArtistOnboarding();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color={Colors.primary || "#FF4D6D"} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : (user?.role || "").toUpperCase() === "ARTIST" ? (
        artistProfileCompleted ? (
          <>
            <Stack.Screen name="ArtistStack" component={ArtistStack} />
            <Stack.Screen name="ArtistFlowStack" component={ArtistFlowStack} />
          </>
        ) : (
          <>
            <Stack.Screen name="ArtistFlowStack" component={ArtistFlowStack} />
            <Stack.Screen name="ArtistStack" component={ArtistStack} />
          </>
        )
      ) : (
        <Stack.Screen name="CustomerStack" component={CustomerStack} />
      )}
    </Stack.Navigator>
  );
}
