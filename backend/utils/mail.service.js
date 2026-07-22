const nodemailer = require("nodemailer");

let transporter = null;

function generateOtpHtml(otp, name, expiryMinutes) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MehandiGo Verification Code</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f7f9fc;
          margin: 0;
          padding: 0;
          color: #333333;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }
        .header {
          background: linear-gradient(135deg, #F7146B, #C20E53);
          padding: 30px 20px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #555555;
          text-align: left;
        }
        .instructions {
          font-size: 16px;
          color: #666666;
          margin-bottom: 30px;
          line-height: 1.5;
          text-align: left;
        }
        .otp-container {
          background: #fff0f5;
          border: 2px dashed #F7146B;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          display: inline-block;
        }
        .otp-code {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 6px;
          color: #F7146B;
          margin: 0;
        }
        .expiry {
          font-size: 14px;
          color: #999999;
          margin-top: 15px;
        }
        .security-notice {
          font-size: 13px;
          color: #e03131;
          background: #fff5f5;
          border-left: 4px solid #fa5252;
          padding: 12px;
          margin-top: 30px;
          border-radius: 4px;
          text-align: left;
        }
        .footer {
          background-color: #fafbfc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #aaaaaa;
          border-top: 1px solid #eeeeee;
        }
        .footer a {
          color: #F7146B;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MehandiGo</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name},</div>
          <div class="instructions">
            Thank you for choosing MehandiGo. Use the verification code below to complete your sign-in or registration request.
          </div>
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">
            This verification code is valid for <strong>${expiryMinutes} minutes</strong>.
          </div>
          <div class="security-notice">
            <strong>Security Warning:</strong> If you did not request this verification code, please ignore this email or contact support. Never share this code with anyone.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 MehandiGo. All rights reserved.<br>
          For support, visit <a href="mailto:support@mehndigo.com">support@mehndigo.com</a>.
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail(to, subject, body, html = null) {
  try {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!transporter && user && pass) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass,
        },
      });
    }

    if (!transporter) {
      console.log(`[Email Mock] To: ${to} | Subject: ${subject} | Body: ${body}`);
      return { mock: true, to, subject, body, html };
    }
    
    const mailOptions = {
      from: user,
      to,
      subject,
      text: body,
      html: html || undefined,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Nodemailer failed, falling back to mock:", error.message);
    return { mock: true, to, subject, body, html, error: error.message };
  }
}

async function sendOtpEmail(to, otp, name = "User", expiryMinutes = 5) {
  const subject = "MehandiGo - Your Verification Code";
  const body = `Hello ${name},\n\nYour MehandiGo verification code is: ${otp}. It will expire in ${expiryMinutes} minutes.\n\nIf you did not request this, please ignore this email.`;
  const html = generateOtpHtml(otp, name, expiryMinutes);
  return await sendEmail(to, subject, body, html);
}

module.exports = {
  sendEmail,
  sendOtpEmail,
};
