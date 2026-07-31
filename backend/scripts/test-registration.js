const UserService = require("../services/user.services");

async function testRegistration() {
  console.log("==========================================");
  console.log("Testing Registration & OTP Verification Flow");
  console.log("==========================================");

  const testUser = {
    name: "Agarwal Caterers",
    email: `test_caterer_${Date.now()}@gmail.com`,
    phone: null,
    role: "USER"
  };

  console.log("1. Sending registration OTP for:", testUser.email);
  const sendRes = await UserService.registerSendOtp(testUser);
  console.log("OTP Sent Result:", sendRes);

  console.log("2. Verifying OTP (using generated OTP:", sendRes.otp, ")...");
  const verifyRes = await UserService.registerVerifyOtp({
    email: testUser.email,
    otp: sendRes.otp
  });

  console.log("✅ REGISTRATION SUCCESSFUL!");
  console.log("Created User ID:", verifyRes.user.id);
  console.log("Created User Name:", verifyRes.user.name);
  console.log("Created User Email:", verifyRes.user.email);
  console.log("JWT Token generated:", verifyRes.token ? "YES" : "NO");
  process.exit(0);
}

testRegistration().catch(err => {
  console.error("❌ Registration test failed:", err);
  process.exit(1);
});
