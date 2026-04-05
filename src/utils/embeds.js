const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

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
 */
function buildBoardEmbed() {
  return new EmbedBuilder()
    .setColor(0x8bc34a)
    .setTitle('🗺️ Quest Board')
    .setDescription(
      [
        'Got an idea for the server? Turn it into a **quest**.',
        'Assign it to yourself or a friend and keep the village moving.',
        '',
        '*No pressure, no deadlines — just shared server goals.*',
      ].join('\n')
    )
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
          'After **Create Quest**, pick an adventurer from Discord’s **user menu**, then name the quest in the popup. ' +
          'Only that adventurer can **Start Quest**; either of you can **Complete Quest** (yep, even straight from fresh dirt if you like).',
      }
    )
    .setFooter({ text: 'Cozy server goals & silly builds — keep the realm chill.' });
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

  return new EmbedBuilder()
    .setColor(COLORS[quest.status] ?? COLORS[STATUS.NOT_STARTED])
    .setTitle(`📜 ${quest.title}`)
    .setDescription(
      [
        `**Notes** · ${desc}`,
        '',
        `**Category** · ${category}`,
      ].join('\n')
    )
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

/** Button row for a quest card — custom IDs must stay `quest:{action}:{id}` for handlers. */
function questComponents(quest) {
  const completed = quest.status === STATUS.COMPLETED;
  const start = new ButtonBuilder()
    .setCustomId(`quest:start:${quest.id}`)
    .setLabel('Start Quest')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(completed || quest.status === STATUS.WORKING);

  const complete = new ButtonBuilder()
    .setCustomId(`quest:complete:${quest.id}`)
    .setLabel('Complete Quest')
    .setEmoji('🏆')
    .setStyle(ButtonStyle.Success)
    .setDisabled(completed);

  const reset = new ButtonBuilder()
    .setCustomId(`quest:reset:${quest.id}`)
    .setLabel('Reset')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(completed || quest.status !== STATUS.WORKING);

  return [new ActionRowBuilder().addComponents(start, complete, reset)];
}

module.exports = {
  STATUS,
  buildBoardEmbed,
  buildQuestEmbed,
  questComponents,
};
