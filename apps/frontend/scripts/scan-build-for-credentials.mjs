#!/usr/bin/env node
// Security regression check, not a normal unit test: proves the *built*
// production bundle (apps/frontend/dist) never contains a real login
// email or the shared local-dev password that used to be hardcoded in the
// login pages (see lib/dev-login-credentials.ts — those values now only
// ever come from a gitignored .env.local, which doesn't exist on a CI or
// production build machine).
//
// Run after `npm run build`:  node scripts/scan-build-for-credentials.mjs
//
// The strings below are intentionally hardcoded — this script's entire
// job is asserting their ABSENCE from the build output, it never prints,
// logs, or forwards them anywhere.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

// Deliberately just the emails, not the shared dev password on its own —
// a bare 6-digit string is too generic (version numbers, pixel values,
// minified identifiers) and would make this check flaky. An email is a
// specific, unique, and sufficient signal that a real credential leaked;
// the password itself has no attack value without a paired identifier,
// and defaultPassword is never hardcoded at the source anymore either.
const FORBIDDEN_STRINGS = [
  "cp@lamego.com.vc",
  "gabriel@lamego.com.vc",
  "valderio@lamego.com.vc",
  "rose@lamego.com.vc",
  "leader@lamego.com.vc",
  "reynario@lamego.com.vc",
];

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function main() {
  try {
    statSync(distDir);
  } catch {
    console.error(`dist/ not found at ${distDir} — run "npm run build" first.`);
    process.exit(1);
  }

  const scannable = listFilesRecursive(distDir).filter((f) =>
    /\.(js|mjs|cjs|html|css|map|json)$/i.test(f),
  );

  const findings = [];
  for (const file of scannable) {
    const content = readFileSync(file, "utf8");
    for (const needle of FORBIDDEN_STRINGS) {
      if (content.includes(needle)) {
        findings.push({ file: path.relative(distDir, file), needle: redact(needle) });
      }
    }
  }

  if (findings.length > 0) {
    console.error("FAIL: forbidden credential-like strings found in the production build:");
    for (const f of findings) {
      console.error(`  - ${f.file} contains ${f.needle}`);
    }
    process.exit(1);
  }

  console.log(`OK: scanned ${scannable.length} files in dist/ — no known login credentials found.`);
}

// Never print the raw value, even in a failure message.
function redact(value) {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user[0]}***@${domain}`;
  }
  return `${value[0]}***${value[value.length - 1]}`;
}

main();
