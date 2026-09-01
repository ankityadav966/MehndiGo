const assert = require("assert");
const { validateAadhaarNumber, validateAadhaarPhotos, checkVerhoeff } = require("../utils/aadhaar.validator");

console.log("=========================================");
console.log("🧪 TESTING AADHAAR CARD & PHOTO VALIDATION");
console.log("=========================================\n");

// 1. Test Dummy Aadhaar Numbers (Must FAIL)
const dummyNumbers = [
  "",
  null,
  undefined,
  "12345",              // Too short
  "12345678901234",     // Too long
  "012345678901",       // Starts with 0
  "123456789012",       // Starts with 1 & dummy sequence
  "000000000000",       // All zeroes
  "111111111111",       // All ones
  "222222222222",       // Repeating 2s
  "999999999999",       // Repeating 9s
  "234567890123",       // Sequential dummy
  "987654321098",       // Descending sequence
  "234523452345",       // Repeating 4-digit block
  "541289632141",       // Invalid Verhoeff checksum
];

// Temporarily ensure production validation rules run
const prevEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";

dummyNumbers.forEach((num) => {
  const result = validateAadhaarNumber(num);
  assert.strictEqual(result.valid, false, `Expected dummy number '${num}' to be invalid`);
  console.log(`✅ Correctly rejected invalid/dummy Aadhaar: '${num}' -> Reason: ${result.message}`);
});

// 2. Test Valid Aadhaar Numbers with correct Verhoeff checksum
// Example real Verhoeff valid Aadhaar numbers starting with 2-9:
// Construct valid numbers:
// Let's compute a valid Verhoeff number:
// Take 11 digits: e.g. "54128963214"
// Find 12th digit such that checkVerhoeff is 0
function generateValidAadhaar(prefix11) {
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];
  const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  let c = 0;
  const reversed = prefix11.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = d[c][p[(i + 1) % 8][parseInt(reversed[i], 10)]];
  }
  const checksum = inv[c];
  return prefix11 + checksum;
}

const validTestAadhaar1 = generateValidAadhaar("54128963214");
const validTestAadhaar2 = generateValidAadhaar("98765432101");
const validTestAadhaar3 = generateValidAadhaar("36789124508");

console.log("\nGenerated valid Aadhaar test numbers:", validTestAadhaar1, validTestAadhaar2, validTestAadhaar3);

assert.strictEqual(validateAadhaarNumber(validTestAadhaar1).valid, true);
assert.strictEqual(validateAadhaarNumber(validTestAadhaar2).valid, true);
assert.strictEqual(validateAadhaarNumber(validTestAadhaar3).valid, true);
console.log("✅ Valid Aadhaar numbers successfully passed Verhoeff verification!");

// 3. Test Aadhaar Photo Validation
console.log("\n--- Testing Photo Validation ---");

// Missing photos
assert.strictEqual(validateAadhaarPhotos("", "back.jpg").valid, false);
assert.strictEqual(validateAadhaarPhotos("front.jpg", "").valid, false);
console.log("✅ Missing photos correctly rejected");

// Identical / Duplicate photos (Front and Back same)
const duplicateCheck = validateAadhaarPhotos("uploads/same_photo.jpg", "uploads/same_photo.jpg");
assert.strictEqual(duplicateCheck.valid, false);
assert.strictEqual(duplicateCheck.message.includes("cannot be the same"), true);
console.log("✅ Duplicate front/back photos correctly rejected:", duplicateCheck.message);

// Distinct valid photos
const validPhotos = validateAadhaarPhotos("uploads/front_side.jpg", "uploads/back_side.jpg");
assert.strictEqual(validPhotos.valid, true);
console.log("✅ Distinct front and back photos successfully validated!");

process.env.NODE_ENV = prevEnv;
console.log("\n🎉 ALL AADHAAR VALIDATION TESTS PASSED PERFECTLY!");
