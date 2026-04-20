/**
 * Custom IDs for buttons/modals (must stay stable for persistence across restarts).
 * Keep under Discord's 100-char limit.
 */

const BOARD = {
  CREATE_BUTTON: 'questBoard:create',
  STATUS_BUTTON: 'questBoard:status',
  EDIT_CATEGORIES: 'questBoard:editCategories',
};

const MODAL = {
  CREATE: 'questModal:create',
  /** Title + notes after slash picked assignee + category */
  CREATE_SLASH: 'questModal:createSlash',
  /** Same but category = Other → custom name field */
  CREATE_SLASH_OTHER: 'questModal:createSlashOther',
  /** After `/assign-gather` — assignee chosen, list items in modal */
  GATHER_SLASH: 'questModal:gatherSlash',
  EDIT_CATEGORIES: 'questModal:editCategories',
};

const FIELDS = {
  TITLE: 'q_title',
  DESCRIPTION: 'q_desc',
  /** @mention, <@id>, or raw user ID */
  ASSIGNEE: 'q_assignee',
  /** Free text — match guild list or invent a new one */
  CATEGORY: 'q_cat',
  /** Bulk edit for guild category list */
  CATEGORY_LINES: 'q_cat_lines',
  /** Slash flow when category = Other */
  CATEGORY_CUSTOM: 'q_cat_custom',
  /** One line per sub-task / todo */
  SUBTASKS: 'q_subtasks',
};

function parseQuestButton(customId) {
  const parts = customId.split(':');
  if (parts.length !== 3 || parts[0] !== 'quest') return null;
  const id = parseInt(parts[2], 10);
  if (Number.isNaN(id)) return null;
  return { action: parts[1], questId: id };
}

/** `quest:subtask:{questId}:{index}` */
function parseQuestSubtaskButton(customId) {
  const parts = customId.split(':');
  if (parts.length !== 4 || parts[0] !== 'quest' || parts[1] !== 'subtask') return null;
  const questId = parseInt(parts[2], 10);
  const subtaskIndex = parseInt(parts[3], 10);
  if (Number.isNaN(questId) || Number.isNaN(subtaskIndex)) return null;
  return { questId, subtaskIndex };
}

module.exports = {
  BOARD,
  MODAL,
  FIELDS,
  parseQuestButton,
  parseQuestSubtaskButton,
};
