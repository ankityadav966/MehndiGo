const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "../src");

function getRelativeImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const targetPath = path.join(srcDir, "utils/Alert");
  let relPath = path.relative(fileDir, targetPath).replace(/\\/g, "/");
  if (!relPath.startsWith(".")) {
    relPath = "./" + relPath;
  }
  return relPath;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Regex to match: import { ... } from "react-native";
  const reactNativeImportRegex = /import\s+([^;]*?)\s+from\s+['"]react-native['"];?/g;

  let modified = false;

  content = content.replace(reactNativeImportRegex, (match, importClause) => {
    // Check if Alert is inside the curly braces
    const curlyMatch = importClause.match(/\{([^}]+)\}/);
    if (curlyMatch) {
      const itemsStr = curlyMatch[1];
      const items = itemsStr.split(",").map((s) => s.trim());
      if (items.includes("Alert")) {
        modified = true;
        const filteredItems = items.filter((item) => item !== "Alert" && item !== "");

        const relPath = getRelativeImportPath(filePath);
        const newAlertImport = `import Alert from "${relPath}";`;

        if (filteredItems.length === 0) {
          // Alert was the only item imported
          return newAlertImport;
        } else {
          // Reassemble curly braces import list
          const isMultiLine = itemsStr.includes("\n");
          let newItemsStr;
          if (isMultiLine) {
            // Clean up multi-line layout formatting
            newItemsStr = "{\n  " + filteredItems.join(",\n  ") + "\n}";
          } else {
            newItemsStr = "{ " + filteredItems.join(", ") + " }";
          }
          return `import ${newItemsStr} from "react-native";\n${newAlertImport}`;
        }
      }
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`[UPDATED] ${path.relative(srcDir, filePath)}`);
  }
}

function walkDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
    ) {
      processFile(fullPath);
    }
  });
}

console.log("Scanning files in src directory for Alert imports...");
walkDir(srcDir);
console.log("Replacement completed successfully!");
