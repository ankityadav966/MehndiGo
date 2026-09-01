const db = require("./models");
const referralService = require("./services/referral.services");
const customerService = require("./services/customer.services");

async function runTests() {
  console.log("=== RUNNING FINAL REFERRAL AUDIT TESTS ===");
  try {
    await db.sequelize.authenticate();
    console.log("[DB] Connected.");
  } catch (err) {
    console.error("[DB] Failed to connect. Is Postgres running locally?", err.message);
    return;
  }

  try {
    
    // We will simulate data
    const userA = await db.User.create({ name: "Referrer", email: "ref_a@test.com", role: "ARTIST", is_verified: true });
    const userB = await db.User.create({ name: "Referred", email: "ref_b@test.com", role: "ARTIST", is_verified: true });
    
    console.log(`Created Users: ${userA.id}, ${userB.id}`);

    // 1. Generate code for UserA
    const codeA = await referralService.generateReferralCode(userA.id);
    console.log(`[1] generateReferralCode: PASS - Code ${codeA.code}`);

    // 2. Self Referral Test
    const selfRef = await referralService.recordReferralSignup(userA.id, codeA.code);
    if (selfRef) throw new Error("Self referral was permitted!");
    console.log(`[2] Self Referral Blocked: PASS`);

    // 3. Normal Referral Signup User B -> User A
    const signupRef = await referralService.recordReferralSignup(userB.id, codeA.code);
    if (!signupRef || signupRef.status !== "PENDING") throw new Error("Referral signup failed");
    console.log(`[3] Successful Referral Signup: PASS`);

    // 4. Duplicate Referral Signup Blocked
    const dupRef = await referralService.recordReferralSignup(userB.id, codeA.code);
    if (dupRef) throw new Error("Duplicate referral was permitted!");
    console.log(`[4] Duplicate Referral Blocked: PASS`);

    // Create Artist Profile for B to simulate booking
    await db.ArtistProfile.create({ user_id: userB.id, status: "pending", name: "Referred Artist" });

    // 5. Booking Completion Trigger
    const booking = await db.Booking.create({
      user_id: userB.id,
      artist_id: 1, // Doesn't matter
      booking_status: "COMPLETED",
      payment_status: "PAID",
      total_amount: 1000,
      booking_code: "TST-001"
    });

    // Simulate the hook firing
    await referralService.verifyAndRewardReferral(userB.id, booking.id);

    // Verify Reward applied to UserA
    const userAAfter = await db.User.findByPk(userA.id);
    const hasBoost = userAAfter.boost_expires_at > new Date();
    if (!hasBoost) throw new Error("Referrer did not get boost!");
    console.log(`[5] Booking Completion Triggers Boost: PASS`);

    // Verify Welcome Boost applied to UserB (Artist)
    const userBAfter = await db.User.findByPk(userB.id);
    const hasWelcomeBoost = userBAfter.boost_expires_at > new Date();
    if (!hasWelcomeBoost) throw new Error("Referred Artist did not get welcome boost!");
    console.log(`[6] Welcome Boost Triggers: PASS`);

    // 7. Idempotency Check (Duplicate completion)
    const beforeExpiry = userAAfter.boost_expires_at;
    await referralService.verifyAndRewardReferral(userB.id, booking.id);
    const userAAfter2 = await db.User.findByPk(userA.id);
    if (userAAfter2.boost_expires_at.getTime() !== beforeExpiry.getTime()) throw new Error("Duplicate completion extended boost unnecessarily!");
    console.log(`[7] Idempotency Protected: PASS`);

    // 8. Multiple Boost Extension (Manually grant 7 more days)
    await referralService.grantProfileBoost(userA.id, 7);
    const userAAfter3 = await db.User.findByPk(userA.id);
    const diffDays = (userAAfter3.boost_expires_at - beforeExpiry) / (1000 * 60 * 60 * 24);
    if (Math.round(diffDays) !== 7) throw new Error("Multiple boosts did not extend duration correctly");
    console.log(`[8] Multiple Boost Extension: PASS`);

    // 9. Ranking Integration Test
    // Create an Artist profile for UserA
    await db.ArtistProfile.create({ user_id: userA.id, status: "approved", verification_status: "APPROVED", avg_rating: 4.0, total_bookings: 10 });
    const artists = await customerService.searchArtists("Referrer");
    console.log(`[9] Ranking query executed without SQL error: PASS`);

    // Cleanup
    await db.Booking.destroy({ where: { user_id: userB.id } });
    await db.ArtistProfile.destroy({ where: { user_id: [userA.id, userB.id] } });
    await db.ReferralHistory.destroy({ where: { referrer_id: userA.id } });
    await db.ReferralCode.destroy({ where: { user_id: userA.id } });
    await db.User.destroy({ where: { id: [userA.id, userB.id] } });
    
    console.log("=== ALL TESTS PASSED ===");
  } catch (err) {
    console.error("Test Failed:", err);
  } finally {
    process.exit(0);
  }
}

runTests();
