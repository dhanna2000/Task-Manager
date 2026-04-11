const { EmbedBuilder } = require('discord.js');
const { STATUS } = require('./embeds');

/** Rows per image-page (keeps each embed description under Discord’s limit). */
const ROWS_PER_PAGE = 20;

const COL = {
  id: { max: 10, h: 'ID' },
  quest: { max: 36, h: 'Quest' },
  assignee: { max: 18, h: 'Assignee' },
  status: { max: 12, h: 'Status' },
  category: { max: 14, h: 'Category' },
  created: { max: 13, h: 'Created' },
  completed: { max: 13, h: 'Completed' },
};

const WIDTHS = [
  COL.id.max,
  COL.quest.max,
  COL.assignee.max,
  COL.status.max,
  COL.category.max,
  COL.created.max,
  COL.completed.max,
];

function statusLabel(status) {
  if (status === STATUS.COMPLETED) return 'Done';
  if (status === STATUS.WORKING) return 'Working';
  return 'Not started';
}

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function trunc(s, max) {
  const t = String(s ?? '');
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function cell(s, max) {
  return trunc(s, max).padEnd(max, ' ');
}

function rowLine(cells, widths) {
  const parts = cells.map((c, i) => ` ${cell(c, widths[i])} `);
  return `│${parts.join('│')}│`;
}

function sepLine(widths, left, mid, right) {
  const segs = widths.map((w) => '─'.repeat(w + 2));
  return `${left}${segs.join(mid)}${right}`;
}

/**
 * Unicode box-drawing grid (best inside a markdown code block).
 * @param {object[]} quests slice, pre-sorted
 * @param {Map<string, string>} assigneeNames
 */
function buildBoxDrawingTable(quests, assigneeNames) {
  const headerCells = [
    COL.id.h,
    COL.quest.h,
    COL.assignee.h,
    COL.status.h,
    COL.category.h,
    COL.created.h,
    COL.completed.h,
  ];

  const dataRows = quests.map((q) => {
    const id = `Q-${String(q.id).padStart(4, '0')}`;
    const assignee =
      assigneeNames.get(String(q.assigneeId)) || String(q.assigneeId).slice(0, 8);
    return [
      id,
      q.title || '—',
      assignee,
      statusLabel(q.status),
      (q.category || '').trim() || '—',
      fmtDate(q.createdAt),
      fmtDate(q.completedAt),
    ];
  });

  const lines = [];
  lines.push(sepLine(WIDTHS, '┌', '┬', '┐'));
  lines.push(rowLine(headerCells, WIDTHS));
  lines.push(sepLine(WIDTHS, '├', '┼', '┤'));
  for (const r of dataRows) {
    lines.push(rowLine(r, WIDTHS));
  }
  lines.push(sepLine(WIDTHS, '└', '┴', '┘'));

  return lines.join('\n');
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {object[]} quests
 */
async function buildAssigneeNameMap(guild, quests) {
  const ids = [...new Set(quests.map((q) => String(q.assigneeId)))];
  const map = new Map();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const m = await guild.members.fetch(id).catch(() => null);
        map.set(id, m?.displayName || m?.user?.username || id);
      } catch {
        map.set(id, id);
      }
    })
  );
  return map;
}

/**
 * Sorted / filtered list + assignee display names (shared by text table + PNG).
 * @param {import('discord.js').Guild} guild
 * @param {object[]} quests
 * @param {{ filter?: (q: object) => boolean, sort: (a: object, b: object) => number }} opts
 */
async function prepareQuestTableData(guild, quests, { filter, sort }) {
  let list = [...quests];
  if (filter) list = list.filter(filter);
  list.sort(sort);
  const nameMap = list.length ? await buildAssigneeNameMap(guild, list) : new Map();
  return { quests: list, nameMap };
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {object[]} quests
 * @param {object} opts
 */
async function buildTableEmbeds(guild, quests, opts) {
  const {
    filter,
    sort,
    title,
    contTitle,
    emptyTitle,
    emptyDesc,
    color,
  } = opts;

  let list = [...quests];
  if (filter) list = list.filter(filter);
  list.sort(sort);

  if (list.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(color)
        .setTitle(emptyTitle)
        .setDescription(emptyDesc),
    ];
  }

  const nameMap = await buildAssigneeNameMap(guild, list);
  const embeds = [];

  for (let i = 0; i < list.length; i += ROWS_PER_PAGE) {
    const slice = list.slice(i, i + ROWS_PER_PAGE);
    const table = buildBoxDrawingTable(slice, nameMap);
    const desc = `\`\`\`\n${table}\n\`\`\``;
    embeds.push(
      new EmbedBuilder()
        .setColor(color)
        .setTitle(embeds.length === 0 ? title : contTitle)
        .setDescription(desc)
    );
    if (embeds.length >= 10) break;
  }

  return embeds;
}

async function buildAllQuestsTableEmbeds(guild, quests) {
  return buildTableEmbeds(guild, quests, {
    sort: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
    title: '📋 All quests (everyone)',
    contTitle: '📋 All quests (continued)',
    emptyTitle: '📋 All quests',
    emptyDesc: '_No quests in this server yet._',
    color: 0x8bc34a,
  });
}

async function buildCompletedQuestsTableEmbeds(guild, quests) {
  return buildTableEmbeds(guild, quests, {
    filter: (q) => q.status === STATUS.COMPLETED,
    sort: (a, b) => (b.completedAt || 0) - (a.completedAt || 0),
    title: '🏆 Completed quests',
    contTitle: '🏆 Completed quests (continued)',
    emptyTitle: '🏆 Completed quests',
    emptyDesc: '_No completed quests saved yet._',
    color: 0x57f287,
  });
}

module.exports = {
  buildAllQuestsTableEmbeds,
  buildCompletedQuestsTableEmbeds,
  prepareQuestTableData,
};
