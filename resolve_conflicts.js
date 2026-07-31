const fs = require('fs');
const path = require('path');

const filesToResolve = [
  'backend/services/payment.services.js',
  'mobile/src/services/portfolio.js',
  'mobile/src/services/deepLink.js',
  'mobile/src/services/chat.js',
  'mobile/src/services/booking.js',
  'mobile/src/services/auth.js',
  'mobile/src/services/artist.js',
  'mobile/src/screens/Customer/PaymentScreen.js',
  'mobile/src/screens/Customer/WalletScreen.js',
  'mobile/src/screens/Common/WalletScreen.js',
  'mobile/src/screens/Customer/MyBookingsScreen.js',
  'mobile/src/screens/Customer/HomeScreen.js',
  'mobile/src/screens/Customer/CustomerProfileScreen.js',
  'mobile/src/screens/Customer/CategoriesScreen.js',
  'mobile/src/screens/Customer/BookingSettlementScreen.js',
  'mobile/src/screens/Customer/BookingDetailsScreen.js',
  'mobile/src/screens/Artist/BookingRequestsScreen.js',
  'mobile/src/screens/Artist/DashboardScreen.js',
  'mobile/src/screens/Artist/BookingDetailsScreen.js',
  'mobile/src/app/chat.jsx',
  'mobile/src/app/booking.jsx',
  'mobile/src/app/notifications.jsx'
];

for (const relPath of filesToResolve) {
  const absPath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(absPath)) continue;

  let content = fs.readFileSync(absPath, 'utf8');

  // Replace conflict markers by keeping the bottom (incoming main) branch
  // because incoming main has all the new updates, fixes, and fallbacks.
  const regex = /<<<<<<< HEAD[\s\S]*?=======\r?\n([\s\S]*?)>>>>>>> [a-z0-9]+/g;
  content = content.replace(regex, '$1');

  fs.writeFileSync(absPath, content, 'utf8');
  console.log(`Resolved: ${relPath}`);
}
