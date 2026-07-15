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

function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = phone.toString().replace(/\s+/g, ""); // Remove all whitespace
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) {
      cleaned = "+91" + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      cleaned = "+" + cleaned;
    }
  }
  return cleaned;
}

async function sendOtp(phone, otp) {
  try {
    const formattedPhone = normalizePhone(phone);
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[Twilio Mock] Sending OTP ${otp} to phone ${formattedPhone}`);
      return { sid: "mock_sid_local", to: formattedPhone, body: `Your OTP is ${otp}` };
    }
    return await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
  } catch (error) {
    console.error("Twilio message send failed, falling back to mock:", error.message);
    const formattedPhone = normalizePhone(phone);
    return { sid: "mock_sid_fallback", to: formattedPhone, body: `Your OTP is ${otp}`, error: error.message };
  }
}

async function sendSms(phone, message) {
  try {
    const formattedPhone = normalizePhone(phone);
    if (!client || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[Twilio Mock] Sending SMS to phone ${formattedPhone}: ${message}`);
      return { sid: "mock_sid_local", to: formattedPhone, body: message };
    }
    return await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

  } catch (error) {

    console.error("Twilio SMS send failed, falling back to mock:", error.message);
    const formattedPhone = normalizePhone(phone);
    return { sid: "mock_sid_fallback", to: formattedPhone, body: message, error: error.message };
  }
}


module.exports = {
  sendOtp,
  sendSms,
  normalizePhone
};
