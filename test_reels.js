const https = require("https");

const token = ""; // We might get 401 without token, but let's try.

const options = {
  hostname: 'api.mehndigo.in',
  port: 443,
  path: '/api/v1/customer/reels?page=1&limit=10',
  method: 'GET',
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    try {
        console.log("Response:", JSON.stringify(JSON.parse(data), null, 2));
    } catch(e) {
        console.log("Raw Response:", data);
    }
  });
});

req.on('error', (e) => {
  console.error("Error:", e);
});
req.end();
