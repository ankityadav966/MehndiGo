# API Routing and Base URL Guidelines

## 1. Frontend Base URL Normalization
- `getBaseUrl()` in `frontend/src/services/api.js` MUST normalize `import.meta.env.VITE_API_URL`.
- If `VITE_API_URL` ends with trailing `/mehndigo`, it must be trimmed so endpoint paths (e.g. `/admin/coupon/:id`) resolve to `https://api.mehndigo.in/api/v1/admin/coupon/:id`.

## 2. Dual-Engine Backend Route Alias Matching
- Both Express (`server.js`) and Hono/Cloudflare Worker (`src/index.js`) must register path aliases for `/admin`, `/coupon`, `/artist`, `/customer`, `/user`.
- Route mounting in `server.js` and `addRoute` in `index.js` must include `/mehndigo/admin`, `/api/mehndigo/admin`, and `/api/v1/mehndigo/admin` prefixes alongside URL rewriting middleware to ensure zero 404 route breakages regardless of client prefix variants.
