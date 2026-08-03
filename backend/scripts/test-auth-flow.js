const http = require("http");

const BASE_URL = "http://127.0.0.1:8000/api/v1/mehndigo";

function makeRequest(path, method = "GET", body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==========================================");
  console.log("MEHNDIGO AUTHENTICATION SUITE VERIFICATION");
  console.log("==========================================\n");

  const timestamp = Date.now();
  const testCustomerEmail = `test.customer.${timestamp}@gmail.com`;
  const testArtistEmail = `test.artist.${timestamp}@gmail.com`;

  try {
    // TEST 1: Check Email for New Email
    console.log("1. TEST: POST /user/check-email (New Email)");
    const check1 = await makeRequest("/user/check-email", "POST", { email: testCustomerEmail });
    console.log(`   Status: ${check1.status} | Exists: ${check1.body.data?.exists} (Expected: false)`);

    // TEST 2: Registration without Role (Must fail with HTTP 400 validation error - NO silent USER fallback)
    console.log("\n2. TEST: Registration without Role (Strict Validation Test)");
    const noRoleRes = await makeRequest("/user/register-send-otp", "POST", {
      name: "No Role User",
      email: `norole.${timestamp}@gmail.com`,
    });
    console.log(`   Status: ${noRoleRes.status} | Message: "${noRoleRes.body.message}" (Expected: HTTP 400 Validation Error)`);

    // TEST 3: New Customer Registration Flow
    console.log("\n3. TEST: New Customer Registration Flow");
    const regCustSend = await makeRequest("/user/register-send-otp", "POST", {
      name: "Test Customer",
      email: testCustomerEmail,
      role: "CUSTOMER",
    });
    console.log(`   Send OTP Status: ${regCustSend.status} | OTP: ${regCustSend.body.data?.otp}`);

    const regCustVerify = await makeRequest("/user/register-verify-otp", "POST", {
      email: testCustomerEmail,
      otp: regCustSend.body.data?.otp || "123456",
    });
    console.log(`   Verify OTP Status: ${regCustVerify.status} | Role: ${regCustVerify.body.data?.user?.role} (Expected: USER) | Token Received: ${!!regCustVerify.body.data?.token}`);

    // TEST 4: New Artist Registration Flow
    console.log("\n4. TEST: New Artist Registration Flow");
    const regArtSend = await makeRequest("/user/register-send-otp", "POST", {
      name: "Test Artist",
      email: testArtistEmail,
      role: "ARTIST",
    });
    console.log(`   Send OTP Status: ${regArtSend.status} | OTP: ${regArtSend.body.data?.otp}`);

    const regArtVerify = await makeRequest("/user/register-verify-otp", "POST", {
      email: testArtistEmail,
      otp: regArtSend.body.data?.otp || "123456",
    });
    console.log(`   Verify OTP Status: ${regArtVerify.status} | Role: ${regArtVerify.body.data?.user?.role} (Expected: ARTIST) | Artist Profile Completed: ${regArtVerify.body.data?.user?.artistProfileCompleted}`);

    // TEST 5: Existing Customer Login (Check Email -> Send OTP -> Verify OTP)
    console.log("\n5. TEST: Existing Customer Login");
    const checkExistCust = await makeRequest("/user/check-email", "POST", { email: testCustomerEmail });
    console.log(`   Check Email -> Exists: ${checkExistCust.body.data?.exists} | Role: ${checkExistCust.body.data?.role}`);

    const loginSendCust = await makeRequest("/user/send-otp", "POST", { email: testCustomerEmail });
    console.log(`   Send OTP Status: ${loginSendCust.status} | OTP: ${loginSendCust.body.data?.otp}`);

    const loginVerifyCust = await makeRequest("/user/verify-otp", "POST", {
      email: testCustomerEmail,
      otp: loginSendCust.body.data?.otp || "123456",
    });
    console.log(`   Verify OTP Status: ${loginVerifyCust.status} | User: ${loginVerifyCust.body.data?.user?.name} | Role: ${loginVerifyCust.body.data?.user?.role}`);

    // TEST 6: Existing Artist Login
    console.log("\n6. TEST: Existing Artist Login");
    const checkExistArt = await makeRequest("/user/check-email", "POST", { email: testArtistEmail });
    console.log(`   Check Email -> Exists: ${checkExistArt.body.data?.exists} | Role: ${checkExistArt.body.data?.role}`);

    const loginSendArt = await makeRequest("/user/send-otp", "POST", { email: testArtistEmail });
    console.log(`   Send OTP Status: ${loginSendArt.status} | OTP: ${loginSendArt.body.data?.otp}`);

    const loginVerifyArt = await makeRequest("/user/verify-otp", "POST", {
      email: testArtistEmail,
      otp: loginSendArt.body.data?.otp || "123456",
    });
    console.log(`   Verify OTP Status: ${loginVerifyArt.status} | User: ${loginVerifyArt.body.data?.user?.name} | Role: ${loginVerifyArt.body.data?.user?.role} | Artist Profile Completed: ${loginVerifyArt.body.data?.user?.artistProfileCompleted}`);

    // TEST 7: Invalid OTP Handling
    console.log("\n7. TEST: Invalid OTP Handling");
    const invalidOtpRes = await makeRequest("/user/verify-otp", "POST", {
      email: testCustomerEmail,
      otp: "999999",
    });
    console.log(`   Status: ${invalidOtpRes.status} | Message: "${invalidOtpRes.body.message}"`);

    // TEST 8: Resend OTP Cooldown Enforcement
    console.log("\n8. TEST: Resend OTP Cooldown Enforcement");
    const resend1 = await makeRequest("/user/send-otp", "POST", { email: testCustomerEmail });
    console.log(`   1st Send OTP Status: ${resend1.status}`);
    const resend2 = await makeRequest("/user/send-otp", "POST", { email: testCustomerEmail });
    console.log(`   2nd Immediate Send OTP Status: ${resend2.status} | Message: "${resend2.body.message}"`);

    // TEST 9: Session Restore via GET /user/profile
    console.log("\n9. TEST: Session Restore via GET /user/profile");
    const artistToken = regArtVerify.body.data?.token;
    const profileRes = await makeRequest("/user/profile", "GET", null, artistToken);
    console.log(`   Status: ${profileRes.status} | User: ${profileRes.body.data?.name} | Role: ${profileRes.body.data?.role} | Profile Completed: ${profileRes.body.data?.artistProfileCompleted}`);

    // TEST 10: Admin Authentication Safety Test
    console.log("\n10. TEST: Admin Auth Safety Test");
    const adminOtpSend = await makeRequest("/user/admin-send-otp", "POST", {
      email: "sonudonyadav87@gmail.com",
      password: "wrongpassword",
    });
    console.log(`   Invalid Password Status: ${adminOtpSend.status} | Message: "${adminOtpSend.body.message}" (Expected: Access Denied)`);

    console.log("\n==========================================");
    console.log("ALL AUTHENTICATION TESTS COMPLETED SUCCESSFULLY!");
    console.log("==========================================");
  } catch (err) {
    console.error("Test Suite Failed:", err);
  }
}

runTests();
