/**
 * Test Suite: Customer Profile Data Persistence & Edit Profile Flow
 * Verifies that customer profile retrieval (GET /customer/profile),
 * profile updates (PUT /customer/profile), address persistence,
 * and data synchronization work accurately.
 */

process.env.NODE_ENV = "test";
process.env.DB_DIALECT = "sqlite";
process.env.JWT_SECRET = "test_jwt_secret_key_mehndi_go_2026";

const assert = require("assert");
const db = require("../models");
const UserService = require("../services/user.services");
const CustomerService = require("../services/customer.services");

async function runCustomerProfileTests() {
  console.log("=================================================================");
  console.log("  TEST: CUSTOMER PROFILE DATA PERSISTENCE & EDIT FLOW");
  console.log("=================================================================\n");

  await db.sequelize.sync({ force: true });

  let passed = 0;
  let failed = 0;

  function record(desc, cond, details = "") {
    if (cond) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${details ? `-> ${details}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const testEmail = `customer_${timestamp}@mehndigo.com`;
  const testPhone = `97${String(timestamp).slice(-8)}`;

  let customerUser = null;

  try {
    // 1. Create Customer User
    console.log("--- 1. Customer User Creation (Simulating Verified Customer Signup) ---");
    customerUser = await db.User.create({
      name: "Sneha Sharma",
      email: testEmail,
      phone: testPhone,
      role: "CUSTOMER",
      is_verified: true,
      is_active: true,
    });
    record("Customer user created with role CUSTOMER", customerUser && customerUser.role === "CUSTOMER");

    // 2. Fetch Initial Customer Profile
    console.log("\n--- 2. Initial Customer Profile Retrieval ---");
    const initialProfile = await UserService.getProfile(customerUser.id);
    record("getProfile returns valid user", Boolean(initialProfile));
    record("getProfile returns customer name", initialProfile.name === "Sneha Sharma");
    record("getProfile returns customer email", initialProfile.email === testEmail);
    record("getProfile returns customer phone", initialProfile.phone === testPhone);

    // 3. Update Customer Profile (Simulating EditProfileScreen Save)
    console.log("\n--- 3. Edit Profile Update (PUT /customer/profile) ---");
    const updatePayload = {
      name: "Sneha Sharma Jaipur",
      email: testEmail,
      phone: testPhone,
      profile_image: "https://res.cloudinary.com/mehndigo/image/upload/customer_avatar_sample.jpg",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302017",
      address: "B-42, Vaishali Nagar, Jaipur",
    };

    const updateRes = await UserService.updateProfile(customerUser.id, updatePayload);
    record("updateProfile executed successfully", Boolean(updateRes));

    // 4. Verify Updated Details in Database
    console.log("\n--- 4. Direct Database & Fresh Profile Verification ---");
    const freshUser = await db.User.findByPk(customerUser.id);
    record("User name updated in DB", freshUser.name === "Sneha Sharma Jaipur");
    record("User profile_image updated in DB", freshUser.profile_image === updatePayload.profile_image);

    const freshProfile = await UserService.getProfile(customerUser.id);
    record("Fresh profile contains updated name", freshProfile.name === "Sneha Sharma Jaipur");
    record("Fresh profile contains updated profile_image", freshProfile.profile_image === updatePayload.profile_image);

    // 5. Verify Customer Address Persistence
    console.log("\n--- 5. Customer Address Book Verification ---");
    const createdAddress = await db.Address.create({
      user_id: customerUser.id,
      name: "Sneha Sharma",
      phone: testPhone,
      address_line_1: "B-42, Vaishali Nagar",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302017",
      is_default: true,
      address_type: "HOME",
    });
    record("Address record persisted in DB", Boolean(createdAddress));
    record("Address city is Jaipur", createdAddress.city === "Jaipur");
    record("Address pincode is 302017", createdAddress.pincode === "302017");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    try {
      if (customerUser?.id) {
        await db.Address.destroy({ where: { user_id: customerUser.id } });
        await db.User.destroy({ where: { id: customerUser.id } });
      }
    } catch (_) {}
  }

  console.log("\n=================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCustomerProfileTests().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
