require('dotenv').config();
const { sendOtpEmail } = require('./utils/mail.service.js');

async function testEmail() {
  try {
    const result = await sendOtpEmail('test.limit.check@mehndigo.com', '123456');
    console.log("Result:", result);
    if (result && result.success) {
      console.log("Email limit is NOT exhausted. Sent successfully.");
    } else {
      console.log("Email failed:", result);
    }
  } catch (error) {
    console.error("Caught error:", error.message);
  }
}

testEmail();
