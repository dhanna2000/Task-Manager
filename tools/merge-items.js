/**
 * Merges the vanilla items backup with the freshly-extracted mod items,
 * deduplicates, sorts, and writes src/data/minecraft-items.js
 */

const fs = require('fs');
const path = require('path');

const VANILLA_FILE = path.join(__dirname, '../src/data/vanilla-items-backup.js');
const MOD_FILE = path.join(__dirname, '../src/data/minecraft-items.js');
const OUT_FILE = MOD_FILE;

// Parse a minecraft-items.js file and return the string array
function parseItemsFile(content) {
  const matches = [...content.matchAll(/'([^']+)'|"([^"\\]*(\\.[^"\\]*)*)"/g)];
  return matches.map(m => (m[1] || m[2]).replace(/\\"/g, '"').replace(/\\\\/g, '\\')).filter(Boolean);
}

const vanilla = parseItemsFile(fs.readFileSync(VANILLA_FILE, 'utf8'));
const mods = parseItemsFile(fs.readFileSync(MOD_FILE, 'utf8'));

const all = new Set([...vanilla, ...mods]);
const sorted = [...all].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

console.log(`Vanilla: ${vanilla.length}, Mod: ${mods.length}, Merged: ${sorted.length}`);

const lines = [];
lines.push('/** Minecraft vanilla + mod item/block names for /assign-gather autocomplete. */');
lines.push('module.exports = [');
for (const name of sorted) {
  lines.push(`  ${JSON.stringify(name)},`);
}
lines.push('];');
lines.push('');

fs.writeFileSync(OUT_FILE, lines.join('\n'));
console.log(`Written to ${OUT_FILE}`);
