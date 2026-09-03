# Official Domains and Deep Linking Rule

## 1. Canonical Domains
Only two domains are valid and active for the MehndiGo platform:
- **Primary Website / Landing Page:** `https://mehndigo.in`
- **Backend API:** `https://api.mehndigo.in`

## 2. Prohibited Inactive Domains
The following domains are inactive, do not resolve correctly, or are legacy typos. They must **NEVER** be added to `SUPPORTED_DOMAINS`, `prefixes`, `intentFilters`, CORS lists, or `wrangler.toml` routes:
- `www.mehndigo.in` (no www subdomain exists)
- `mehendigoo.com`
- `www.mehendigoo.com`
- `mehendigo.app`
- `www.mehendigo.app`

## 3. Android App Links & Digital Asset Links Verification
To ensure Google Play Console domain verification succeeds without link failures:
- Both `https://mehndigo.in/.well-known/assetlinks.json` and `https://api.mehndigo.in/.well-known/assetlinks.json` MUST be maintained and publicly accessible with HTTP 200 and `Content-Type: application/json`.
- The `assetlinks.json` target MUST be `com.sonuy123.mehendigoo` and include the production Google Play App Signing key certificate fingerprints:
  - `2D:A0:9F:27:7C:F9:F3:E4:43:6B:9E:15:B8:29:B0:B1:8B:0B:27:04:E4:E0:47:F8:CD:00:BF:2A:50:C4:CF:44`
  - `16:16:45:6A:B3:8F:70:D5:F1:B8:CD:73:B8:69:87:AE:AB:B6:0A:F1:94:A0:71:8B:69:C0:B1:98:53:2C:40:20`
  - `45:79:35:68:72:A3:CA:98:82:7F:E1:57:43:99:42:8B:69:50:FD:C2:9E:58:3F:E5:CA:D7:73:14:23:DF:DF:54`
  along with local/upload key fingerprints.
