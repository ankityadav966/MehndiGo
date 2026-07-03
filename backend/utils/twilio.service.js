const twilio = require("twilio");

let client = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (e) {
  console.warn("Failed to initialize Twilio client:", e.message);
}

async function sendOtp(phone, otp) {
  try {
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[Twilio Mock] Sending OTP ${otp} to phone ${phone}`);
      return { sid: "mock_sid_local", to: phone, body: `Your OTP is ${otp}` };
    }
    return await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } catch (error) {
    console.error("Twilio message send failed, falling back to mock:", error.message);
    return { sid: "mock_sid_fallback", to: phone, body: `Your OTP is ${otp}`, error: error.message };
  }
}

async function sendSms(phone, message) {
  try {
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[Twilio Mock] Sending SMS to phone ${phone}: ${message}`);
      return { sid: "mock_sid_local", to: phone, body: message };
    }
    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } catch (error) {
    console.error("Twilio SMS send failed, falling back to mock:", error.message);
    return { sid: "mock_sid_fallback", to: phone, body: message, error: error.message };
  }
}

module.exports = {
  sendOtp,
  sendSms,
};
