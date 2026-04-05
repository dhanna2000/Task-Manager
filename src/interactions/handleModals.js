const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} = require('discord.js');
const db = require('../storage/database');
const { MODAL, FIELDS, BOARD } = require('../utils/ids');
const { remember, take } = require('./pendingAssignment');
const { STATUS, buildQuestEmbed, questComponents } = require('../utils/embeds');

function buildCreateQuestModal() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL.CREATE)
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

  const catInput = new TextInputBuilder()
    .setCustomId(FIELDS.CATEGORY)
    .setLabel('Category (optional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(50)
    .setPlaceholder('Build, Mining, Decoration, Create Mod…');

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(catInput)
  );

  return modal;
}

/** Ephemeral reply with native user picker (after “Create Quest” button). */
function showAssigneePicker(interaction) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(BOARD.PICK_ADVENTURER)
    .setPlaceholder('Choose an adventurer for this quest')
    .setMinValues(1)
    .setMaxValues(1);

  return interaction.reply({
    ephemeral: true,
    content:
      '**Who’s taking this quest?** Pick someone from the list — then you’ll get the little form to name it.',
    components: [new ActionRowBuilder().addComponents(select)],
  });
}

async function openCreateQuestModal(interaction) {
  await interaction.showModal(buildCreateQuestModal());
}

/**
 * User picked an adventurer from the dropdown — remember ID, then open the modal.
 * @param {import('discord.js').UserSelectMenuInteraction} interaction
 */
async function handleUserSelect(interaction) {
  if (interaction.customId !== BOARD.PICK_ADVENTURER) return false;

  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: 'That only works inside a server channel.',
      ephemeral: true,
    });
    return true;
  }

  const guildId = interaction.guild.id;
  const board = db.getBoard(guildId);
  if (!board || board.channelId !== interaction.channel.id) {
    await interaction.reply({
      content:
        'This isn’t the active Quest Board channel anymore. Ask an admin to run `/setup-quests` here.',
      ephemeral: true,
    });
    return true;
  }

  const assigneeId = interaction.values[0];
  remember(interaction.user.id, assigneeId);
  await openCreateQuestModal(interaction);
  return true;
}

/**
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function handleModalSubmit(interaction) {
  if (interaction.customId !== MODAL.CREATE) return false;

  if (!interaction.guild || !interaction.channel) {
    await interaction.reply({
      content: 'Quests need a proper server channel to live in.',
      ephemeral: true,
    });
    return true;
  }

  const guildId = interaction.guild.id;
  const board = db.getBoard(guildId);
  if (!board || board.channelId !== interaction.channel.id) {
    await interaction.reply({
      content:
        'This channel isn’t the active Quest Board. Ask an admin to run `/setup-quests` here first, then try again.',
      ephemeral: true,
    });
    return true;
  }

  const assigneeId = take(interaction.user.id);
  if (!assigneeId) {
    await interaction.reply({
      content: 'Something went wrong picking the adventurer. Try again.',
      ephemeral: true,
    });
    return true;
  }

  const title = interaction.fields.getTextInputValue(FIELDS.TITLE).trim();
  const description = interaction.fields.getTextInputValue(FIELDS.DESCRIPTION) ?? '';
  const category = interaction.fields.getTextInputValue(FIELDS.CATEGORY) ?? '';

  if (!title) {
    remember(interaction.user.id, assigneeId);
    await interaction.reply({
      content: 'Every quest needs a name — pop in a short title and submit again.',
      ephemeral: true,
    });
    return true;
  }

  let assigneeUser;
  try {
    assigneeUser = await interaction.client.users.fetch(assigneeId);
  } catch {
    remember(interaction.user.id, assigneeId);
    await interaction.reply({
      content: 'Something went wrong picking the adventurer. Try again.',
      ephemeral: true,
    });
    return true;
  }

  const inGuild = await interaction.guild.members.fetch(assigneeId).catch(() => null);
  if (!inGuild) {
    remember(interaction.user.id, assigneeId);
    await interaction.reply({
      content:
        'That adventurer isn’t in this server anymore (or I can’t see them). Fix the roster or pick someone else — open **Create Quest** again.',
      ephemeral: true,
    });
    return true;
  }

  await interaction.deferReply({ ephemeral: true });

  const creatorMention = `<@${interaction.user.id}>`;
  const assigneeMention = `<@${assigneeUser.id}>`;

  const questId = db.allocateQuestId();
  const createdAt = Date.now();

  const quest = {
    id: questId,
    guildId,
    channelId: interaction.channel.id,
    messageId: '',
    title,
    description,
    category,
    creatorId: interaction.user.id,
    assigneeId: assigneeUser.id,
    status: STATUS.NOT_STARTED,
    createdAt,
    completedAt: null,
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

  await interaction.editReply({
    content: `Nice — **${title}** is on the board and assigned to ${assigneeMention}.`,
  });

  return true;
}

module.exports = {
  showAssigneePicker,
  handleUserSelect,
  handleModalSubmit,
};
