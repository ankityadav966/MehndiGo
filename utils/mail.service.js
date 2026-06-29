const nodemailer = require("nodemailer");

let transporter = null;

try {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }
} catch (e) {
  console.warn("Failed to initialize nodemailer transporter:", e.message);
}

async function sendEmail(to, subject, body) {
  try {
    if (!transporter) {
      console.log(`[Email Mock] To: ${to} | Subject: ${subject} | Body: ${body}`);
      return { mock: true, to, subject, body };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: body,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Nodemailer failed, falling back to mock:", error.message);
    return { mock: true, to, subject, body, error: error.message };
  }
}

module.exports = {
  sendEmail,
};
