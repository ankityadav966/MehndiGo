const fs = require('fs');

// Fix payment.services.js
let payment = fs.readFileSync('backend/services/payment.services.js', 'utf8');
payment = payment.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('backend/services/payment.services.js', payment, 'utf8');
console.log('Fixed payment.services.js');

// Fix artist.services.js
let artist = fs.readFileSync('backend/services/artist.services.js', 'utf8');
artist = artist.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g, '$1');
fs.writeFileSync('backend/services/artist.services.js', artist, 'utf8');
console.log('Resolved artist.services.js');
