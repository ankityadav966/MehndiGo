require("dotenv").config();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { EmailClient } = require("@azure/communication-email");

let gmailTransporter = null;
let azureEmailClient = null;

// ============================================================
// CONFIG
// ============================================================

const AZURE_EMAIL_CONNECTION_STRING = (
  process.env.AZURE_EMAIL_CONNECTION_STRING ||
  "AZURE_KEY_REMOVED"
).trim();

const AZURE_EMAIL_FROM = (
  process.env.AZURE_EMAIL_FROM ||
  process.env.EMAIL_FROM ||
  "donotreply@mehndigo.in"
).trim();

const EMAIL_USER = (process.env.EMAIL_USER || "mehendigo@gmail.com").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "zgibsuiprjnapudd").replace(/\s+/g, "");

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const EMAIL_FROM =
  process.env.EMAIL_FROM || "MehndiGo <donotreply@mehndigo.in>";

const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO || "mehendigo@gmail.com";

const EMAIL_PROVIDER =
  (process.env.EMAIL_PROVIDER || "gmail").toLowerCase().trim();

// Initialize Azure Email Client
function getAzureEmailClient() {
  if (!azureEmailClient && AZURE_EMAIL_CONNECTION_STRING) {
    try {
      azureEmailClient = new EmailClient(AZURE_EMAIL_CONNECTION_STRING);
    } catch (e) {
      console.error("[AZURE EMAIL CLIENT INIT ERROR]:", e.message);
    }
  }
  return azureEmailClient;
}

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
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
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
    from: `"MehndiGo" <${AZURE_EMAIL_FROM || "donotreply@mehndigo.in"}>`,
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
    `Accepted: ${Array.isArray(info.accepted)
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
      `Resend API ${response.status}: ${data?.message ||
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
// AZURE COMMUNICATION SERVICES EMAIL
// ============================================================

async function sendUsingAzure(to, subject, body, html = null) {
  if (!AZURE_EMAIL_CONNECTION_STRING) {
    throw new Error("Missing AZURE_EMAIL_CONNECTION_STRING in environment variables.");
  }

  const finalHtml = html || `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`;
  const plainText = body || subject;

  // Try Azure SDK first
  try {
    const client = getAzureEmailClient();
    if (client) {
      const message = {
        senderAddress: AZURE_EMAIL_FROM,
        content: {
          subject: subject,
          plainText: plainText,
          html: finalHtml
        },
        recipients: {
          to: [
            {
              address: to
            }
          ]
        },
        replyTo: [
          {
            address: EMAIL_REPLY_TO
          }
        ]
      };

      const poller = await client.beginSend(message);
      const result = await poller.pollUntilDone();

      console.log(`[AZURE EMAIL DELIVERED] Recipient: ${to} | ID: ${result?.id || "N/A"}`);
      return {
        success: true,
        provider: "azure",
        messageId: result?.id || "azure-ok",
        accepted: [to],
        rejected: []
      };
    }
  } catch (sdkError) {
    console.warn(`[AZURE SDK WARNING] Trying direct REST API fallback for ${to}:`, sdkError.message);
  }

  // Fallback to Azure Direct REST API
  const endpointMatch = AZURE_EMAIL_CONNECTION_STRING.match(/endpoint=([^;]+)/i);
  const keyMatch = AZURE_EMAIL_CONNECTION_STRING.match(/accesskey=([^;]+)/i);

  const endpoint = endpointMatch ? endpointMatch[1].replace(/\/$/, "") : "https://edvice-email-service.india.communication.azure.com";
  const accessKey = keyMatch ? keyMatch[1] : "";
  const host = new URL(endpoint).host;
  const pathAndQuery = "/emails:send?api-version=2023-03-31";
  const url = `${endpoint}${pathAndQuery}`;

  const bodyObj = {
    senderAddress: AZURE_EMAIL_FROM,
    content: {
      subject: subject,
      plainText: plainText,
      html: finalHtml
    },
    recipients: {
      to: [
        {
          address: to
        }
      ]
    },
    replyTo: [
      {
        address: EMAIL_REPLY_TO
      }
    ]
  };

  const bodyStr = JSON.stringify(bodyObj);
  const contentHash = crypto.createHash("sha256").update(bodyStr, "utf8").digest("base64");
  const xMsDate = new Date().toUTCString();
  const stringToSign = `POST\n${pathAndQuery}\n${xMsDate};${host};${contentHash}`;

  const keyBytes = Buffer.from(accessKey, "base64");
  const signature = crypto.createHmac("sha256", keyBytes).update(stringToSign, "utf8").digest("base64");
  const authHeader = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ms-date": xMsDate,
      "x-ms-content-sha256": contentHash,
      "Authorization": authHeader,
      "Repeatability-Request-Id": crypto.randomUUID(),
      "Repeatability-First-Sent": xMsDate
    },
    body: bodyStr
  });

  if (!res.ok && res.status !== 202) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Azure REST Email API failed with HTTP ${res.status}: ${errBody}`);
  }

  const resData = await res.json().catch(() => ({}));
  console.log(`[AZURE REST EMAIL DELIVERED] Recipient: ${to} | ID: ${resData?.id || "N/A"}`);
  return {
    success: true,
    provider: "azure_rest",
    messageId: resData?.id || "azure-ok",
    accepted: [to],
    rejected: []
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

  const errors = [];

  // ==========================================================
  // PROVIDER ROUTING (GMAIL SMTP / AZURE / RESEND)
  // ==========================================================

  if (EMAIL_PROVIDER === "gmail" && EMAIL_USER && EMAIL_PASS) {
    try {
      return await sendUsingGmail(to, subject, body, finalHtml);
    } catch (error) {
      console.error(`❌ Gmail SMTP failed for ${to}:`, error.message);
      errors.push(`Gmail: ${error.message}`);
    }
  }

  if (AZURE_EMAIL_CONNECTION_STRING && AZURE_EMAIL_CONNECTION_STRING !== "AZURE_KEY_REMOVED") {
    try {
      return await sendUsingAzure(to, subject, body, finalHtml);
    } catch (error) {
      console.error(`❌ Azure Email failed for ${to}:`, error.message);
      errors.push(`Azure: ${error.message}`);
    }
  }

  if (EMAIL_USER && EMAIL_PASS) {
    try {
      console.log(`🔄 Trying Gmail fallback for ${to}...`);
      return await sendUsingGmail(to, subject, body, finalHtml);
    } catch (error) {
      console.error(`❌ Gmail fallback failed for ${to}:`, error.message);
      errors.push(`Gmail: ${error.message}`);
    }
  }

  // ==========================================================
  // FALLBACK 2: RESEND
  // ==========================================================

  if (RESEND_API_KEY) {
    try {
      console.log(`🔄 Trying Resend fallback for ${to}...`);
      return await sendUsingResend(to, subject, body, finalHtml);
    } catch (error) {
      console.error(`❌ Resend fallback failed for ${to}:`, error.message);
      errors.push(`Resend: ${error.message}`);
    }
  }

  throw new Error(
    `Unable to send email to ${to}. ${errors.join(" | ")}`
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