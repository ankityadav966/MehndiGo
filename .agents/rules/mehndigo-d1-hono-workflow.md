# MehndiGo D1 & Hono Workflow Rules

## 1. Bypassing Broken D1 Migrations
When adding new tables or columns to the Cloudflare D1 local database, you would typically run `npx wrangler d1 migrations apply DB --local`. However, historical migrations (e.g., `0008`) may be broken and cause the command to fail.
- **Fallback:** If a migration fails due to unrelated missing tables, apply your schema changes directly by bypassing migrations:
  `npx wrangler d1 execute DB --local --command="CREATE TABLE IF NOT EXISTS..."`

## 2. Editing Hono Worker (index.js)
The `backend/src/index.js` file is very large and contains string literals with emojis (e.g., the promo push notifications).
- Large chunks of `replace_file_content` may fail due to UTF-8 encoding issues.
- **Workaround:** Make very small, targeted edits (e.g., targeting just the `export default app;` line at the very end of the file) rather than trying to replace large blocks of text that contain emojis.
