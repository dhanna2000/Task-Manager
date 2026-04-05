/**
 * Custom IDs for buttons/modals (must stay stable for persistence across restarts).
 * Keep under Discord's 100-char limit.
 */

const BOARD = {
  CREATE_BUTTON: 'questBoard:create',
  /** User select on ephemeral “pick adventurer” message */
  PICK_ADVENTURER: 'questBoard:pickAdventurer',
};

const MODAL = {
  CREATE: 'questModal:create',
};

const FIELDS = {
  TITLE: 'q_title',
  DESCRIPTION: 'q_desc',
  CATEGORY: 'q_cat',
};

function parseQuestButton(customId) {
  // quest:start:42
  const parts = customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'quest') return null;
  const id = parseInt(parts[2], 10);
  if (Number.isNaN(id)) return null;
  return { action: parts[1], questId: id };
}

module.exports = {
  BOARD,
  MODAL,
  FIELDS,
  parseQuestButton,
};
