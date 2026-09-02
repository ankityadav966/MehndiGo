import React, { useCallback, useState, useEffect } from "react";
import { StatusBar, Alert, View, Platform } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Poppins_400Regular } from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import * as ImagePicker from "expo-image-picker";

import "./src/theme/ThemeManager";
import { ArtistOnboardingProvider } from "./src/context/ArtistOnboardingContext";
import { AuthProvider } from "./src/context/AuthContext";
import { PortfolioProvider } from "./src/context/PortfolioContext";
import { SocketProvider } from "./src/context/SocketContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import RootNavigator from "./src/navigation/RootNavigator";
import GlobalToast from "./src/components/GlobalToast";
import GlobalModal from "./src/components/GlobalModal";
import AlertMock from "./src/utils/Alert";
import { linkingConfig } from "./src/services/deepLink";

// Global Alert Override
try {
  Alert.alert = AlertMock.alert;
} catch (e) {
  try {
    Object.defineProperty(Alert, "alert", {
      value: AlertMock.alert,
      writable: true,
      configurable: true,
    });
  } catch (err) {}
}

// Centralized ImagePicker Safety Lock
try {
  const originalLaunchImageLibrary = ImagePicker.launchImageLibraryAsync;
  const originalLaunchCamera = ImagePicker.launchCameraAsync;
  let isPickerOpen = false;

  if (typeof originalLaunchImageLibrary === "function") {
    ImagePicker.launchImageLibraryAsync = async function (...args) {
      if (isPickerOpen) {
        return { canceled: true };
      }
      isPickerOpen = true;
      try {
        return await originalLaunchImageLibrary.apply(ImagePicker, args);
      } catch (err) {
        return { canceled: true, error: err };
      } finally {
        setTimeout(() => {
          isPickerOpen = false;
        }, 1000);
      }
    };
  }

  if (typeof originalLaunchCamera === "function") {
    ImagePicker.launchCameraAsync = async function (...args) {
      if (isPickerOpen) {
        return { canceled: true };
      }
      isPickerOpen = true;
      try {
        return await originalLaunchCamera.apply(ImagePicker, args);
      } catch (err) {
        return { canceled: true, error: err };
      } finally {
        setTimeout(() => {
          isPickerOpen = false;
        }, 1000);
      }
    };
  }
} catch (e) {}

const navigationRef = createNavigationContainerRef();
global.navigationRef = navigationRef;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins: Poppins_400Regular,
  });
  useEffect(() => {
    // Hide native splash screen safely
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleDeepLink = async (url) => {
      if (!url) return;
      try {
        const { handleDeepLinkNavigation, resolveDeepLink, setPendingDeepLink } = require("./src/services/deepLink");

        // Intercept referral invite links to persist the referral code
        const resolved = resolveDeepLink(url);
        if (resolved?.type === "REFERRAL_INVITE" && resolved?.pendingReferralCode) {
          const AsyncStorage = require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem("pendingReferralCode", resolved.pendingReferralCode);
          if (__DEV__) console.log("[Referral] Stored pendingReferralCode:", resolved.pendingReferralCode);
        }

        if (navigationRef.isReady()) {
          const { secureStorage } = require("./src/utils/storage");
          const token = await secureStorage.getAccessToken();
          const role = await secureStorage.getUserRole();
          await handleDeepLinkNavigation(url, navigationRef, !!token, role || "CUSTOMER");
        } else {
          if (resolved.isValid) {
            await setPendingDeepLink(resolved);
          }
        }
      } catch (err) {}
    };

    const checkInitialUrl = async () => {
      try {
        const Linking = require("expo-linking");
        const url = await Linking.getInitialURL();
        if (url) handleDeepLink(url);
      } catch (e) {}
    };

    checkInitialUrl();

    let subscription = null;
    try {
      const Linking = require("expo-linking");
      subscription = Linking.addEventListener("url", (event) => {
        if (event?.url) handleDeepLink(event.url);
      });
    } catch (e) {}

    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
    };
  }, []);

  const onNavReady = useCallback(async () => {
    try {
      const { consumePendingDeepLink, handleDeepLinkNavigation } = require("./src/services/deepLink");
      const { secureStorage } = require("./src/utils/storage");
      const token = await secureStorage.getAccessToken();
      const role = await secureStorage.getUserRole();

      // Check if there is an unconsumed pending deep link
      const consumed = await consumePendingDeepLink(navigationRef, !!token);

      // Check if there is a deferred deep link stored from Play Store install referrer
      if (!consumed) {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const pendingDeferredUrl = await AsyncStorage.getItem("pending_deferred_deep_link");
        if (pendingDeferredUrl) {
          await AsyncStorage.removeItem("pending_deferred_deep_link");
          await handleDeepLinkNavigation(pendingDeferredUrl, navigationRef, !!token, role || "CUSTOMER");
        }
      }
    } catch (e) {
      if (__DEV__) console.log("[App onReady] Error processing initial/pending links:", e.message);
    }
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <GlobalToast />
      <GlobalModal />
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider navigationRef={navigationRef}>
            <ArtistOnboardingProvider>
              <PortfolioProvider>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <NavigationContainer ref={navigationRef} linking={linkingConfig} onReady={onNavReady}>
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
