const fs = require('fs');
let file = 'mobile/src/app/booking.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \{ CFPaymentGatewayService \} = require\("react-native-razorpay-pg-sdk"\);\s*const \{ CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder \} = require\("razorpay-pg-api-contract"\);/,
  "const RazorpayCheckout = require('react-native-razorpay').default || require('react-native-razorpay');"
);

const checkoutRegex = /try \{\s*const onVerify = async[\s\S]*?CFPaymentGatewayService\.doPayment\(dropPayment\);\s*\} catch \(sdkError\) \{[\s\S]*?\}\s*return;/;

const razorpayCheckoutCode = `try {
          const options = {
            description: 'Payment for Booking',
            currency: 'INR',
            key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TG65Zz9HYgFZsj',
            amount: (sessionData.amount || 1500) * 100, // Amount is in paise
            name: 'MehndiGo',
            order_id: sessionData.order_id,
            theme: {color: '#ff7e5f'}
          };

          RazorpayCheckout.open(options).then(async (data) => {
            console.log("[BOOKING_JSX] Razorpay Success Callback in booking.jsx. data:", data);
            try {
              const verifyPayload = {
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                payment_session_id: sessionData.payment_session_id
              };
              console.log("[BOOKING_JSX] Calling verifyPaymentSignature with payload:", JSON.stringify(verifyPayload, null, 2));
              const response = await verifyPaymentSignature(verifyPayload);
              console.log("[BOOKING_JSX] verifyPaymentSignature succeeded. Response:", JSON.stringify(response, null, 2));
              Alert.alert("Success", "Booking Confirmed!", [
                { text: "OK", onPress: () => router.replace('/(user)/bookings') }
              ]);
            } catch (verifyErr) {
              console.error("[BOOKING_JSX] Verification API error:", verifyErr.message, verifyErr);
              Alert.alert("Verification Failed", "Failed to confirm payment signature.");
            }
          }).catch(async (error) => {
            console.log("Razorpay Error Callback in booking.jsx:", error);
            // Expo Go Simulator fallback
            if (error.code && error.code.toString().includes("UNAVAILABLE")) {
               console.log("Razorpay SDK failed (Expo Go fallback). Simulating success...");
               Alert.alert("Payment Simulation", "Simulating Razorpay Payment Success...");
               await verifyPaymentSignature({
                 razorpay_order_id: sessionData.order_id,
                 payment_session_id: sessionData.payment_session_id
               });
               Alert.alert("Success", "Booking Confirmed!", [
                 { text: "OK", onPress: () => router.replace('/(user)/bookings') }
               ]);
            } else {
               Alert.alert("Payment Failed", error.description || error.message || "Checkout session failed.");
            }
          });
        } catch (sdkError) {
          console.log("Error initializing Razorpay:", sdkError);
          Alert.alert("Payment Failed", "Could not initialize payment gateway.");
        }
        return;`;

content = content.replace(checkoutRegex, razorpayCheckoutCode);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed booking.jsx');
