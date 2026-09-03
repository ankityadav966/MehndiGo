const fs = require('fs');

const filePath = 'src/index.js';
let content = fs.readFileSync(filePath, 'utf8');

const testEmailOld = `    try {
      logs.push(\`Initiating direct SMTP dispatch to \${to}...\`);
      const isSmtpSent = await sendCustomSmtpDirect(
        c,
        to,
        "MehndiGo SMTP Verification - Doorstep OTP Service",
        "Doorstep Check-In PIN: 4829",
        "<h1>MehndiGo Email Verification</h1><p>Doorstep OTP Service is fully active from <b>donotreply@mehndigo.in</b>.</p>"
      );
  
      if (isSmtpSent) {
        logs.push("SMTP Email successfully accepted and dispatched!");
        return c.json({ success: true, message: \`Email dispatched successfully to \${to} from donotreply@mehndigo.in\`, provider: "gmail_smtp", logs });
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
        return c.json({ success: true, message: \`Azure Email dispatched successfully to \${to} from donotreply@mehndigo.in\`, provider: "azure", logs });
      }`;

const testEmailNew = `    try {
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
        return c.json({ success: true, message: \`Azure Email dispatched successfully to \${to} from donotreply@mehndigo.in\`, provider: "azure", logs });
      }

      logs.push(\`Azure dispatch returned false, trying direct SMTP dispatch to \${to}...\`);
      const isSmtpSent = await sendCustomSmtpDirect(
        c,
        to,
        "MehndiGo SMTP Verification - Doorstep OTP Service",
        "Doorstep Check-In PIN: 4829",
        "<h1>MehndiGo Email Verification</h1><p>Doorstep OTP Service is fully active from <b>donotreply@mehndigo.in</b>.</p>"
      );

      if (isSmtpSent) {
        logs.push("SMTP Email successfully accepted and dispatched!");
        return c.json({ success: true, message: \`Email dispatched successfully to \${to} from donotreply@mehndigo.in\`, provider: "gmail_smtp", logs });
      }`;

content = content.replace(testEmailOld, testEmailNew);

const pattern = /(\/\/ 1\. Primary: Direct SMTP Delivery from donotreply@mehndigo\.in\n\s+try \{\n\s+const smtpSent = await sendCustomSmtpDirect[\s\S]+?\}\n\s+\} catch \(err\) \{\n\s+console\.log[^\}]+\}\n\s+\})\n\n\s+(\/\/ 2\. Azure Email Communication Service \(If configured\)\n\s+if \(c\?\.env\?\.AZURE_EMAIL_CONNECTION_STRING\) \{\n\s+try \{\n\s+const azureResult = await sendAzureEmailWorkerDirect[\s\S]+?\}\n\s+\} else \{\n\s+console\.log[^\}]+\}\n\s+\} catch \(err\) \{\n\s+console\.log[^\}]+\}\n\s+\})/g;

content = content.replace(pattern, (match, smtpBlock, azureBlock) => {
  const newAzure = azureBlock.replace("// 2. Azure Email Communication Service", "// 1. Primary: Azure Email Communication Service");
  const newSmtp = smtpBlock.replace("// 1. Primary: Direct SMTP Delivery", "// 2. Fallback: Direct SMTP Delivery");
  return `${newAzure}\n\n  ${newSmtp}`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done replacing.");
