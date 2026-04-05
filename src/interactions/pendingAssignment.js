/**
 * After someone picks an adventurer from the user select, we remember their choice
 * until the quest modal is submitted (or the entry expires).
 */

const TTL_MS = 15 * 60 * 1000; // 15 minutes — stops stale picks from sticking around forever

/** @type {Map<string, { assigneeId: string, expiresAt: number }>} */
const pending = new Map();

function remember(creatorUserId, assigneeId) {
  pending.set(creatorUserId, {
    assigneeId,
    expiresAt: Date.now() + TTL_MS,
  });
}

/** Read + remove the pending assignee for this creator (one quest per flow). */
function take(creatorUserId) {
  const row = pending.get(creatorUserId);
  pending.delete(creatorUserId);
  if (!row) return null;
  if (Date.now() > row.expiresAt) return null;
  return row.assigneeId;
}

module.exports = { remember, take };
