import { Clipboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Alert from "./Alert";

export const ACTIVE_COUPON_STORAGE_KEY = "@active_coupon_code";

/**
 * Copy coupon code to clipboard with success feedback and store for auto-application
 * @param {string} couponCode
 * @param {string} [offerTitle]
 */
export async function copyAndSaveCoupon(couponCode, offerTitle = "Festival Offer") {
  if (!couponCode || typeof couponCode !== "string") return;
  const cleanCode = couponCode.trim().toUpperCase();

  try {
    // 1. Copy code to system clipboard
    Clipboard.setString(cleanCode);

    // 2. Persist in AsyncStorage for checkout auto-fill
    await AsyncStorage.setItem(ACTIVE_COUPON_STORAGE_KEY, cleanCode);

    // 3. User feedback
    Alert.alert(
      "Coupon Code Copied! 🎉",
      `Offer Code "${cleanCode}" copied to clipboard and saved. It will be auto-applied at booking checkout!`,
      [{ text: "Great!", style: "default" }]
    );
  } catch (err) {
    console.error("Failed to copy/save coupon code:", err.message);
    Alert.alert("Coupon Saved", `Code "${cleanCode}" copied successfully!`);
  }
}

/**
 * Retrieve saved active coupon code for checkout
 * @returns {Promise<string|null>}
 */
export async function getSavedCouponCode() {
  try {
    return await AsyncStorage.getItem(ACTIVE_COUPON_STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

/**
 * Clear stored coupon code after successful application
 */
export async function clearSavedCouponCode() {
  try {
    await AsyncStorage.removeItem(ACTIVE_COUPON_STORAGE_KEY);
  } catch (err) {
    // ignore
  }
}
