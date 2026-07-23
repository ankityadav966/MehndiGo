const https = require("https");

// Native HTTPS post request helper
function postRequest(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (e) {
          resolve(responseBody);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * Dispatch push notifications via Expo Push API
 * @param {string|string[]} tokens - Single token or array of ExponentPushToken[...]
 * @param {string} title - Title of the notification
 * @param {string} body - Body content message
 * @param {object} data - Deep linking navigation metadata payload
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
  const validTokens = tokenArray.filter(t => t && t.startsWith("ExponentPushToken"));

  if (validTokens.length === 0) {
    console.log("No valid Expo Push tokens found to send notifications");
    return null;
  }

  // Segment requests: Expo push API accepts a maximum of 100 messages per request
  const chunks = [];
  const chunkSize = 100;
  for (let i = 0; i < validTokens.length; i += chunkSize) {
    chunks.push(validTokens.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    const payload = chunk.map(token => ({
      to: token,
      title,
      body,
      sound: "default",
      badge: 1,
      data: {
        ...data,
        title,
        message: body,
      }
    }));

    try {
      const response = await postRequest(
        "https://exp.host/--/api/v2/push/send",
        {},
        payload
      );
      results.push(response);
    } catch (err) {
      console.error("Error sending push notifications chunk via Expo:", err.message);
      results.push({ error: err.message });
    }
  }

  return results;
}

module.exports = {
  sendPushNotification
};
