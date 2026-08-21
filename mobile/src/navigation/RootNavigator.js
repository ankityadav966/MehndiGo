import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SplashScreen from "../screens/Auth/SplashScreen";
import Onboarding3 from "../screens/Auth/Onboarding3";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import RoleSelectionScreen from "../screens/Auth/RoleSelectionScreen";
import OtpScreen from "../screens/Auth/OtpScreen";
import ArtistFlowStack from "./ArtistFlowStack";
import ArtistStack from "./ArtistStack";
import CustomerStack from "./CustomerStack";
import { useAuth } from "../context/AuthContext";
import { useArtistOnboarding } from "../context/ArtistOnboardingContext";
import { View, ActivityIndicator } from "react-native";
import Colors from "../constants/Colors";

import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { artistApproved, verificationStatus, isLoading: isArtistLoading } = useArtistOnboarding();
  const navigation = useNavigation();

  const isArtist = String(user?.role).toUpperCase() === "ARTIST";
  const isOverallLoading = isAuthLoading;

  useEffect(() => {
    const hideSplash = async () => {
      try {
        const ExpoSplash = require("expo-splash-screen");
        await ExpoSplash.hideAsync();
      } catch (e) {}
    };
    hideSplash();
  }, [isOverallLoading]);

  if (isOverallLoading) {
    return null;
  }

  const isApprovedArtist = isArtist && (artistApproved || verificationStatus === "APPROVED") && user?.is_active !== false;

  const targetStack = !isAuthenticated
    ? "AuthStack"
    : isArtist
    ? isApprovedArtist
      ? "ArtistStack"
      : "ArtistFlowStack"
    : "CustomerStack";

  console.log(`[ARTIST_APPROVAL_DEBUG] ROOT_NAV_STATE -> isAuthenticated: ${isAuthenticated} | isArtist: ${isArtist} | isArtistLoading: ${isArtistLoading} | isAuthLoading: ${isAuthLoading} | artistApproved: ${artistApproved} | verificationStatus: ${verificationStatus} | is_active: ${user?.is_active} | isApprovedArtist: ${isApprovedArtist} | TARGET_ROUTE: ${targetStack}`);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding3" component={Onboarding3} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
        </>
      ) : isArtist ? (
        isApprovedArtist ? (
          <Stack.Screen name="ArtistStack" component={ArtistStack} />
        ) : (
          <Stack.Screen name="ArtistFlowStack" component={ArtistFlowStack} />
        )
      ) : (
        <Stack.Screen name="CustomerStack" component={CustomerStack} />
      )}
    </Stack.Navigator>
  );
}
