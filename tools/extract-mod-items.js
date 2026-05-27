/**
 * Extracts item/block display names from mod lang files and merges them
 * with the existing vanilla list into src/data/minecraft-items.js
 *
 * Usage: node tools/extract-mod-items.js
 * Requires: unzip on PATH (comes with Git Bash on Windows)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODS_DIR = 'C:/Users/danny/AppData/Roaming/ModrinthApp/profiles/Create/mods';
const OUT_FILE = path.join(__dirname, '../src/data/minecraft-items.js');

const skipPrefixes = [
  'item.modifiers.',
  'item.nbt.',
  'block.minecraft.banner_pattern.',
  'item.attribute.',
];
function shouldSkip(key) {
  return skipPrefixes.some((p) => key.startsWith(p));
}

const names = new Set();

const jars = fs.readdirSync(MODS_DIR).filter((f) => f.endsWith('.jar'));
console.log(`Processing ${jars.length} jars…`);

for (const jar of jars) {
  const jarPath = path.join(MODS_DIR, jar).replace(/\\/g, '/');

  // List entries, find en_us.json lang files
  let listing;
  try {
    listing = execSync(`unzip -l "${jarPath}"`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    continue;
  }

  const langFiles = [...listing.matchAll(/assets\/[^/]+\/lang\/en_us\.json/g)].map((m) => m[0]);
  const seen = new Set();
  for (const lf of langFiles) {
    if (seen.has(lf)) continue;
    seen.add(lf);

    let content;
    try {
      content = execSync(`unzip -p "${jarPath}" "${lf}"`, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    } catch {
      continue;
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      continue;
    }

    for (const [key, val] of Object.entries(data)) {
      if (typeof val !== 'string') continue;
      // Only exact item/block registry keys: item.<modid>.<name> or block.<modid>.<name>
      const parts = key.split('.');
      if (parts.length !== 3) continue;
      if (parts[0] !== 'item' && parts[0] !== 'block') continue;
      if (shouldSkip(key)) continue;
      const trimmed = val.trim();
      if (trimmed) names.add(trimmed);
    }
  }
}

const sorted = [...names].sort((a, b) => a.localeCompare(b));
console.log(`Extracted ${sorted.length} unique item/block names from mods.`);

// Write the output file
const lines = [];
lines.push('/** Minecraft + mod item/block names for /assign-gather autocomplete. */');
lines.push('module.exports = [');
for (const name of sorted) {
  lines.push(`  ${JSON.stringify(name)},`);
}
lines.push('];');
lines.push('');

fs.writeFileSync(OUT_FILE, lines.join('\n'));
console.log(`Written to ${OUT_FILE}`);
