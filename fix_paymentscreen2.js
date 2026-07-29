const fs = require('fs');

const file = 'mobile/src/screens/Customer/PaymentScreen.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// The duplicate block is from line 55 to 62 (0-indexed 54 to 61).
// Let's verify by checking the content.
if (lines[54].includes('const loadBookingDetails') && lines[61].includes('}, [bookingId]);')) {
    lines.splice(54, 8); // Remove 8 lines
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Fixed PaymentScreen.js by removing lines 55-62');
} else {
    console.log('Error: Lines 55-62 did not match expected content.');
    console.log('Line 55:', lines[54]);
    console.log('Line 62:', lines[61]);
}
