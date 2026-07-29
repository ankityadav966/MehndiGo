const fs = require('fs');

const file = 'mobile/src/services/booking.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Verify before splicing
if (
    lines[139].includes('export async function rejectCashPayment') &&
    lines[134].includes('export async function confirmCashPayment') &&
    lines[124].includes('export async function updateOnTheWay') &&
    lines[103].includes('export async function checkRestrictedBooking')
) {
    // Splicing in reverse order so indices don't shift
    lines.splice(139, 3); // lines 140-142
    lines.splice(134, 4); // lines 135-138
    lines.splice(124, 4); // lines 125-128
    lines.splice(103, 4); // lines 104-107

    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Fixed booking.js cleanly via reverse splicing');
} else {
    console.log('Error: Line contents did not match expected functions.');
}
