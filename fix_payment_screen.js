const fs = require('fs');
let file = 'mobile/src/screens/Customer/PaymentScreen.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Resolve conflict markers (take the bottom part, 4d915c...)
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g, '$1');

// 2. Replace SDK import
content = content.replace(
  /import \{ CFPaymentGatewayService \} from "react-native-razorpay-pg-sdk";\s*import \{ CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder \} from "razorpay-pg-api-contract";/,
  "import RazorpayCheckout from 'react-native-razorpay';"
);

// 3. Replace the checkout logic
const checkoutRegex = /try \{\s*const onVerify = async[\s\S]*?CFPaymentGatewayService\.doPayment\(dropPayment\);\s*\} catch \(error\) \{[\s\S]*?setCheckoutModalVisible\(true\);\s*\}/;

const razorpayCheckoutCode = `try {
      const options = {
        description: 'Payment',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TG65Zz9HYgFZsj',
        amount: Math.round(finalAmount * 100), // convert to paise
        name: 'MehndiGo',
        order_id: orderId,
        theme: { color: '#ff7e5f' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        console.log("[PAYMENT_SCREEN] Razorpay Success Callback. data:", data);
        try {
          const verifyData = {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            payment_session_id: paymentSessionId
          };
          console.log("[PAYMENT_SCREEN] Calling verifyPaymentSignature with payload:", JSON.stringify(verifyData, null, 2));
          const response = await verifyPaymentSignature(verifyData);
          console.log("[PAYMENT_SCREEN] verifyPaymentSignature succeeded. Response:", JSON.stringify(response, null, 2));
          
          setLoading(false);
          if (isSettlement) {
            console.log("[PAYMENT_SCREEN] Routing to ReviewSubmission screen.");
            navigation.replace("ReviewSubmission", {
              bookingId: bookingId,
              artistName: booking?.artist?.user?.name,
              artistImage: booking?.artist?.user?.profile_image,
              specializationName: booking?.service?.specialization_name
            });
          } else {
            console.log("[PAYMENT_SCREEN] Routing to BookingSuccess screen.");
            navigation.replace("BookingSuccess", { bookingCode: bookingCode || booking?.booking_code || "success" });
          }
        } catch (verifyErr) {
          setLoading(false);
          console.error("[PAYMENT_SCREEN] Verification API error:", verifyErr.message, verifyErr);
          navigation.navigate("PaymentFailed", { bookingId, finalAmount });
        }
      }).catch(error => {
        setLoading(false);
        console.log("Razorpay Checkout Error Callback:", error);
        if (error && error.code && error.code.toString().includes("UNAVAILABLE")) {
           // Expo Go fallback
           setCheckoutModalVisible(true);
        } else if (error && error.description && error.description.includes("cancelled")) {
          Alert.alert("Payment Cancelled", "You cancelled the payment transaction.");
        } else {
          Alert.alert("Payment Failed", error.description || error.message || "Checkout session failed.");
          navigation.navigate("PaymentFailed", { bookingId, finalAmount });
        }
      });
    } catch (error) {
      setLoading(false);
      console.log("Razorpay SDK Initiation Error (Fallback to Simulation):", error);
      setCheckoutModalVisible(true);
    }`;

content = content.replace(checkoutRegex, razorpayCheckoutCode);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed PaymentScreen.js');
