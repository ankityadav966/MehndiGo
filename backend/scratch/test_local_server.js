const http = require("http");

const data = JSON.stringify({
  phone: "+919999999999",
  role: "USER",
  name: "Test User",
  email: "test@example.com"
});

const options = {
  hostname: "localhost",
  port: 8000,
  path: "/api/v1/mehndigo/user/send-otp",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length
  }
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
    process.exit(0);
  });
});

req.on("error", (error) => {
  console.error("Request Error:", error.message);
  process.exit(1);
});

req.write(data);
req.end();
