/**
 * Carries slash-chosen assignee + category into the follow-up modal submit.
 */

const TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { assigneeId: string, categoryValue: string, expiresAt: number }>} */
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

module.exports = { touch, get, take };
