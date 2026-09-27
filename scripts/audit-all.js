/**
 * audit-all.js
 *
 * Scans the codebase for common issues:
 * - Emoji usage in JSX text (should use icons instead)
 * - Mock data imports that should use Firestore
 * - Inline mock data placeholders
 *
 * Usage: node scripts/audit-all.js [--fix]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const APP_DIR = path.join(ROOT, "app");
const SRC_DIR = path.join(ROOT, "src");

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]|✨|📍|🔴|🔖|🗺|🎃|🔔|✓/gu;

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (
      entry.name.endsWith(".tsx") ||
      entry.name.endsWith(".ts") ||
      entry.name.endsWith(".jsx") ||
      entry.name.endsWith(".js")
    ) {
      results.push(full);
    }
  }
  return results;
}

function auditEmojis(files) {
  const issues = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      const match = line.match(EMOJI_REGEX);
      if (match) {
        issues.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          emojis: match.join(", "),
          text: line.trim(),
        });
      }
    });
  }
  return issues;
}

function auditMockImports(files) {
  const issues = [];
  const mockRegex = /from\s+["'].*mockData["']/g;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      if (mockRegex.test(line)) {
        issues.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          text: line.trim(),
        });
      }
      mockRegex.lastIndex = 0;
    });
  }
  return issues;
}

function auditInlineMock(files) {
  const issues = [];
  const patterns = [
    { regex: /placeholder\s*=\s*"(Jane Doe|John Doe|Test|Mock)"/g, issue: "Fake/mock placeholder" },
    { regex: /uid\s*=\s*"mock-/g, issue: "Mock UID" },
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      for (const { regex, issue } of patterns) {
        if (regex.test(line)) {
          issues.push({
            file: path.relative(ROOT, file),
            line: i + 1,
            issue,
            text: line.trim(),
          });
        }
        regex.lastIndex = 0;
      }
    });
  }
  return issues;
}

function main() {
  const fix = process.argv.includes("--fix");
  const files = [
    ...walk(APP_DIR),
    ...walk(SRC_DIR),
  ];

  console.log(`\n=== Codebase Audit (${files.length} files) ===\n`);

  const emojiIssues = auditEmojis(files);
  const mockImports = auditMockImports(files);
  const inlineMock = auditInlineMock(files);

  console.log(`Emoji issues: ${emojiIssues.length}`);
  emojiIssues.forEach((i) => {
    console.log(`  ${i.file}:${i.line} — ${i.emojis}`);
    console.log(`    ${i.text}`);
  });

  console.log(`\nMock data imports: ${mockImports.length}`);
  mockImports.forEach((i) => {
    console.log(`  ${i.file}:${i.line}`);
    console.log(`    ${i.text}`);
  });

  console.log(`\nInline mock data: ${inlineMock.length}`);
  inlineMock.forEach((i) => {
    console.log(`  ${i.file}:${i.line} — ${i.issue}`);
    console.log(`    ${i.text}`);
  });

  const report = {
    emojiIssues,
    mockDataImports: mockImports,
    mockDataInline: inlineMock,
  };

  const reportPath = path.join(__dirname, "audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${path.relative(ROOT, reportPath)}`);

  const totalIssues = emojiIssues.length + mockImports.length + inlineMock.length;
  console.log(`\nTotal issues: ${totalIssues}\n`);
}

main();
