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

// Patch react-native-image-viewing for missing ImageItem.js
try {
  const imgViewingDir = path.join(__dirname, '../node_modules/react-native-image-viewing/dist/components/ImageItem');
  const imgViewingFile = path.join(imgViewingDir, 'ImageItem.js');
  if (fs.existsSync(imgViewingDir) && !fs.existsSync(imgViewingFile)) {
    const content = `import { Platform } from "react-native";
import ImageItemAndroid from "./ImageItem.android";
import ImageItemIOS from "./ImageItem.ios";

const ImageItem = Platform.OS === "ios" ? ImageItemIOS : ImageItemAndroid;

export default ImageItem;
`;
    fs.writeFileSync(imgViewingFile, content, 'utf8');
    console.log('[Postinstall] Created ImageItem.js for react-native-image-viewing');
  }
} catch (err) {
  console.error('[Postinstall] Error patching react-native-image-viewing:', err.message);
}

