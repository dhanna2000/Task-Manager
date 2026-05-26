/**
 * Carries slash-chosen assignee + accumulated items into the "Post gather card" button.
 */

const TTL_MS = 15 * 60 * 1000;

/**
 * @type {Map<string, { assigneeId: string, items: string[], title: string, expiresAt: number }>}
 */
const drafts = new Map();

function touch(userId, data) {
  drafts.set(userId, {
    ...data,
    expiresAt: Date.now() + TTL_MS,
  });
}

function get(userId) {
  const row = drafts.get(userId);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    drafts.delete(userId);
    return null;
  }
  return row;
}

function take(userId) {
  const row = get(userId);
  if (row) drafts.delete(userId);
  return row;
}

function addItem(userId, label) {
  const row = get(userId);
  if (!row) return false;
  if (!Array.isArray(row.items)) row.items = [];
  row.items.push(label);
  row.expiresAt = Date.now() + TTL_MS;
  drafts.set(userId, row);
  return true;
}

function remove(userId) {
  drafts.delete(userId);
}

module.exports = { touch, get, take, addItem, remove };
