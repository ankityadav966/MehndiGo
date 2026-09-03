import { BackHandler, ToastAndroid, Platform } from "react-native";
import { CommonActions } from "@react-navigation/native";

/**
 * Universal safe back navigation helper.
 * If the current stack has a previous route, it goes back.
 * If opened via Deep Link, Push Notification, or after a stack reset where canGoBack() is false,
 * it resets cleanly to the Home/Dashboard rather than crashing or exiting the app.
 */
export function safeGoBack(
  navigation,
  fallbackRoute = "CustomerTabs",
  fallbackParams = { screen: "Home" }
) {
  if (!navigation) return;
  if (navigation.canGoBack && navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: fallbackRoute,
          params: fallbackParams,
        },
      ],
    });
  }
}

/**
 * Reset stack cleanly to Customer or Artist Home/Dashboard after a major flow completes.
 */
export function resetToHome(navigation, isArtist = false) {
  if (!navigation) return;
  const targetRoute = isArtist ? "ArtistTabs" : "CustomerTabs";
  const targetScreen = isArtist ? "Dashboard" : "Home";
  navigation.reset({
    index: 0,
    routes: [
      {
        name: targetRoute,
        params: { screen: targetScreen },
      },
    ],
  });
}

/**
 * Reset stack cleanly to Customer or Artist Bookings list.
 */
export function resetToBookings(navigation, isArtist = false) {
  if (!navigation) return;
  const targetRoute = isArtist ? "ArtistTabs" : "CustomerTabs";
  navigation.reset({
    index: 0,
    routes: [
      {
        name: targetRoute,
        params: { screen: "Bookings" },
      },
    ],
  });
}

/**
 * Double-back-to-exit handler for root screens (Home / Dashboard).
 * Prevents accidental app exit with a 2-second toast warning.
 */
let lastBackPressTime = 0;
export function handleRootDoubleBackExit(message = "Press back again to exit") {
  const now = Date.now();
  if (now - lastBackPressTime < 2000) {
    BackHandler.exitApp();
    return true;
  }
  lastBackPressTime = now;
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
  return true;
}
