---
description: Workarounds for running Cloudflare Wrangler commands in non-interactive terminals.
---

# Cloudflare Wrangler Deployments

When running `npx wrangler deploy` or other wrangler commands that require authentication on behalf of the user, the command may fail with an error stating that `CLOUDFLARE_API_TOKEN` is required because it detects a non-interactive environment (CI).

If the user is already logged in locally via OAuth (`npx wrangler whoami` succeeds), you MUST bypass this CI check by explicitly setting the `CI` environment variable to `false` in your run_command invocation.

**Example for Windows (PowerShell):**
`$env:CI="false"; npx wrangler deploy`

**Example for Mac/Linux (Bash):**
`CI=false npx wrangler deploy`
