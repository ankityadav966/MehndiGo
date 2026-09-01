import re

file_path = "src/index.js"
with open(file_path, "r", encoding="utf8") as f:
    content = f.read()

# Fix /test-email
test_email_old = """    try {
    logs.push(`Initiating direct SMTP dispatch to ${to}...`);
    const isSmtpSent = await sendCustomSmtpDirect(
      c,
      to,
      "MehndiGo SMTP Verification - Doorstep OTP Service",
      "Doorstep Check-In PIN: 4829",
      "<h1>MehndiGo Email Verification</h1><p>Doorstep OTP Service is fully active from <b>donotreply@mehndigo.in</b>.</p>"
    );

    if (isSmtpSent) {
      logs.push("SMTP Email successfully accepted and dispatched!");
      return c.json({ success: true, message: `Email dispatched successfully to ${to} from donotreply@mehndigo.in`, provider: "gmail_smtp", logs });
    }

    logs.push("SMTP dispatch returned false, trying Azure...");
    const isAzureSent = await sendAzureEmailWorkerDirect(
      c,
      to,
      "MehndiGo Azure Email Service Verification",
      "<h1>MehndiGo Email Verification</h1><p>Azure Email Communication Services is fully active from <b>donotreply@mehndigo.in</b>.</p>",
      "Azure Email Communication Services is fully active from donotreply@mehndigo.in."
    );

    if (isAzureSent) {
      logs.push("Azure Email successfully accepted and dispatched!");
      return c.json({ success: true, message: `Azure Email dispatched successfully to ${to} from donotreply@mehndigo.in`, provider: "azure", logs });
    }"""

test_email_new = """    try {
    logs.push("Initiating Azure Email dispatch...");
    const isAzureSent = await sendAzureEmailWorkerDirect(
      c,
      to,
      "MehndiGo Azure Email Service Verification",
      "<h1>MehndiGo Email Verification</h1><p>Azure Email Communication Services is fully active from <b>donotreply@mehndigo.in</b>.</p>",
      "Azure Email Communication Services is fully active from donotreply@mehndigo.in."
    );

    if (isAzureSent) {
      logs.push("Azure Email successfully accepted and dispatched!");
      return c.json({ success: true, message: `Azure Email dispatched successfully to ${to} from donotreply@mehndigo.in`, provider: "azure", logs });
    }

    logs.push(`Azure dispatch returned false, trying direct SMTP dispatch to ${to}...`);
    const isSmtpSent = await sendCustomSmtpDirect(
      c,
      to,
      "MehndiGo SMTP Verification - Doorstep OTP Service",
      "Doorstep Check-In PIN: 4829",
      "<h1>MehndiGo Email Verification</h1><p>Doorstep OTP Service is fully active from <b>donotreply@mehndigo.in</b>.</p>"
    );

    if (isSmtpSent) {
      logs.push("SMTP Email successfully accepted and dispatched!");
      return c.json({ success: true, message: `Email dispatched successfully to ${to} from donotreply@mehndigo.in`, provider: "gmail_smtp", logs });
    }"""

content = content.replace(test_email_old, test_email_new)

# Function to swap SMTP and Azure in the email sending functions
def swap_logic(match):
    smtp_block = match.group(1)
    azure_block = match.group(2)
    
    # Replace headers
    new_azure = azure_block.replace("// 2. Azure Email Communication Service", "// 1. Primary: Azure Email Communication Service")
    new_smtp = smtp_block.replace("// 1. Primary: Direct SMTP Delivery", "// 2. Fallback: Direct SMTP Delivery")
    
    return f"{new_azure}\n\n  {new_smtp}"

pattern = r"(// 1\. Primary: Direct SMTP Delivery from donotreply@mehndigo\.in\n\s+try \{\n\s+const smtpSent = await sendCustomSmtpDirect[^\}]+\}\n\s+\} catch \(err\) \{\n\s+console\.log[^\}]+\}\n\s+\})\n\n\s+(// 2\. Azure Email Communication Service \(If configured\)\n\s+if \(c\?\.env\?\.AZURE_EMAIL_CONNECTION_STRING\) \{\n\s+try \{\n\s+const azureResult = await sendAzureEmailWorkerDirect[^\}]+\}\n\s+\} else \{\n\s+console\.log[^\}]+\}\n\s+\} catch \(err\) \{\n\s+console\.log[^\}]+\}\n\s+\})"

content = re.sub(pattern, swap_logic, content, flags=re.MULTILINE)

with open(file_path, "w", encoding="utf8") as f:
    f.write(content)

print("Done replacing.")
