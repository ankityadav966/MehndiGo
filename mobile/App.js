import "./src/theme/ThemeManager";
import * as ImagePicker from "expo-image-picker";

// Centralized ImagePicker Safety Lock to prevent "Unregistered ActivityResultLauncher" crashes on rapid clicks
try {
  const originalLaunchImageLibrary = ImagePicker.launchImageLibraryAsync;
  const originalLaunchCamera = ImagePicker.launchCameraAsync;
  let isPickerOpen = false;

  ImagePicker.launchImageLibraryAsync = async function (...args) {
    if (isPickerOpen) {
      console.warn("[ImagePicker Interceptor] Blocked concurrent image library launch request.");
      return { canceled: true };
    }
    isPickerOpen = true;
    try {
      return await originalLaunchImageLibrary.apply(ImagePicker, args);
    } catch (err) {
      console.error("[ImagePicker Interceptor] Error launching image library:", err);
      return { canceled: true, error: err };
    } finally {
      setTimeout(() => {
        isPickerOpen = false;
      }, 1000);
    }
  };

  ImagePicker.launchCameraAsync = async function (...args) {
    if (isPickerOpen) {
      console.warn("[ImagePicker Interceptor] Blocked concurrent camera launch request.");
      return { canceled: true };
    }
    isPickerOpen = true;
    try {
      return await originalLaunchCamera.apply(ImagePicker, args);
    } catch (err) {
      console.error("[ImagePicker Interceptor] Error launching camera:", err);
      return { canceled: true, error: err };
    } finally {
      setTimeout(() => {
        isPickerOpen = false;
      }, 1000);
    }
  };
  console.log("[ImagePicker Interceptor] expo-image-picker successfully monkeypatched!");
} catch (e) {
  console.error("[ImagePicker Interceptor] Failed to override expo-image-picker methods:", e);
}

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
try {
  Alert.alert = AlertMock.alert;
} catch (e) {
  console.warn("Could not override Alert.alert directly:", e.message);
  try {
    Object.defineProperty(Alert, "alert", {
      value: AlertMock.alert,
      writable: true,
      configurable: true,
    });
  } catch (err) {
    console.error("Could not override Alert.alert via defineProperty:", err.message);
  }
}

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
    <SafeAreaProvider onLayout={onLayoutRootView} style={{ flex: 1 }}>
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
