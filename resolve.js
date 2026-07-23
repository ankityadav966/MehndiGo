const fs = require('fs');

let content = fs.readFileSync('backend/services/booking.services.js', 'utf8');

content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g, '$1');

// Replacements for cashfree -> razorpay
content = content.replace(/cashfree_order_id/g, 'razorpay_order_id');
content = content.replace(/cashfree_payment_id/g, 'razorpay_payment_id');
content = content.replace(/cashfree/g, 'razorpay');
content = content.replace(/Cashfree/g, 'Razorpay');
content = content.replace(/CASHFREE/g, 'RAZORPAY');

fs.writeFileSync('backend/services/booking.services.js', content, 'utf8');
console.log('Resolved booking.services.js');
