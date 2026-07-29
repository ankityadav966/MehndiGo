const fs = require('fs');

const file = 'mobile/src/screens/Customer/PaymentScreen.js';
let content = fs.readFileSync(file, 'utf8');

const mangledStart = `      } catch (walletErr) {
        console.log("Failed to load wallet balance inside PaymentScreen:", walletErr.message);
      console.log("[PAYMENT_SCREEN] Requesting Cashfree payment session for booking ID:", bookingId);`;

const correctCode = `      } catch (walletErr) {
        console.log("Failed to load wallet balance inside PaymentScreen:", walletErr.message);
      }
    } catch (err) {
      console.log("Failed to fetch booking details in PaymentScreen:", err.message);
    }
  }, [bookingId]);

  const initiateOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      await loadBookingDetails();
      console.log("[PAYMENT_SCREEN] Requesting Cashfree payment session for booking ID:", bookingId);`;

content = content.replace(mangledStart, correctCode);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed PaymentScreen.js');
