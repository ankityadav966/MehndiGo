import React, { useState, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Alert from "../utils/Alert";
import { WebView } from "react-native-webview";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";

export default function RazorpayCheckoutModal({
  visible,
  options,
  onSuccess,
  onFailure,
  onDismiss
}) {
  const [webViewLoading, setWebViewLoading] = useState(true);
  const webViewRef = useRef(null);

  if (!visible || !options) {
    return null;
  }

  const cleanOptions = {
    key: options.key || options.key_id || options.keyId,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "MehndiGo",
    description: options.description || "Booking & Services Payment",
    image: options.image || "https://api.mehndigo.in/logo.png",
    order_id: options.order_id || options.orderId,
    prefill: {
      name: options.prefill?.name || "Customer",
      email: options.prefill?.email || "customer@mehndigo.com",
      contact: options.prefill?.contact || "9829011001",
      method: options.prefill?.method || "upi"
    },
    notes: options.notes || {},
    theme: {
      color: options.theme?.color || options.themeColor || "#5f259f"
    },
    upi: options.upi || { flow: "intent" },
    method: options.method || "upi",
    isTestMode: (options.key || options.key_id || options.keyId || "").startsWith("rzp_test_")
  };

  const isTestMode = cleanOptions.isTestMode;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>MehndiGo Secure Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .loading-container {
      text-align: center;
      padding: 20px;
      max-width: 320px;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid ${cleanOptions.theme?.color || "#E91E63"};
      border-radius: 50%;
      width: 44px;
      height: 44px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status-text {
      color: #333333;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .sub-text {
      color: #777777;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .test-btn {
      background-color: #9333EA;
      color: #ffffff;
      border: none;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="loading-container" id="loader">
    <div class="spinner"></div>
    <div class="status-text">Opening Secure Payment Gateway...</div>
    <div class="sub-text">100% Safe 256-bit SSL Encrypted by Razorpay</div>
  </div>

  <script>
    var rzpOptions = ${JSON.stringify(cleanOptions)};

    rzpOptions.handler = function (response) {
      document.getElementById('loader').innerHTML = '<div class="spinner"></div><div class="status-text">Payment received! Verifying...</div>';
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PAYMENT_SUCCESS',
          data: {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || rzpOptions.order_id,
            razorpay_signature: response.razorpay_signature
          }
        }));
      }
    };

    rzpOptions.modal = {
      ondismiss: function () {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_DISMISSED'
          }));
        }
      }
    };

    function startCheckout() {
      try {
        if (typeof Razorpay !== 'undefined') {
          var rzp = new Razorpay(rzpOptions);
          rzp.on('payment.failed', function (resp) {
            console.log('payment failed:', resp);
          });
          rzp.open();
        }
      } catch (err) {
        console.error('Razorpay initialization exception:', err);
      }
    }

    if (document.readyState === 'complete') {
      startCheckout();
    } else {
      window.onload = startCheckout;
    }
  </script>
</body>
</html>
`;

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log("[RAZORPAY WEBVIEW EVENT]", msg.type);

      if (msg.type === "PAYMENT_SUCCESS") {
        if (onSuccess) onSuccess(msg.data);
      } else if (msg.type === "PAYMENT_FAILED") {
        if (onFailure) onFailure(msg.error);
      } else if (msg.type === "PAYMENT_DISMISSED") {
        if (onDismiss) onDismiss();
      }
    } catch (e) {
      console.error("[RAZORPAY WEBVIEW MESSAGE ERROR]", e);
    }
  };

  const handleClose = () => {
    console.log("[RAZORPAY_MODAL] Closing payment modal directly");
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    if (!url) return true;

    // Check for native UPI / PhonePe / GPay / Paytm scheme or Android Intent
    if (
      url.startsWith("upi://") ||
      url.startsWith("phonepe://") ||
      url.startsWith("paytmmp://") ||
      url.startsWith("gpay://") ||
      url.startsWith("tez://") ||
      url.startsWith("intent://")
    ) {
      let targetUrl = url;

      // If Android intent URL, parse data URI or convert to upi://
      if (url.startsWith("intent://")) {
        const dataMatch = url.match(/data=([^;]+)/);
        if (dataMatch && dataMatch[1]) {
          try {
            targetUrl = decodeURIComponent(dataMatch[1]);
          } catch (e) {
            targetUrl = dataMatch[1];
          }
        } else {
          const rawPayload = url.replace(/^intent:\/\//, "");
          const cleanQuery = rawPayload.split("#Intent")[0];
          targetUrl = `upi://${cleanQuery}`;
        }
      }

      console.log("[RAZORPAY_MODAL] Launching native UPI / PhonePe app:", targetUrl);

      Linking.openURL(targetUrl).catch((err) => {
        console.warn("[RAZORPAY_MODAL] Could not open external app url:", err.message);
      });

      return false;
    }
    return true;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>MehndiGo Payment</Text>
            <View style={styles.badgeRow}>
              <Ionicons name="lock-closed" size={12} color="#10B981" />
              <Text style={styles.badgeText}>Razorpay 256-bit Secure</Text>
            </View>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            originWhitelist={["*"]}
            source={{
              html: htmlContent,
              baseUrl: "https://api.mehndigo.in"
            }}
            onMessage={handleMessage}
            onLoadStart={() => setWebViewLoading(true)}
            onLoadEnd={() => setWebViewLoading(false)}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={true}
            style={styles.webView}
            scalesPageToFit={Platform.OS === "android"}
            onError={(e) => console.log("WebView error suppressed:", e.nativeEvent.description)}
            onHttpError={(e) => console.log("WebView HTTP error suppressed:", e.nativeEvent.statusCode)}
          />

          {webViewLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary || "#9333EA"} />
              <Text style={styles.loadingText}>Connecting to Razorpay Secure Gateway...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC"
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF"
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitleContainer: {
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A"
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4
  },
  badgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600"
  },
  webViewContainer: {
    flex: 1,
    position: "relative"
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 10
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center"
  },
  testBanner: {
    backgroundColor: "#FEF3C7",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  testBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E"
  },
  testBannerSub: {
    fontSize: 10,
    color: "#B45309",
    marginTop: 1
  },
  testBannerBtn: {
    backgroundColor: "#9333EA",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  testBannerBtnTxt: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  }
});
