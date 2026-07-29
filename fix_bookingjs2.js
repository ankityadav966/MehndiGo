const fs = require('fs');

const file = 'mobile/src/services/booking.js';
let content = fs.readFileSync(file, 'utf8');

const blocks = [
  "export async function checkRestrictedBooking() {\\n  // Returns false by default to allow users to book freely without artificial restrictions\\n  return { hasRestricted: false };\\n}",
  "export async function updateOnTheWay(bookingId) {\\n  const res = await apiRequest(\\"PUT\\", \\"/booking/on-the-way\\", { bookingId }, true);\\n  return res?.data || res;\\n}",
  "export async function confirmCashPayment(bookingId) {\\n  const res = await apiRequest(\\"PUT\\", \\"/booking/complete\\", { bookingId }, true);\\n  return res?.data || res;\\n}",
  "export async function rejectCashPayment(bookingId) {\\n  return { success: true };\\n}"
];

let replaced = 0;
blocks.forEach(block => {
    // Replace exact block, handle varying newlines manually by splitting and trimming first.
    // Actually, simple replace should work.
    // The previous error was a syntax error in the script itself due to unescaped \`
});

// Let's use a simpler array map to filter out duplicate lines:
// Since there's one block between 104 and 142 that needs cleaning, let's just splice it out.
// checkRestrictedBooking starts at 0-index 103 and rejectCashPayment ends at 0-index 141 (or 142).
// Wait, the block from 103 to 142 also contains VALID functions like getArtistLocation!

let lines = content.split('\\n');
// We need to keep lines that are NOT part of the duplicated set.
// A much safer way:

let newContent = content
  .replace("export async function checkRestrictedBooking() {\\n  // Returns false by default to allow users to book freely without artificial restrictions\\n  return { hasRestricted: false };\\n}", "")
  .replace("export async function confirmCashPayment(bookingId) {\\n  const res = await apiRequest(\\"PUT\\", \\"/booking/complete\\", { bookingId }, true);\\n  return res?.data || res;\\n}", "")
  .replace("export async function rejectCashPayment(bookingId) {\\n  return { success: true };\\n}", "");

// For updateOnTheWay, it appears twice identically.
// The first index is fine, so we will replace the LAST index of it.
const updateOnTheWayBlock = "export async function updateOnTheWay(bookingId) {\\n  const res = await apiRequest(\\"PUT\\", \\"/booking/on-the-way\\", { bookingId }, true);\\n  return res?.data || res;\\n}";
const lastIdx = newContent.lastIndexOf(updateOnTheWayBlock);
if (lastIdx !== -1 && newContent.indexOf(updateOnTheWayBlock) !== lastIdx) {
  newContent = newContent.substring(0, lastIdx) + newContent.substring(lastIdx + updateOnTheWayBlock.length);
}

fs.writeFileSync(file, newContent, 'utf8');
console.log('Fixed booking.js cleanly');
