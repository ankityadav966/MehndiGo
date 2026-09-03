/**
 * Direct Firebase Cloud Messaging (FCM HTTP v1) Service for Cloudflare Worker & Node.js
 * Uses standard Web Crypto API (RS256) for zero-dependency OAuth2 token generation.
 */

const FIREBASE_CONFIG = {
  projectId: "mehndigo-87331",
  clientEmail: "firebase-adminsdk-fbsvc@mehndigo-87331.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC+433fAQjKjnyT
R5ujAjZvoHOHuSSGfU5gvRIZCHbSq1p+rIJd11Zp8R71M1HP24ZIpyzjHoVI8+20
kFCD79z2RdqdHlseZJ6t9P2Y31hFIzlfRRlR1GJO/S9gHsdosoUgwRPYDmjW7VZx
Ig46c8LGEJUDkO91NbcLB3DkacXgRUJ7s9B5uK38VBZMNfsEnGd8zwIy6ob5nt4V
nAIQkvvdotO+T9ja2gGhKpScN+oiQc6qvACHZ1YqaRER8CP78OYh0WApvSz1V1sp
g0fov+6FFpYG5RvUvS7j1Ux1ZA+Yuz+x3G4nAL2IlqVQEQXG1xOKHCx+ShYnGLrn
D7dKPVDvAgMBAAECggEAAIESUb0rdd/nEiG3MAWIxkYauAONrKTdFaIgnGjqadQ8
PEE3yohC+RGpeF7tbhdq2EgUwfhp94J2Ol4qA3pmArW2Us7qauVu8KlI5P2S1DZR
58YDcwHIGeRPGtMwYwu03U+VPiKMaIqE8KFbf0NtNflQo3GsQdd/LcWUKNsWQ8+t
DOageg2ObqTOlLExPs1lKJpdMRKIxBW6Gx5krCcKrEhi7qfmLsBuxWalH3E5Z7vE
eu2I8XcstgfwHVsiBVoGgHCDGO7PMrU33YLCUP0zVfCAyHZgndxfQmv8KsUNaXXq
iXrpbnK7Rj5fgyMLLIpbRKuwP2+4vSMtWc52JovhlQKBgQDqmOYUL4gQzQPaFAtY
T4TdKS81bHRuQWpPN8IyeZmnkvGOy7QXPAZ5eI1luXMfB+D4U1y57uEz5Ax7VaPz
m4Ol2Fg5DGLeVZeldCh+YhyElg/w9U1khT6eMxToZnqI+8K6IcCUNoQUMVJjgcKG
ECOj17jIuaFRy3B5gx8AO3W0/QKBgQDQTcNErO6tKCgeylKooYKr5phD6/zE1jza
hPgkQ4rRE3DqFG3aZBc7gEouUCOFgj0HASEOZXmZBfTYcYrH/PmrQ69f1qaSxsSh
QarnegrmseO1iSW5B1cMVi0bgq6xL8kNVSz9WDas7U5g/wcy+0cE4Qm9gGDtrigy
69WRCbRXWwKBgAKXddM7QzGMUkKSfh2Xo0weLFtWu2KMbnQ5lXehSEVFpk2BipfH
Hfsxjb5V8iOhnqafpSKYtPwxxMGIDKugSDAI19Cphl4Wa/pz8g6TXuVIEx0CWLyH
jE2LGuwGVcw1m80amloI0CS49sQKpu98NiiVNYFiK5oPuUpeXHVQMtixAoGAATyE
7TJtlD+JxW0EApY61VRgEP8kl/KBl/Z0FpsEBuurnugSItq3PJYtWosFOvSj8hey
n4hAqYTciDBcV4WL4dVcBCCdCn/9iMt//TG/QNFLfbdbrvZ5MMyOJfynlsum0Npx
kutkH7Ck53R8EXRmXoQLb8GEUcTX3j2CHgNFu8MCgYB7GF9avgnXwzim7Vaautjc
E/dsFm01G78Q9beX8zFbrcX1x2MplgazgEDStF6u0Eif0Pcb4gymyF9b9Vc8BELA
p1yAPQbU1OS1b9siltu4I4YlXgsHXHumqP61vMQMxXH5n1upCw6sq2MjOSvwA87E
7SSNDvv0eAfCZavFAn1ELA==
-----END PRIVATE KEY-----`
};

let cachedAccessToken = null;
let tokenExpiresAt = 0;

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64Url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64Url(binary);
}

/**
 * Generates an OAuth2 access token for Firebase Cloud Messaging using Web Crypto.
 */
async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 300) {
    return cachedAccessToken;
  }

  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(FIREBASE_CONFIG.privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64Url(
      JSON.stringify({
        iss: FIREBASE_CONFIG.clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${payload}`)
    );

    const jwt = `${header}.${payload}.${bufferToBase64Url(signature)}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google OAuth2 error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600);
    return cachedAccessToken;
  } catch (err) {
    console.error("[FCM v1] Error generating Google OAuth2 access token:", err);
    throw err;
  }
}

/**
 * Sends a notification directly to a single native FCM device token.
 */
export async function sendDirectFcmNotification(token, { title, body, data = {}, channelId = "default" }) {
  if (!token) return { success: false, error: "Empty token" };

  try {
    const accessToken = await getGoogleAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/messages:send`;

    // FCM requires all data values to be strings
    const stringData = {};
    if (data && typeof data === "object") {
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }

    const message = {
      token: token,
      notification: {
        title: title || "MehndiGo",
        body: body || "",
      },
      data: stringData,
      android: {
        priority: "HIGH",
        notification: {
          channel_id: channelId || "default",
          sound: "default",
          default_sound: true,
          default_vibrate_timings: true,
          notification_priority: "PRIORITY_HIGH",
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[FCM v1] Send failed for token (${res.status}):`, errorText);
      return { success: false, error: errorText, status: res.status };
    }

    const result = await res.json();
    console.log(`[FCM v1] Successfully sent message:`, result?.name || "OK");
    return { success: true, messageId: result?.name };
  } catch (err) {
    console.error(`[FCM v1] Exception sending FCM push notification:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends notifications to a batch of tokens.
 */
export async function sendBatchFcmNotifications(tokens, payload) {
  if (!tokens || tokens.length === 0) return [];
  const results = [];
  for (const token of tokens) {
    const res = await sendDirectFcmNotification(token, payload);
    results.push({ token, ...res });
  }
  return results;
}
