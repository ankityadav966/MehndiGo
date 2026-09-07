# MehndiGo Backend Architecture

When working on the MehndiGo backend, strictly adhere to the following architecture rules:

1. **Environment & Framework**: The backend is a Cloudflare Worker built with Hono (entrypoint: `backend/src/index.js`). Deployments are handled via `npx wrangler deploy`.
2. **Database Connectivity (D1)**: The database is Cloudflare D1. When adding or modifying routes, the database MUST be instantiated using `const db = getDb(c.env);` (where `c` is the Hono context). Do NOT use `getDb(c)`.
3. **Executing Ad-hoc Scripts on Production**: Do NOT write local Node.js or Sequelize scripts (e.g., in a `scratch/` folder) to interact with production data or trigger workflows (like push notifications), as this will only affect the local SQLite database. 
   - *Alternative*: To execute complex logic on production (like broadcasting notifications), inject a temporary secure endpoint into `index.js`, deploy to Cloudflare, invoke it via HTTP request (`Invoke-RestMethod` / `curl`), and then remove the endpoint.
4. **Push Notifications**: Push notifications are handled via `dispatchNotification(db, { userId, title, body, type })` located in `notification_service.js`.
