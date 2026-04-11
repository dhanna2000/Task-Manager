/** Max subtasks we can show as buttons (5 rows × 5 buttons − main row = 20, stay under 5 rows total). */
const MAX_SUBTASKS = 20;

/**
 * @param {string} [raw]
 * @returns {{ label: string, done: boolean }[]}
 */
function parseSubtasksFromText(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_SUBTASKS)
    .map((label) => ({ label: label.slice(0, 200), done: false }));
}

/** @param {object | null | undefined} quest */
function getSubtasks(quest) {
  if (!quest || !Array.isArray(quest.subtasks)) return [];
  return quest.subtasks.filter((s) => s && typeof s.label === 'string');
}

function allSubtasksDone(quest) {
  const subs = getSubtasks(quest);
  return subs.length > 0 && subs.every((s) => s.done);
}

/**
 * @param {{ label: string, done: boolean }[]} subtasks
 */
function formatSubtasksForEmbed(subtasks) {
  if (!subtasks.length) return '';
  return subtasks
    .map((s) => `${s.done ? '☑' : '☐'} ${s.label}`)
    .join('\n');
}

module.exports = {
  MAX_SUBTASKS,
  parseSubtasksFromText,
  getSubtasks,
  allSubtasksDone,
  formatSubtasksForEmbed,
};
