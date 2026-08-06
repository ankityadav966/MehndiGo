const fs = require("fs");
const path = require("path");

const targetDir = path.join(__dirname, "..", "node_modules", "react-native-image-viewing", "dist", "components", "ImageItem");
const jsFile = path.join(targetDir, "ImageItem.js");
const dtsFile = path.join(targetDir, "ImageItem.d.ts");

const content = `export { default } from "./ImageItem.android";\nexport * from "./ImageItem.android";\n`;

try {
  if (fs.existsSync(targetDir)) {
    if (!fs.existsSync(jsFile)) {
      fs.writeFileSync(jsFile, content, "utf8");
      console.log("[fix-image-viewing] Created ImageItem.js");
    }
    if (!fs.existsSync(dtsFile)) {
      fs.writeFileSync(dtsFile, content, "utf8");
      console.log("[fix-image-viewing] Created ImageItem.d.ts");
    }
  }

  const rnWebIndex = path.join(__dirname, "..", "node_modules", "react-native-web", "dist", "index.js");
  if (fs.existsSync(rnWebIndex)) {
    let code = fs.readFileSync(rnWebIndex, "utf8");
    if (!code.includes("codegenNativeComponent")) {
      code += `\nexport const codegenNativeComponent = (componentName, options) => (props) => null;\nexport const codegenNativeCommands = (options) => ({});\n`;
      fs.writeFileSync(rnWebIndex, code, "utf8");
      console.log("[fix-image-viewing] Patched react-native-web with codegenNativeComponent");
    }
  }
  const uiManagerFile = path.join(__dirname, "..", "node_modules", "react-native-web", "dist", "exports", "UIManager", "index.js");
  if (fs.existsSync(uiManagerFile)) {
    let code = fs.readFileSync(uiManagerFile, "utf8");
    if (!code.includes("hasViewManagerConfig")) {
      code = code.replace("setLayoutAnimationEnabledExperimental() {}", "setLayoutAnimationEnabledExperimental() {},\n  hasViewManagerConfig() { return false; },\n  getViewManagerConfig() { return null; }");
      fs.writeFileSync(uiManagerFile, code, "utf8");
      console.log("[fix-image-viewing] Patched UIManager with hasViewManagerConfig");
    }
  }
} catch (err) {
  console.error("[fix-image-viewing] Failed:", err.message);
}
