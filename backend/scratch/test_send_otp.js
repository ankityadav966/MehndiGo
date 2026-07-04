const UserService = require("../services/user.services");

async function main() {
  try {
    console.log("Calling UserService.sendOtp with a test number...");
    const res = await UserService.sendOtp({
      phone: "+919999999999",
      role: "USER",
      name: "Test User",
      email: "test@example.com"
    });
    console.log("Result:", res);
    process.exit(0);
  } catch (error) {
    console.error("Failed with error:", error);
    process.exit(1);
  }
}

main();
