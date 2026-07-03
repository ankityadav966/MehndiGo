const fs = require("fs");
const path = require("path");

const MVP_SKILLS = [
  "copywriting",
  "frontend-design",
  // "high-end-visual-design",
  // "polish",
  "remotion-best-practices",
  "shadcn",
  // "shape",
  "tailwind-design-system",
  "vercel-react-best-practices",
  "web-design-guidelines",
  "azure-functions"
];

const SKILLS_DIR = path.join(process.cwd(), ".agents/skills");

function loadSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    console.warn(`⚠️ Skill not found: ${skillName}`);
    return null;
  }
  return fs.readFileSync(skillPath, "utf-8");
}

function buildSkillsSystemPrompt(skillNames) {
  const loaded = skillNames
    .map((name) => {
      const content = loadSkill(name);
      if (!content) return null;
      return `<skill name="${name}">\n${content}\n</skill>`;
    })
    .filter(Boolean);

  if (loaded.length === 0) return "";

  return `<available_skills>\n${loaded.join("\n\n")}\n</available_skills>`;
}

const MVP_SYSTEM_PROMPT = [
  "You are an expert Full-Stack Developer specializing in React + Azure Functions.",
  "Follow ALL skill guidelines below when generating code.",
  "",
  buildSkillsSystemPrompt(MVP_SKILLS),
]
  .filter(Boolean)
  .join("\n");

function formateOpenAIResponse(response) {
  const raw = response.choices[0].message.content.trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    return parsed;
  }
  return raw;
}

module.exports = {
  formateOpenAIResponse,
  MVP_SKILLS,
  MVP_SYSTEM_PROMPT,
  loadSkill,
  buildSkillsSystemPrompt,
};
