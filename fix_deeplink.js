const fs = require('fs');

const file = 'mobile/src/services/deepLink.js';
let content = fs.readFileSync(file, 'utf8');

// Combine the two first blocks (take HEAD's normalization + bottom's regex parsing)
const block1Regex = /<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g;
// Actually it's easier to just do a string replacement for the exact function.

// Find start and end of resolveNotificationRoute
const startIdx = content.indexOf('export function resolveNotificationRoute(notification, role) {');
// Find the closing brace of the function. The function returns at the end.
const endIdx = content.indexOf('};', startIdx) || content.indexOf('}', startIdx + 2000); // we will replace it specifically

content = content.replace(/<<<<<<< HEAD\r?\n[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g, (match, p1) => {
   // Just keep the bottom branch (it has the Smart Dynamic Fallback and the fallback routes logic)
   return p1;
});

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed deepLink.js by keeping incoming branch.');
