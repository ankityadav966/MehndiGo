/**
 * Twilio / SMS Service Helper
 */
async function sendOtp(phone, otp) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromPhone && !accountSid.includes("your_")) {
      const twilio = require("twilio");
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({
        body: `Your MehndiGo verification OTP code is: ${otp}`,
        from: fromPhone,
        to: phone.startsWith("+") ? phone : `+91${phone}`,
      });
      console.log(`[SMS TWILIO] Sent OTP to ${phone}, SID: ${message.sid}`);
      return { success: true, messageId: message.sid };
    }
  } catch (err) {
    console.error(`[SMS TWILIO] Error sending SMS to ${phone}:`, err.message);
  }

  // Fallback for dev / environment where Twilio credentials are not set
  console.log(`[SMS DEV LOG] SMS OTP to ${phone}: ${otp}`);
  return { success: true, devMode: true };
}

module.exports = {
  sendOtp,
};
