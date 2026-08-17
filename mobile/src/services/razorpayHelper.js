import { NativeModules } from "react-native";
import RazorpayCheckout from "react-native-razorpay";

/**
 * Checks if the native Razorpay Android / iOS module is available in the current runtime.
 */
export function isRazorpayNativeAvailable() {
  try {
    const nativeModule = NativeModules.RNRazorpayCheckout || NativeModules.RazorpayCheckout;
    return !!(nativeModule && typeof nativeModule.open === "function");
  } catch (err) {
    return false;
  }
}

/**
 * Universal Razorpay launcher.
 * - If running in a native compiled APK/build: uses `RazorpayCheckout.open(options)`
 * - If running in Expo Go or environment without native binary: calls `onWebFallback(options)`
 */
export async function openRazorpayCheckout(options, callbacks = {}) {
  const { onSuccess, onFailure, onDismiss, onWebFallback } = callbacks;

  const isNative = isRazorpayNativeAvailable();

  if (isNative) {
    console.log("[RAZORPAY_LAUNCHER] Launching Native Razorpay SDK Sheet");
    try {
      const data = await RazorpayCheckout.open(options);
      console.log("[RAZORPAY_LAUNCHER] Native checkout success:", data);
      if (onSuccess) onSuccess(data);
    } catch (error) {
      console.log("[RAZORPAY_LAUNCHER] Native checkout response/cancel:", error);
      if (
        error &&
        (error.code === 0 ||
          (typeof error.description === "string" &&
            error.description.toLowerCase().includes("cancelled")))
      ) {
        if (onDismiss) onDismiss();
      } else {
        if (onFailure) onFailure(error);
      }
    }
  } else {
    console.log("[RAZORPAY_LAUNCHER] Native Razorpay not present (Expo Go). Opening in-app Razorpay Web Checkout.");
    if (onWebFallback) {
      onWebFallback(options);
    } else {
      console.warn("[RAZORPAY_LAUNCHER] onWebFallback callback was not provided.");
      if (onFailure) {
        onFailure({ description: "Razorpay web fallback handler not available." });
      }
    }
  }
}
