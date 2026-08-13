require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");

let gmailTransporter = null;

// ============================================================
// CONFIG
// ============================================================

const EMAIL_USER = (process.env.EMAIL_USER || "sonudonyadav87@gmail.com").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "kwemkkniwxyohmvm").replace(/\s+/g, "");

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

// Production sender.
// This domain MUST be verified in Resend and have SPF/DKIM configured.
const EMAIL_FROM =
  process.env.EMAIL_FROM || "MehndiGo <noreply@mehndigo.in>";

const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO || "support@mehndigo.in";

const EMAIL_PROVIDER =
  process.env.EMAIL_PROVIDER || "gmail";

// ============================================================
// BASIC EMAIL VALIDATION
// ============================================================

function isValidEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const value = email.trim();

  if (!value || value.length > 254) {
    return false;
  }

  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    value
  );
}

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// SECURE OTP GENERATOR
// ============================================================

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

// ============================================================
// OTP EMAIL HTML
// ============================================================

function generateOtpHtml(
  otp,
  name = "User",
  expiryMinutes = 5
) {
  const safeName = escapeHtml(name);
  const safeOtp = escapeHtml(otp);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>MehndiGo Verification Code</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f7f9fc;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #333333;
    }

    .wrapper {
      width: 100%;
      padding: 30px 0;
      background: #f7f9fc;
    }

    .container {
      width: 90%;
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #eeeeee;
    }

    .header {
      background: #E91E63;
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }

    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }

    .content {
      padding: 35px 30px;
    }

    .greeting {
      font-size: 18px;
      margin-bottom: 18px;
    }

    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #666666;
    }

    .otp-box {
      margin: 30px auto;
      padding: 20px;
      text-align: center;
      background: #fff1f6;
      border: 2px dashed #E91E63;
      border-radius: 12px;
      max-width: 260px;
    }

    .otp {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #E91E63;
    }

    .expiry {
      text-align: center;
      color: #777777;
      font-size: 14px;
      margin-top: 15px;
    }

    .security {
      margin-top: 28px;
      padding: 14px;
      background: #fff7f7;
      border-left: 4px solid #e03131;
      color: #555555;
      font-size: 13px;
      line-height: 1.5;
    }

    .footer {
      padding: 20px;
      text-align: center;
      background: #fafafa;
      border-top: 1px solid #eeeeee;
      color: #999999;
      font-size: 12px;
    }

    .footer a {
      color: #E91E63;
      text-decoration: none;
    }
  </style>
</head>

<body>

  <div class="wrapper">

    <div class="container">

      <div class="header">
        <h1>MehndiGo</h1>
      </div>

      <div class="content">

        <div class="greeting">
          Hello ${safeName},
        </div>

        <div class="message">
          Thank you for choosing MehndiGo.
          Use the verification code below to complete
          your sign-in or registration request.
        </div>

        <div class="otp-box">
          <div class="otp">
            ${safeOtp}
          </div>
        </div>

        <div class="expiry">
          This verification code is valid for
          <strong>${expiryMinutes} minutes</strong>.
        </div>

        <div class="security">
          <strong>Security Notice:</strong>
          If you did not request this verification code,
          please ignore this email.
          Never share your OTP with anyone.
        </div>

      </div>

      <div class="footer">
        &copy; 2026 MehndiGo. All rights reserved.
        <br>
        Support:
        <a href="mailto:${EMAIL_REPLY_TO}">
          ${EMAIL_REPLY_TO}
        </a>
      </div>

    </div>

  </div>

</body>
</html>
`;
}

// ============================================================
// GMAIL TRANSPORTER
// ============================================================

function getGmailTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER or EMAIL_PASS is not configured."
    );
  }

  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,

      pool: true,

      maxConnections: 3,
      maxMessages: 50,

      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,

      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  return gmailTransporter;
}

// ============================================================
// VERIFY GMAIL CONNECTION
// ============================================================

async function verifyGmailTransporter() {
  const transporter = getGmailTransporter();

  await transporter.verify();

  console.log(
    "✅ Gmail SMTP transporter verified successfully."
  );

  return true;
}

// ============================================================
// SEND USING GMAIL SMTP
// ============================================================

async function sendUsingGmail(
  to,
  subject,
  text,
  html
) {
  const transporter = getGmailTransporter();

  const messageId = `<otp.${Date.now()}.${crypto
    .randomBytes(8)
    .toString("hex")}@mehndigo.in>`;

  const mailOptions = {
    from: EMAIL_FROM,
    to,

    replyTo: EMAIL_REPLY_TO,

    subject,

    text,

    html,

    messageId,

    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
    },
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(
    `✅ Gmail SMTP accepted email for ${to}`
  );

  console.log(
    `Message ID: ${info.messageId || messageId}`
  );

  console.log(
    `Accepted: ${
      Array.isArray(info.accepted)
        ? info.accepted.join(", ")
        : "yes"
    }`
  );

  if (
    Array.isArray(info.rejected) &&
    info.rejected.length > 0
  ) {
    throw new Error(
      `Recipient rejected by Gmail SMTP: ${info.rejected.join(
        ", "
      )}`
    );
  }

  return {
    success: true,

    provider: "gmail",

    messageId:
      info.messageId || messageId,

    accepted: info.accepted || [to],

    rejected: info.rejected || [],
  };
}

// ============================================================
// SEND USING RESEND
// ============================================================

async function sendUsingResend(
  to,
  subject,
  text,
  html
) {
  if (!RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        from: EMAIL_FROM,

        to: [to],

        reply_to: EMAIL_REPLY_TO,

        subject,

        text,

        html,
      }),
    }
  );

  const responseText =
    await response.text();

  let data = {};

  try {
    data = JSON.parse(responseText);
  } catch {
    data = {
      raw: responseText,
    };
  }

  if (!response.ok) {
    throw new Error(
      `Resend API ${response.status}: ${
        data?.message ||
        data?.error ||
        responseText
      }`
    );
  }

  if (!data?.id) {
    throw new Error(
      "Resend accepted the request but did not return a message ID."
    );
  }

  console.log(
    `✅ Resend accepted email for ${to}`
  );

  console.log(
    `Resend Message ID: ${data.id}`
  );

  return {
    success: true,

    provider: "resend",

    messageId: data.id,

    accepted: [to],

    rejected: [],
  };
}

// ============================================================
// GENERIC EMAIL SERVICE
// ============================================================

async function sendEmail(
  to,
  subject,
  body,
  html = null
) {
  // ----------------------------------------------------------
  // Validate recipient
  // ----------------------------------------------------------

  if (!isValidEmail(to)) {
    throw new Error(
      "Invalid recipient email address."
    );
  }

  if (!subject) {
    throw new Error(
      "Email subject is required."
    );
  }

  if (!body) {
    throw new Error(
      "Email body is required."
    );
  }

  const finalHtml =
    html || `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`;

  // ----------------------------------------------------------
  // Provider selection
  // ----------------------------------------------------------

  const errors = [];

  // ==========================================================
  // PRIMARY PROVIDER
  // ==========================================================

  if (
    EMAIL_PROVIDER === "resend"
  ) {
    try {
      return await sendUsingResend(
        to,
        subject,
        body,
        finalHtml
      );
    } catch (error) {
      console.error(
        `❌ Resend primary failed for ${to}:`,
        error.message
      );

      errors.push(
        `Resend: ${error.message}`
      );
    }

    // Try Gmail fallback
    if (EMAIL_USER && EMAIL_PASS) {
      try {
        console.log(
          `🔄 Trying Gmail fallback for ${to}...`
        );

        return await sendUsingGmail(
          to,
          subject,
          body,
          finalHtml
        );
      } catch (error) {
        console.error(
          `❌ Gmail fallback failed for ${to}:`,
          error.message
        );

        errors.push(
          `Gmail: ${error.message}`
        );
      }
    }
  }

  // ==========================================================
  // GMAIL PRIMARY
  // ==========================================================

  else {
    if (EMAIL_USER && EMAIL_PASS) {
      try {
        return await sendUsingGmail(
          to,
          subject,
          body,
          finalHtml
        );
      } catch (error) {
        console.error(
          `❌ Gmail primary failed for ${to}:`,
          error.message
        );

        errors.push(
          `Gmail: ${error.message}`
        );
      }
    }

    // --------------------------------------------------------
    // Resend fallback
    // --------------------------------------------------------

    if (RESEND_API_KEY) {
      try {
        console.log(
          `🔄 Trying Resend fallback for ${to}...`
        );

        return await sendUsingResend(
          to,
          subject,
          body,
          finalHtml
        );
      } catch (error) {
        console.error(
          `❌ Resend fallback failed for ${to}:`,
          error.message
        );

        errors.push(
          `Resend: ${error.message}`
        );
      }
    }
  }

  // ==========================================================
  // NEVER RETURN MOCK SUCCESS
  // ==========================================================

  throw new Error(
    `Unable to send email to ${to}. ${errors.join(
      " | "
    )}`
  );
}

// ============================================================
// OTP EMAIL
// ============================================================

async function sendOtpEmail(
  to,
  otp,
  name = "User",
  expiryMinutes = 5
) {
  // ----------------------------------------------------------
  // Validate recipient
  // ----------------------------------------------------------

  if (!isValidEmail(to)) {
    throw new Error(
      "Invalid recipient email address."
    );
  }

  // ----------------------------------------------------------
  // Validate OTP
  // ----------------------------------------------------------

  if (
    typeof otp !== "string" &&
    typeof otp !== "number"
  ) {
    throw new Error(
      "Invalid OTP."
    );
  }

  const otpString = String(otp);

  if (!/^\d{6}$/.test(otpString)) {
    throw new Error(
      "OTP must be exactly 6 digits."
    );
  }

  // ----------------------------------------------------------
  // Subject
  // ----------------------------------------------------------

  const subject =
    "MehndiGo - Your Verification Code";

  // ----------------------------------------------------------
  // Plain text
  // ----------------------------------------------------------

  const body = `
Hello ${name},

Your MehndiGo verification code is:

${otpString}

This code is valid for ${expiryMinutes} minutes.

If you did not request this verification code,
please ignore this email.

Never share this code with anyone.

Thanks,
MehndiGo Team
`.trim();

  // ----------------------------------------------------------
  // HTML
  // ----------------------------------------------------------

  const html = generateOtpHtml(
    otpString,
    name,
    expiryMinutes
  );

  // ----------------------------------------------------------
  // Send
  // ----------------------------------------------------------

  const result = await sendEmail(
    to,
    subject,
    body,
    html
  );

  return result;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  sendEmail,
  sendOtpEmail,
  generateOtp,
  verifyGmailTransporter,
  isValidEmail,
};