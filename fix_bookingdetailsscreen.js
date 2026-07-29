const fs = require('fs');

const file = 'mobile/src/screens/Artist/BookingDetailsScreen.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 0-indexed 652 corresponds to line 653
if (lines[652].includes('const handleConfirmCash = async () => {')) {
    lines.splice(652, 24); // Remove 24 lines starting from 653
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Fixed BookingDetailsScreen.js by removing lines 653-676');
} else {
    console.log('Error: Line 653 did not match expected content.');
    console.log('Line 653:', lines[652]);
}
