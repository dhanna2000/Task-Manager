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
  getQuest,
  allocateQuestId,
  putQuest,
  updateQuest,
};
