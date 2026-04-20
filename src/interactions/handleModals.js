const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const db = require('../storage/database');
const { MODAL, FIELDS } = require('../utils/ids');
const { parseDiscordUserId } = require('../utils/parseAssignee');
const questDraft = require('./questDraft');
const gatherDraft = require('./gatherDraft');
const { STATUS, buildQuestEmbed, questComponents } = require('../utils/embeds');
const { parseSubtasksFromText } = require('../utils/subtasks');

/** Board button: full form (no slash dropdowns available). */
function buildCreateQuestModal() {
  const modal = new ModalBuilder().setCustomId(MODAL.CREATE).setTitle('New Quest');

  const titleInput = new TextInputBuilder()
    .setCustomId(FIELDS.TITLE)
    .setLabel('Quest Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. Build a windmill near spawn');

  const descInput = new TextInputBuilder()
    .setCustomId(FIELDS.DESCRIPTION)
    .setLabel('Description / Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Extra cozy details for your fellow adventurers…');

  const assigneeInput = new TextInputBuilder()
    .setCustomId(FIELDS.ASSIGNEE)
    .setLabel('Assignee (@mention or user ID)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('@Steve or paste their user ID');

  const categoryInput = new TextInputBuilder()
    .setCustomId(FIELDS.CATEGORY)
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50)
    .setPlaceholder('Mining, Build, Farming — or a new name');

  const subtasksInput = new TextInputBuilder()
    .setCustomId(FIELDS.SUBTASKS)
    .setLabel('Subtasks (optional — one per line)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder('Gather oak logs\nBuild the frame\nAdd the roof');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(assigneeInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(subtasksInput)
  );

  return modal;
}

/** After `/create-quest` with assignee + category already chosen. */
function buildCreateQuestModalSlash() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL.CREATE_SLASH)
    .setTitle('New Quest');

  const titleInput = new TextInputBuilder()
    .setCustomId(FIELDS.TITLE)
    .setLabel('Quest Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. Build a windmill near spawn');

  const descInput = new TextInputBuilder()
    .setCustomId(FIELDS.DESCRIPTION)
    .setLabel('Description / Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Extra cozy details for your fellow adventurers…');

  const subtasksInput = new TextInputBuilder()
    .setCustomId(FIELDS.SUBTASKS)
    .setLabel('Subtasks (optional — one per line)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder('Step one\nStep two');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(subtasksInput)
  );
  return modal;
}

function buildCreateQuestModalSlashOther() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL.CREATE_SLASH_OTHER)
    .setTitle('New Quest (custom category)');

  const titleInput = new TextInputBuilder()
    .setCustomId(FIELDS.TITLE)
    .setLabel('Quest Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. Build a windmill near spawn');

  const descInput = new TextInputBuilder()
    .setCustomId(FIELDS.DESCRIPTION)
    .setLabel('Description / Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Extra cozy details for your fellow adventurers…');

  const catInput = new TextInputBuilder()
    .setCustomId(FIELDS.CATEGORY_CUSTOM)
    .setLabel('Category name')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50)
    .setPlaceholder('e.g. Redstone, Lore, PvP');

  const subtasksInput = new TextInputBuilder()
    .setCustomId(FIELDS.SUBTASKS)
    .setLabel('Subtasks (optional — one per line)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000)
    .setPlaceholder('Step one\nStep two');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(catInput),
    new ActionRowBuilder().addComponents(subtasksInput)
  );
  return modal;
}

/** After `/assign-gather` with assignee already chosen. */
function buildGatherModalSlash() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL.GATHER_SLASH)
    .setTitle('Assign gather');

  const titleInput = new TextInputBuilder()
    .setCustomId(FIELDS.TITLE)
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('e.g. Stock the community chest');

  const descInput = new TextInputBuilder()
    .setCustomId(FIELDS.DESCRIPTION)
    .setLabel('Notes (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500)
    .setPlaceholder('Where to put things, stack sizes, etc.');

  const itemsInput = new TextInputBuilder()
    .setCustomId(FIELDS.SUBTASKS)
    .setLabel('Blocks / items — one per line')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder('64× cobblestone\n2 stacks oak logs\n1× shulker of sand');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(itemsInput)
  );
  return modal;
}

function showEditCategoriesModal(interaction) {
  const guildId = interaction.guild.id;
  const names = db.getCategories(guildId);
  const modal = new ModalBuilder()
    .setCustomId(MODAL.EDIT_CATEGORIES)
    .setTitle('Quest categories');

  const lines = new TextInputBuilder()
    .setCustomId(FIELDS.CATEGORY_LINES)
    .setLabel('One category per line (max 24)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setValue(names.join('\n'));

  modal.addComponents(new ActionRowBuilder().addComponents(lines));
  return interaction.showModal(modal);
}

async function assertBoardChannel(interaction) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: 'Quests need a proper server channel to live in.',
      ephemeral: true,
    });
    return false;
  }
  const guildId = interaction.guild.id;
  const board = db.getBoard(guildId);
  if (!board || String(board.channelId) !== String(interaction.channel.id)) {
    await interaction.reply({
      content:
        'This channel isn’t the active Quest Board. Ask an admin to run `/setup-quests` here first, then try again.',
      ephemeral: true,
    });
    return false;
  }
  return true;
}

async function assertItemCollectionChannel(interaction) {
  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: 'Gather orders need a proper server channel to live in.',
      ephemeral: true,
    });
    return false;
  }
  const guildId = interaction.guild.id;
  const itemCh = db.getItemCollectionChannel(guildId);
  const hereId = String(interaction.channel.id);

  if (!itemCh) {
    await interaction.reply({
      content:
        '**Item collection isn’t set up yet.** An admin must run **`/setup-quests item-collection`** in the channel where you use **`/assign-gather`**, then submit the form again.',
      ephemeral: true,
    });
    return false;
  }

  if (String(itemCh) !== hereId) {
    await interaction.reply({
      content: `This form must be submitted from <#${itemCh}>. Open \`/assign-gather\` there (item collection channel — not the Quest Board).`,
      ephemeral: true,
    });
    return false;
  }
  return true;
}

/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {{ title: string, description: string, category: string, assigneeId: string, subtasks?: { label: string, done: boolean }[], kind?: 'gather' }} params
 */
async function postQuest(interaction, { title, description, category, assigneeId, subtasks = [], kind }) {
  let assigneeUser;
  try {
    assigneeUser = await interaction.client.users.fetch(assigneeId);
  } catch {
    await interaction.reply({
      content: 'I couldn’t find that user. Check the mention or ID.',
      ephemeral: true,
    });
    return true;
  }

  const inGuild = await interaction.guild.members.fetch(assigneeId).catch(() => null);
  if (!inGuild) {
    await interaction.reply({
      content:
        'That person isn’t in this server (or I can’t see them). Pick someone on the member list.',
      ephemeral: true,
    });
    return true;
  }

  await interaction.deferReply({ ephemeral: true });

  const creatorMention = `<@${interaction.user.id}>`;
  const assigneeMention = `<@${assigneeUser.id}>`;

  const questId = db.allocateQuestId();
  const createdAt = Date.now();

  const resolvedCategory = kind === 'gather' ? 'Gather' : category;

  const quest = {
    id: questId,
    guildId: interaction.guild.id,
    channelId: interaction.channel.id,
    messageId: '',
    title,
    description,
    category: resolvedCategory,
    subtasks,
    creatorId: interaction.user.id,
    assigneeId: assigneeUser.id,
    status: STATUS.NOT_STARTED,
    createdAt,
    completedAt: null,
    ...(kind === 'gather' ? { kind: 'gather' } : {}),
  };

  const embed = buildQuestEmbed(quest, {
    assigneeMention,
    creatorMention,
  });

  let message;
  try {
    message = await interaction.channel.send({
      embeds: [embed],
      components: questComponents(quest),
    });
  } catch (e) {
    console.error(e);
    await interaction.editReply({
      content: 'Couldn’t post the quest card. Check that I can send messages and embeds here.',
    });
    return true;
  }

  quest.messageId = message.id;
  db.putQuest(quest);

  const doneLine =
    kind === 'gather'
      ? `Gather order **${title}** is on the board for ${assigneeMention}.`
      : `Nice — **${title}** is on the board and assigned to ${assigneeMention}.`;
  await interaction.editReply({
    content: doneLine,
  });

  return true;
}

/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleModalSubmit(interaction) {
  if (interaction.customId === MODAL.EDIT_CATEGORIES) {
    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({
        content: 'Categories can only be edited from a server channel.',
        ephemeral: true,
      });
      return true;
    }
    const guildId = interaction.guild.id;
    const board = db.getBoard(guildId);
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      await interaction.reply({
        content: 'Use **Edit categories** on the Quest Board channel.',
        ephemeral: true,
      });
      return true;
    }
    const raw = interaction.fields.getTextInputValue(FIELDS.CATEGORY_LINES);
    const lines = raw
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const saved = db.setCategories(guildId, lines);
    await interaction.reply({
      ephemeral: true,
      content: `Saved **${saved.length}** category names (used for **Quest snapshot** grouping and as suggestions).`,
    });
    return true;
  }

  if (interaction.customId === MODAL.GATHER_SLASH) {
    if (!(await assertItemCollectionChannel(interaction))) return true;
    const draft = gatherDraft.take(interaction.user.id);
    if (!draft?.assigneeId) {
      await interaction.reply({
        content:
          'That session expired. Run **`/assign-gather`** again and pick who should gather.',
        ephemeral: true,
      });
      return true;
    }
    const title = interaction.fields.getTextInputValue(FIELDS.TITLE).trim();
    const description = interaction.fields.getTextInputValue(FIELDS.DESCRIPTION) ?? '';
    const subtasks = parseSubtasksFromText(
      interaction.fields.getTextInputValue(FIELDS.SUBTASKS) ?? ''
    );
    if (!title) {
      await interaction.reply({
        content: 'Give this gather order a **title**.',
        ephemeral: true,
      });
      return true;
    }
    if (subtasks.length === 0) {
      await interaction.reply({
        content: 'List at least one **block or item** (one per line).',
        ephemeral: true,
      });
      return true;
    }
    return postQuest(interaction, {
      title,
      description,
      category: 'Gather',
      assigneeId: draft.assigneeId,
      subtasks,
      kind: 'gather',
    });
  }

  if (interaction.customId === MODAL.CREATE_SLASH) {
    if (!(await assertBoardChannel(interaction))) return true;
    const draft = questDraft.take(interaction.user.id);
    if (!draft?.assigneeId || draft.categoryValue == null) {
      await interaction.reply({
        content:
          'That session expired. Run **`/create-quest`** again and pick assignee + category.',
        ephemeral: true,
      });
      return true;
    }
    if (draft.categoryValue === '__other__') {
      await interaction.reply({
        content: 'Something got out of sync — run **`/create-quest`** again.',
        ephemeral: true,
      });
      return true;
    }
    const title = interaction.fields.getTextInputValue(FIELDS.TITLE).trim();
    const description = interaction.fields.getTextInputValue(FIELDS.DESCRIPTION) ?? '';
    const category = String(draft.categoryValue).trim();
    if (!title) {
      await interaction.reply({
        content: 'Every quest needs a **title**.',
        ephemeral: true,
      });
      return true;
    }
    if (!category) {
      await interaction.reply({
        content: 'Missing category — try **`/create-quest`** again.',
        ephemeral: true,
      });
      return true;
    }
    const subtasks = parseSubtasksFromText(
      interaction.fields.getTextInputValue(FIELDS.SUBTASKS) ?? ''
    );
    return postQuest(interaction, {
      title,
      description,
      category,
      assigneeId: draft.assigneeId,
      subtasks,
    });
  }

  if (interaction.customId === MODAL.CREATE_SLASH_OTHER) {
    if (!(await assertBoardChannel(interaction))) return true;
    const draft = questDraft.take(interaction.user.id);
    if (!draft?.assigneeId || draft.categoryValue !== '__other__') {
      await interaction.reply({
        content:
          'That session expired. Run **`/create-quest`** again and pick **Other** for category.',
        ephemeral: true,
      });
      return true;
    }
    const title = interaction.fields.getTextInputValue(FIELDS.TITLE).trim();
    const description = interaction.fields.getTextInputValue(FIELDS.DESCRIPTION) ?? '';
    const category = (
      interaction.fields.getTextInputValue(FIELDS.CATEGORY_CUSTOM) ?? ''
    ).trim();
    if (!title) {
      await interaction.reply({
        content: 'Every quest needs a **title**.',
        ephemeral: true,
      });
      return true;
    }
    if (!category) {
      await interaction.reply({
        content: 'Give this quest a **category name**.',
        ephemeral: true,
      });
      return true;
    }
    const subtasks = parseSubtasksFromText(
      interaction.fields.getTextInputValue(FIELDS.SUBTASKS) ?? ''
    );
    return postQuest(interaction, {
      title,
      description,
      category,
      assigneeId: draft.assigneeId,
      subtasks,
    });
  }

  if (interaction.customId !== MODAL.CREATE) return false;

  if (!(await assertBoardChannel(interaction))) return true;

  const title = interaction.fields.getTextInputValue(FIELDS.TITLE).trim();
  const description = interaction.fields.getTextInputValue(FIELDS.DESCRIPTION) ?? '';
  const assigneeRaw = interaction.fields.getTextInputValue(FIELDS.ASSIGNEE);
  const category = (interaction.fields.getTextInputValue(FIELDS.CATEGORY) ?? '').trim();

  const assigneeId = parseDiscordUserId(assigneeRaw);
  if (!assigneeId) {
    await interaction.reply({
      content:
        '**Assignee** must be a **@mention** (click the user) or their **numeric user ID**.',
      ephemeral: true,
    });
    return true;
  }

  if (!category) {
    await interaction.reply({
      content: 'Give this quest a **category** (one short word or phrase).',
      ephemeral: true,
    });
    return true;
  }

  if (!title) {
    await interaction.reply({
      content: 'Every quest needs a **title**.',
      ephemeral: true,
    });
    return true;
  }

  const subtasks = parseSubtasksFromText(
    interaction.fields.getTextInputValue(FIELDS.SUBTASKS) ?? ''
  );
  return postQuest(interaction, { title, description, category, assigneeId, subtasks });
}

module.exports = {
  buildCreateQuestModal,
  buildCreateQuestModalSlash,
  buildCreateQuestModalSlashOther,
  buildGatherModalSlash,
  showEditCategoriesModal,
  handleModalSubmit,
};
