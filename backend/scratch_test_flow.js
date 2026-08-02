const UserService = require("./services/user.services");
const db = require("./models");

async function testFlow() {
  try {
    const service = UserService;
    const testPhone = "+919999999999";
    const testRole = "USER";
    const testName = "Test Signup";

    console.log("1. Sending OTP (Signup)...");
    const sendRes = await service.sendOtp({
      name: testName,
      phone: testPhone,
      role: testRole
    });
    console.log("Send OTP Result:", sendRes);

    // Fetch the OTP from the database
    const otpRecord = await db.Otp.findOne({
      where: { phone: "9999999999" },
      order: [["createdAt", "DESC"]]
    });
    if (!otpRecord) {
      throw new Error("OTP record not created in DB!");
    }
    console.log("Found OTP code in DB:", otpRecord.otp);

    console.log("2. Verifying OTP...");
    const verifyRes = await service.verifyOtp({
      phone: testPhone,
      otp: otpRecord.otp,
      role: testRole
    });
    console.log("Verify OTP Result:", verifyRes);

    console.log("Flow completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Test flow failed:", error);
    process.exit(1);
  }
}

testFlow();
