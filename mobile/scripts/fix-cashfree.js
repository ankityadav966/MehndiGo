const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../node_modules/react-native-cashfree-pg-sdk/package.json');
const destDir = path.join(__dirname, '../node_modules/react-native-cashfree-pg-sdk/lib');
const destPath = path.join(destDir, 'package.json');

try {
  if (fs.existsSync(srcPath)) {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(srcPath, destPath);
    console.log('[Postinstall] Successfully copied package.json to cashfree-pg-sdk/lib/package.json');
  } else {
    console.log('[Postinstall] Warning: react-native-cashfree-pg-sdk/package.json not found.');
  }
} catch (err) {
  console.error('[Postinstall] Error patching react-native-cashfree-pg-sdk:', err.message);
}
