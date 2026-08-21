function determineArtistInitialRoute({ verificationStatus, isProfileComplete, artistDetails, aadhaarFiles, profilePhoto }) {
  const status = String(verificationStatus || "").toUpperCase();
  if (status === "REJECTED") {
    return "ApprovalRejected";
  }
  // Only route to ApprovalPending if profile is actually complete & submitted
  if (status === "PENDING" && isProfileComplete) {
    return "ApprovalPending";
  }
  // Unsubmitted / fresh artist onboarding starts at BecomeArtist ("Join Now as Artist")
  return "BecomeArtist";
}
const assert = require('assert');

console.log("==================================================");
console.log("🚀 TESTING ARTIST SIGNUP -> ONBOARDING ROUTE LOGIC");
console.log("==================================================");

// Case 1: Fresh Artist Signup (Just OTP Verified, No Onboarding Submitted)
const routeFreshSignup = determineArtistInitialRoute({
  verificationStatus: "PENDING",
  isProfileComplete: false,
  artistDetails: {},
  aadhaarFiles: { front: null, back: null },
  profilePhoto: null
});
console.log(`1. Fresh Artist Signup Route: ${routeFreshSignup}`);
assert.strictEqual(routeFreshSignup, "BecomeArtist", "Fresh artist must start at BecomeArtist ('Join Now as Artist')");
console.log("  ✅ PASS: Fresh artist is routed to BecomeArtist");

// Case 2: Unsubmitted Artist with Draft Details
const routeDraft = determineArtistInitialRoute({
  verificationStatus: "NOT_SUBMITTED",
  isProfileComplete: false,
  artistDetails: { bio: "" },
  aadhaarFiles: { front: null, back: null },
  profilePhoto: null
});
console.log(`2. Unsubmitted Draft Route: ${routeDraft}`);
assert.strictEqual(routeDraft, "BecomeArtist", "Unsubmitted draft must start at BecomeArtist");
console.log("  ✅ PASS: Unsubmitted draft is routed to BecomeArtist");

// Case 3: Fully Submitted Onboarding Pending Review
const routeSubmitted = determineArtistInitialRoute({
  verificationStatus: "PENDING",
  isProfileComplete: true,
  artistDetails: { bio: "Professional Bridal Mehndi Artist", city: "Jaipur" },
  aadhaarFiles: { front: "file://aadhaar_front.jpg", back: "file://aadhaar_back.jpg" },
  profilePhoto: "file://selfie.jpg"
});
console.log(`3. Submitted Application Route: ${routeSubmitted}`);
assert.strictEqual(routeSubmitted, "ApprovalPending", "Submitted application must route to ApprovalPending");
console.log("  ✅ PASS: Submitted onboarding is routed to ApprovalPending");

// Case 4: Rejected Application
const routeRejected = determineArtistInitialRoute({
  verificationStatus: "REJECTED",
  isProfileComplete: true,
  artistDetails: {},
  aadhaarFiles: {},
  profilePhoto: null
});
console.log(`4. Rejected Application Route: ${routeRejected}`);
assert.strictEqual(routeRejected, "ApprovalRejected", "Rejected application must route to ApprovalRejected");
console.log("  ✅ PASS: Rejected application is routed to ApprovalRejected");

console.log("\n🎯 ALL 4 ROUTING UNIT TESTS PASSED WITH 100% SUCCESS!\n");
