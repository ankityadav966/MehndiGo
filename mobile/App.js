import "./src/theme/ThemeManager";
import { useCallback } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { StatusBar, Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Poppins_400Regular } from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import { ArtistOnboardingProvider } from "./src/context/ArtistOnboardingContext";
import { AuthProvider } from "./src/context/AuthContext";
import { PortfolioProvider } from "./src/context/PortfolioContext";
import { SocketProvider } from "./src/context/SocketContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import RootNavigator from "./src/navigation/RootNavigator";
import GlobalToast from "./src/components/GlobalToast";
import GlobalModal from "./src/components/GlobalModal";
import AlertMock from "./src/utils/Alert";

// Global Alert Override
Alert.alert = AlertMock.alert;

SplashScreen.preventAutoHideAsync();

import { useEffect } from "react";
import { linkingConfig } from "./src/services/deepLink";

const navigationRef = createNavigationContainerRef();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins: Poppins_400Regular,
  });

  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;
      try {
        const Linking = require("expo-linking");
        const parsed = Linking.parse(url);
        
        let referralCode = parsed.queryParams?.ref || parsed.queryParams?.referralCode;
        
        if (!referralCode && parsed.path && parsed.path.includes("invite/")) {
          referralCode = parsed.path.split("invite/")[1];
        }

        if (referralCode) {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem("pendingReferralCode", referralCode);
          console.log("[DeepLink] Stored pending referral code:", referralCode);
        }
      } catch (err) {
        console.log("[DeepLink] Error handling url:", err.message);
      }
    };

    const checkInitialUrl = async () => {
      const Linking = require("expo-linking");
      const url = await Linking.getInitialURL();
      handleDeepLink(url);
    };

    checkInitialUrl();

    const Linking = require("expo-linking");
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <GlobalToast />
      <GlobalModal />
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider navigationRef={navigationRef}>
            <ArtistOnboardingProvider>
              <PortfolioProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <NavigationContainer ref={navigationRef} linking={linkingConfig}>
                  <RootNavigator />
                </NavigationContainer>
              </PortfolioProvider>
            </ArtistOnboardingProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
