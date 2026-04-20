/**
 * Tiny JSON persistence — one file, easy to read and back up.
 * Good enough for a small friend server; swap for SQLite later if you outgrow it.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'quests.json');

const DEFAULT_STATE = {
  nextQuestId: 1,
  /** guildId -> { channelId, messageId } */
  boards: {},
  /** guildId -> channelId where completed quest cards are moved */
  archives: {},
  /** guildId -> channelId where /assign-gather runs and gather cards are posted */
  itemCollectionChannels: {},
  /** guildId -> string[] category names (max 24 used in dropdown + "Other") */
  categories: {},
  /** id -> quest record */
  quests: {},
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2), 'utf8');
  }
}

function loadState() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      nextQuestId: parsed.nextQuestId ?? 1,
      boards: parsed.boards ?? {},
      archives: parsed.archives ?? {},
      itemCollectionChannels: parsed.itemCollectionChannels ?? {},
      categories: parsed.categories ?? {},
      quests: parsed.quests ?? {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state) {
  ensureFile();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function getBoard(guildId) {
  const s = loadState();
  return s.boards[guildId] ?? null;
}

function setBoard(guildId, channelId, messageId) {
  const s = loadState();
  s.boards[guildId] = { channelId, messageId };
  saveState(s);
}

function getArchiveChannel(guildId) {
  const s = loadState();
  const key = String(guildId);
  const id = s.archives?.[key] ?? s.archives?.[guildId];
  return id != null ? String(id) : null;
}

function setArchiveChannel(guildId, channelId) {
  const s = loadState();
  if (!s.archives) s.archives = {};
  s.archives[String(guildId)] = String(channelId);
  saveState(s);
}

function getItemCollectionChannel(guildId) {
  const s = loadState();
  const key = String(guildId);
  const id = s.itemCollectionChannels?.[key] ?? s.itemCollectionChannels?.[guildId];
  return id != null ? String(id) : null;
}

function setItemCollectionChannel(guildId, channelId) {
  const s = loadState();
  if (!s.itemCollectionChannels) s.itemCollectionChannels = {};
  s.itemCollectionChannels[String(guildId)] = String(channelId);
  saveState(s);
}

/** All quests for a guild (for snapshots / stats). */
function getGuildQuests(guildId) {
  const s = loadState();
  return Object.values(s.quests).filter((q) => q.guildId === guildId);
}

const DEFAULT_CATEGORIES = ['Build', 'Mining', 'Farming', 'Decoration'];

/** Up to 24 names (+ UI adds “Other”) = 25 string-select options max. */
function getCategories(guildId) {
  const s = loadState();
  const custom = s.categories?.[String(guildId)] ?? [];
  const merged = [...new Set([...DEFAULT_CATEGORIES, ...custom])]
    .map((x) => String(x).trim())
    .filter(Boolean);
  merged.sort((a, b) => a.localeCompare(b));
  return merged.slice(0, 24);
}

function setCategories(guildId, names) {
  const s = loadState();
  if (!s.categories) s.categories = {};
  const cleaned = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))].slice(0, 24);
  s.categories[String(guildId)] = cleaned;
  saveState(s);
  return cleaned;
}

function getQuest(questId) {
  const s = loadState();
  return s.quests[String(questId)] ?? null;
}

/**
 * Reserve the next numeric id (call before posting the message so button IDs match).
 * If posting fails, you may skip a number — harmless for a small server.
 */
function allocateQuestId() {
  const s = loadState();
  const id = s.nextQuestId;
  s.nextQuestId += 1;
  saveState(s);
  return id;
}

/** Insert or replace a full quest record (usually right after the Discord message exists). */
function putQuest(quest) {
  const s = loadState();
  s.quests[String(quest.id)] = quest;
  saveState(s);
  return quest;
}

function updateQuest(questId, patch) {
  const s = loadState();
  const key = String(questId);
  const q = s.quests[key];
  if (!q) return null;
  const next = { ...q, ...patch };
  s.quests[key] = next;
  saveState(s);
  return next;
}

module.exports = {
  getBoard,
  setBoard,
  getArchiveChannel,
  setArchiveChannel,
  getItemCollectionChannel,
  setItemCollectionChannel,
  getGuildQuests,
  getCategories,
  setCategories,
  getQuest,
  allocateQuestId,
  putQuest,
  updateQuest,
};
