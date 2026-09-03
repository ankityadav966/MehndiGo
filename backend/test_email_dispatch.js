const { sendEmail } = require("./utils/mail.service");

async function runTest() {
  console.log("Sending test email...");
  const result = await sendEmail({
    to: "aadityakumawat111@gmail.com",
    subject: "Test Email from donotreply@mehndigo.in",
    text: "This is a test email dispatched directly from the local MehndiGo backend.",
    html: "<h1>Test Email</h1><p>This is a test email dispatched directly from the local MehndiGo backend via Azure / Fallback logic.</p>"
  });
  console.log("Email Result:", result);
}

runTest();
