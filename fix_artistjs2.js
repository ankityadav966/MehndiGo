const fs = require('fs');

const file = 'mobile/src/services/artist.js';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 0-indexed 183 corresponds to line 184
if (lines[183].includes('const token = await secureStorage.getAccessToken();')) {
    lines.splice(183, 24); // Remove 24 lines starting from 184
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log('Fixed artist.js by removing lines 184-207');
} else {
    console.log('Error: Line 184 did not match expected content.');
    console.log('Line 184:', lines[183]);
}
