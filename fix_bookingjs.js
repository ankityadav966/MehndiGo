const fs = require('fs');

const file = 'mobile/src/services/booking.js';
let content = fs.readFileSync(file, 'utf8');

const blocksToRemove = [
\`export async function checkRestrictedBooking() {
  // Returns false by default to allow users to book freely without artificial restrictions
  return { hasRestricted: false };
}\`,

\`export async function updateOnTheWay(bookingId) {
  const res = await apiRequest("PUT", "/booking/on-the-way", { bookingId }, true);
  return res?.data || res;
}\`,

\`export async function confirmCashPayment(bookingId) {
  const res = await apiRequest("PUT", "/booking/complete", { bookingId }, true);
  return res?.data || res;
}\`,

\`export async function rejectCashPayment(bookingId) {
  return { success: true };
}\`
];

let replaced = 0;
blocksToRemove.forEach(block => {
    if (content.includes(block)) {
        // use regex to remove the block and surrounding blank lines to keep it clean
        content = content.replace(block, '');
        replaced++;
    } else {
        console.log('Could not find block:', block.substring(0, 40) + '...');
    }
});

fs.writeFileSync(file, content, 'utf8');
console.log(\`Fixed booking.js by removing \${replaced} duplicate blocks\`);
