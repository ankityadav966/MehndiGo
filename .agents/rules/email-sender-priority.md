# MehndiGo Email Sender Priority

When modifying or creating email dispatch logic in the MehndiGo backend (Express or Cloudflare Worker):
1. **Primary Sender**: Always configure **Azure Email Communication Services** (`donotreply@mehndigo.in`) as the primary sender.
2. **Fallback Sequence**: Configure Gmail SMTP (`mehendigo@gmail.com` / `sonudonyadav87@gmail.com`) or Resend API strictly as fallback mechanisms, executing only if the primary Azure dispatch fails or is unconfigured.
3. **Anti-Spoofing**: Do NOT attempt to spoof the `From:` header as `donotreply@mehndigo.in` when dispatching via the fallback Gmail SMTP service, as this will trigger DMARC/SPF bounces (Message blocked).
