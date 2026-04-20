const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { BOARD } = require('./ids');
const {
  getSubtasks,
  formatSubtasksForEmbed,
} = require('./subtasks');

/** Status keys stored in JSON */
const STATUS = {
  NOT_STARTED: 'not_started',
  WORKING: 'working',
  COMPLETED: 'completed',
};

const STATUS_DISPLAY = {
  [STATUS.NOT_STARTED]: { line: '🪵 Not Started', bar: '[🟫⬜⬜]' },
  [STATUS.WORKING]: { line: '⚒️ Working On It', bar: '[🟫🟨⬜]' },
  [STATUS.COMPLETED]: { line: '🏆 Completed', bar: '[🟫🟨🟩]' },
};

/** Embed colors (decimal) — earthy / active / success */
const COLORS = {
  [STATUS.NOT_STARTED]: 0xc4a574,
  [STATUS.WORKING]: 0xf0b429,
  [STATUS.COMPLETED]: 0x57f287,
};

function questIdLabel(id) {
  return `Q-${String(id).padStart(4, '0')}`;
}

/**
 * Welcome embed for the pinned-style Quest Board message.
 * @param {{ archiveHint?: string }} [opts]
 */
function buildBoardEmbed(opts = {}) {
  const { archiveHint } = opts;
  const lines = [
    'Got an idea for the server? Turn it into a **quest**.',
    'Assign it to yourself or a friend and keep the village moving.',
    '',
    '*No pressure, no deadlines — just shared server goals.*',
  ];
  if (archiveHint) {
    lines.push('', `✅ **Finished quests** get filed in ${archiveHint}.`);
  }
  return new EmbedBuilder()
    .setColor(0x8bc34a)
    .setTitle('🗺️ Quest Board')
    .setDescription(lines.join('\n'))
    .addFields(
      {
        name: 'How it works',
        value:
          'Tap **Create Quest**, fill the little form, and a shiny new quest card pops up here. ' +
          'Every quest names an adventurer so the whole village knows who’s swinging the pickaxe.',
      },
      {
        name: 'Village tips',
        value:
          '**`/create-quest`** uses **dropdowns** for assignee + category, then a short modal (add **subtasks** as one line each). The **Create Quest** button uses the full form. ' +
          '**`/assign-gather`** lives in your **item collection** channel (admins: **`/setup-quests item-collection`** there) — list blocks/items like subtasks. ' +
          'Check off **subtasks** on the card, or use **Complete Quest** anytime. When every subtask is checked, the quest completes automatically. Admins: **Edit categories**.',
      }
    )
    .setFooter({ text: 'Cozy server goals & silly builds — keep the realm chill.' });
}

/** Board message: main row + categories row. */
function buildBoardComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BOARD.CREATE_BUTTON)
        .setLabel('Create Quest')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(BOARD.STATUS_BUTTON)
        .setLabel('Quest snapshot')
        .setEmoji('📊')
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BOARD.EDIT_CATEGORIES)
        .setLabel('Edit categories')
        .setEmoji('🏷️')
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

/**
 * Single quest card embed.
 */
function buildQuestEmbed(quest, { assigneeMention, creatorMention }) {
  const vis = STATUS_DISPLAY[quest.status] || STATUS_DISPLAY[STATUS.NOT_STARTED];
  const desc =
    quest.description && quest.description.trim().length > 0
      ? quest.description.trim()
      : '*No scroll — just vibes, dirt, and daylight.*';

  const category =
    quest.category && quest.category.trim().length > 0
      ? quest.category.trim()
      : '*None listed*';

  const createdUnix = Math.floor(quest.createdAt / 1000);
  const createdLine = `<t:${createdUnix}:F>`;

  let completedLine = '—';
  if (quest.completedAt) {
    const c = Math.floor(quest.completedAt / 1000);
    completedLine = `<t:${c}:F>`;
  }

  const isGather = quest.kind === 'gather';
  const cat = quest.category && quest.category.trim().length > 0 ? quest.category.trim() : '';
  const titleEmoji = isGather ? '📦' : '📜';
  let titleText = cat ? `${titleEmoji} [${cat}] ${quest.title}` : `${titleEmoji} ${quest.title}`;
  if (titleText.length > 256) titleText = `${titleText.slice(0, 252)}…`;

  const subs = getSubtasks(quest);
  let subtasksBlock = formatSubtasksForEmbed(subs);
  if (subtasksBlock.length > 1800) {
    subtasksBlock = `${subtasksBlock.slice(0, 1780)}\n… *(list truncated)*`;
  }

  const descLines = [`**Notes** · ${desc}`];
  if (subtasksBlock) {
    descLines.push('', isGather ? '**Items to collect**' : '**Subtasks**', subtasksBlock);
  }
  descLines.push('', `**Category** · ${category}`);

  return new EmbedBuilder()
    .setColor(COLORS[quest.status] ?? COLORS[STATUS.NOT_STARTED])
    .setTitle(titleText)
    .setDescription(descLines.join('\n'))
    .addFields(
      { name: 'Created by', value: creatorMention, inline: true },
      { name: 'Assigned to', value: assigneeMention, inline: true },
      { name: 'Status', value: `${vis.line}\n${vis.bar}`, inline: false },
      {
        name: 'Quest ID',
        value: `\`${questIdLabel(quest.id)}\``,
        inline: true,
      },
      {
        name: 'Created',
        value: createdLine,
        inline: true,
      },
      {
        name: 'Completed at',
        value: completedLine,
        inline: true,
      }
    );
}

function subtaskButtonLabel(s) {
  const prefix = s.done ? '☑ ' : '☐ ';
  const max = 80 - prefix.length;
  const t = s.label.length > max ? `${s.label.slice(0, Math.max(0, max - 1))}…` : s.label;
  return `${prefix}${t}`;
}

/** Main row + optional subtask toggle rows (max 5 component rows total). */
function questComponents(quest) {
  const isGather = quest.kind === 'gather';
  const completed = quest.status === STATUS.COMPLETED;
  const start = new ButtonBuilder()
    .setCustomId(`quest:start:${quest.id}`)
    .setLabel(isGather ? 'Start gathering' : 'Start Quest')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(completed || quest.status === STATUS.WORKING);

  const complete = new ButtonBuilder()
    .setCustomId(`quest:complete:${quest.id}`)
    .setLabel(isGather ? 'Complete' : 'Complete Quest')
    .setEmoji('🏆')
    .setStyle(ButtonStyle.Success)
    .setDisabled(completed);

  const reset = new ButtonBuilder()
    .setCustomId(`quest:reset:${quest.id}`)
    .setLabel('Reset')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(completed || quest.status !== STATUS.WORKING);

  const rows = [
    new ActionRowBuilder().addComponents(start, complete, reset),
  ];

  const subs = getSubtasks(quest);
  if (subs.length > 0 && !completed) {
    let row = new ActionRowBuilder();
    for (let i = 0; i < subs.length; i++) {
      if (rows.length >= 5) break;
      const s = subs[i];
      const btn = new ButtonBuilder()
        .setCustomId(`quest:subtask:${quest.id}:${i}`)
        .setLabel(subtaskButtonLabel(s))
        .setStyle(s.done ? ButtonStyle.Success : ButtonStyle.Secondary);
      if (row.components.length >= 5) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
      if (rows.length >= 5) break;
      row.addComponents(btn);
    }
    if (row.components.length > 0 && rows.length < 5) {
      rows.push(row);
    }
  }

  return rows;
}

module.exports = {
  STATUS,
  buildBoardEmbed,
  buildBoardComponents,
  buildQuestEmbed,
  questComponents,
};
