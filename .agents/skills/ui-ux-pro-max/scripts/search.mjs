#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

// Simple CSV parser supporting quotes and commas
function parseCSV(text) {
  const lines = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      current.push(field.trim());
      field = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      current.push(field.trim());
      if (current.some(c => c.length > 0)) {
        lines.push(current);
      }
      current = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field.trim());
    if (current.some(c => c.length > 0)) {
      lines.push(current);
    }
  }

  if (lines.length === 0) return [];
  const headers = lines[0];
  return lines.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] || "";
    });
    return obj;
  });
}

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function scoreItem(item, searchCols, queryTokens) {
  const text = searchCols.map(col => item[col] || "").join(" ").toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) {
      score += 1;
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(text)) score += 2;
    }
  }
  return score;
}

const DOMAIN_MAP = {
  style: { file: "styles.csv", cols: ["Style ID", "Style Category", "Aliases", "Keywords", "Best For"] },
  color: { file: "colors.csv", cols: ["Product Type", "Notes"] },
  chart: { file: "charts.csv", cols: ["Data Type", "Keywords", "Best Chart Type", "When to Use"] },
  landing: { file: "landing.csv", cols: ["Pattern ID", "Pattern Name", "Aliases", "Keywords"] },
  product: { file: "products.csv", cols: ["Product Type", "Keywords", "Primary Style Recommendation"] },
  ux: { file: "ux-guidelines.csv", cols: ["Category", "Issue", "Description", "Platform"] },
  typography: { file: "typography.csv", cols: ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For"] },
  icons: { file: "icons.csv", cols: ["Category", "Icon Name", "Keywords", "Best For"] },
};

export function searchDomain(domain, query, maxResults = 3) {
  const cfg = DOMAIN_MAP[domain];
  if (!cfg) return { error: `Unknown domain: ${domain}` };
  const filePath = path.join(DATA_DIR, cfg.file);
  if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` };

  const content = fs.readFileSync(filePath, "utf8");
  const items = parseCSV(content);
  const qTokens = tokenize(query);

  const scored = items
    .map(item => ({ item, score: scoreItem(item, cfg.cols, qTokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return {
    domain,
    query,
    count: scored.length,
    results: scored.map(s => s.item),
  };
}

export function searchStack(stack, query, maxResults = 5) {
  const fileName = `stacks/${stack}.csv`;
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return { error: `Stack not found: ${stack}` };

  const content = fs.readFileSync(filePath, "utf8");
  const items = parseCSV(content);
  const qTokens = tokenize(query);
  const cols = ["Category", "Guideline", "Description", "Do", "Don't"];

  const scored = items
    .map(item => ({ item, score: scoreItem(item, cols, qTokens) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return {
    stack,
    query,
    count: scored.length,
    results: scored.map(s => s.item),
  };
}

export function generateDesignSystem(query, projectName = "MehndiGo") {
  return `
# Design System: ${projectName}
> Tailored for: ${query}
> Aesthetic: Soft UI Evolution & Accessible Luxury (Artisan Henna & Beauty Marketplace)

## Core Color Palette
- **Primary (Royal Burgundy)**: \`#9C1344\` (Luxury, artisan heritage, consistent with wallet & brand identity)
- **Primary Light (Rose Mist)**: \`#F8BBD0\` / \`#FFF0F5\`
- **Accent (Heritage Gold)**: \`#D4AF37\` (Celebration, verified badges, rating stars)
- **Background (Light Mode)**: \`#FFF8FA\` (Warm alabaster with subtle rose undertone)
- **Surface / Cards**: \`#FFFFFF\` (Crisp white with soft \`#9C134408\` shadow)
- **Text Primary**: \`#1D1D1D\` (Charcoal black, WCAG AAA 11:1+ contrast)
- **Text Secondary**: \`#705E58\` (Warm taupe gray)
- **Border**: \`#F1E3E7\` (Subtle warm rose border)
- **Success**: \`#16A34A\` (Natural emerald)
- **Warning**: \`#F59E0B\` (Warm amber)
- **Error / Danger**: \`#E11D48\` (Rose red, gentle and clear)

## Typography (Poppins)
- **Headings**: Poppins SemiBold (600) / Bold (700)
- **Body**: Poppins Regular (400) / Medium (500)
- **Captions & Badges**: Poppins Medium (500), 11-12px

## Motion & Interaction Philosophy (Smooth & Subtle)
- **Timing**: 200ms - 280ms for micro-interactions
- **Physics**: Soft spring curves (\`friction: 8, tension: 40\`)
- **Feedback**: Immediate scale press state (\`0.98\`), tactile opacity (\`0.85\`), and haptic affirmation on success
- **Toasts**: Non-intrusive floating glassmorphic pills with gesture swipe-dismiss
- **Modals**: Smooth bottom sheets with drag-down handle and backdrop fade

## Anti-Patterns Avoided
- No harsh neon alerts or jarring primary red banners
- No unpadded bottom scroll areas beneath floating tab navigation
- No truncated or wrapped action button labels
- No unhandled single-action or rapid successive toast dismissals
`;
}

// CLI Execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let query = "";
  let domain = null;
  let stack = null;
  let isDesignSystem = false;
  let projectName = "MehndiGo";
  let persist = false;
  let outputDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--domain" || args[i] === "-d") {
      domain = args[++i];
    } else if (args[i] === "--stack" || args[i] === "-s") {
      stack = args[++i];
    } else if (args[i] === "--design-system") {
      isDesignSystem = true;
    } else if (args[i] === "-p" || args[i] === "--project") {
      projectName = args[++i];
    } else if (args[i] === "--persist") {
      persist = true;
    } else if (args[i] === "--output-dir") {
      outputDir = args[++i];
    } else if (!args[i].startsWith("-")) {
      query = args[i];
    }
  }

  if (isDesignSystem) {
    const ds = generateDesignSystem(query || "beauty mehndi salon booking marketplace", projectName);
    console.log(ds);

    if (persist) {
      const slug = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetDir = path.join(outputDir, "design-system", slug);
      fs.mkdirSync(targetDir, { recursive: true });
      const targetFile = path.join(targetDir, "MASTER.md");
      fs.writeFileSync(targetFile, ds.trim() + "\n", "utf8");
      console.log(`\nPersisted design system to: ${targetFile}`);
    }
  } else if (stack) {
    const res = searchStack(stack, query || "components layout");
    console.log(JSON.stringify(res, null, 2));
  } else if (domain) {
    const res = searchDomain(domain, query || "beauty");
    console.log(JSON.stringify(res, null, 2));
  } else {
    // Default search product
    const res = searchDomain("style", query || "soft ui minimalism");
    console.log(JSON.stringify(res, null, 2));
  }
}
