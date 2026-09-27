/**
 * fix-colors.js
 *
 * Scans for hardcoded color values in StyleSheet definitions and replaces
 * them with theme color references where a match exists.
 *
 * Usage: node scripts/fix-colors.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const APP_DIR = path.join(ROOT, "app");

// Map of hex colors to theme color references
const COLOR_MAP = {
  "#0f766e": "Colors.teal[700]",
  "#0d9488": "Colors.teal[600]",
  "#14b8a6": "Colors.teal[500]",
  "#4338ca": "Colors.indigo[700]",
  "#4f46e5": "Colors.indigo[600]",
  "#6366f1": "Colors.indigo[500]",
  "#059669": "Colors.emerald[600]",
  "#10b981": "Colors.emerald[500]",
  "#d97706": "Colors.amber[600]",
  "#f59e0b": "Colors.amber[500]",
  "#e11d48": "Colors.rose[600]",
  "#f43f5e": "Colors.rose[500]",
  "#334155": "Colors.slate[700]",
  "#475569": "Colors.slate[600]",
  "#64748b": "Colors.slate[500]",
  "#94a3b8": "Colors.slate[400]",
  "#cbd5e1": "Colors.slate[300]",
  "#e2e8f0": "Colors.slate[200]",
  "#f1f5f9": "Colors.slate[100]",
  "#f8fafc": "Colors.slate[50]",
  "#ffffff": "Colors.white",
  "#000000": "Colors.black",
};

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

function fixFile(filePath, dryRun) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  const changes = [];

  for (const [hex, ref] of Object.entries(COLOR_MAP)) {
    const regex = new RegExp(`["'\`]${hex}["'\`]`, "gi");
    if (regex.test(content)) {
      content = content.replace(regex, `"${ref}"`);
      modified = true;
      changes.push(`${hex} -> ${ref}`);
    }
  }

  if (modified && !dryRun) {
    fs.writeFileSync(filePath, content);
  }

  return { modified, changes };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = [...walk(SRC_DIR), ...walk(APP_DIR)];

  console.log(`\n=== Color Fix ${dryRun ? "(DRY RUN)" : ""} ===\n`);

  let totalFixed = 0;
  for (const file of files) {
    const { modified, changes } = fixFile(file, dryRun);
    if (modified) {
      console.log(`${path.relative(ROOT, file)}:`);
      changes.forEach((c) => console.log(`  ${c}`));
      totalFixed++;
    }
  }

  console.log(`\n${dryRun ? "Would fix" : "Fixed"} ${totalFixed} file(s)\n`);
}

main();
