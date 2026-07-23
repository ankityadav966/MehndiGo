const fs = require('fs');

const files = [
  'mobile/src/screens/Customer/WalletScreen.js',
  'mobile/src/screens/Common/WalletScreen.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace imports
  content = content.replace(
    /import \{ CFPaymentGatewayService \} from "react-native-razorpay-pg-sdk";\s*import \{ CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder \} from "razorpay-pg-api-contract";/,
    "import RazorpayCheckout from 'react-native-razorpay';"
  );
  content = content.replace(
    /import \{ CFPaymentGatewayService \} from "react-native-cashfree-pg-sdk";\s*import \{ CFSession, CFEnvironment, CFDropCheckoutPayment, CFPaymentComponentBuilder, CFPaymentModes, CFThemeBuilder \} from "cashfree-pg-api-contract";/,
    "import RazorpayCheckout from 'react-native-razorpay';"
  );

  // Replace checkout block
  const checkoutRegex = /const onVerify = async[\s\S]*?CFPaymentGatewayService\.doPayment\(dropPayment\);\s*\} catch \(err\) \{[\s\S]*?setCheckoutModalVisible\(true\);\s*\}/;

  const razorpayCheckoutCode = `const options = {
        description: 'Wallet Recharge',
        currency: 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TG65Zz9HYgFZsj',
        amount: Math.round(amt * 100),
        name: 'MehndiGo',
        order_id: sessionData.order_id,
        theme: { color: '#ff7e5f' }
      };

      RazorpayCheckout.open(options).then(async (data) => {
        console.log("Razorpay Wallet Recharge Success Callback:", data);
        try {
          await apiRequest("POST", "/wallet/add-money", {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            payment_session_id: sessionData.payment_session_id
          }, true);
          
          Alert.alert("Success", \`₹\${amt} has been successfully added to your wallet!\`);
          setCustomAmount("");
          loadWalletData();
        } catch (verifyErr) {
          console.log("Verification error in wallet recharge:", verifyErr);
          Alert.alert("Verification Failed", "Failed to confirm payment signature.");
        }
      }).catch(error => {
        console.log("Razorpay Recharge Error Callback:", error);
        if (error && error.code && error.code.toString().includes("UNAVAILABLE")) {
           // Expo Go fallback
           setCheckoutModalVisible(true);
        } else if (error && error.description && error.description.includes("cancelled")) {
          Alert.alert("Recharge Cancelled", "You cancelled the top-up transaction.");
        } else {
          Alert.alert("Recharge Failed", error.description || error.message || "Top-up session failed.");
        }
      });
    } catch (err) {
      console.log("Razorpay SDK Initiation Error (Fallback to Simulation):", err);
      setCheckoutModalVisible(true);
    }`;

  content = content.replace(checkoutRegex, razorpayCheckoutCode);
  
  // also fix handleRechargeSuccess if there's any cashfree_order_id left
  content = content.replace(/cashfree_order_id: orderId,/g, 'razorpay_order_id: orderId,');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed ' + file);
});
