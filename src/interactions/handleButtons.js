const db = require('../storage/database');
const { BOARD, parseQuestButton } = require('../utils/ids');
const { showAssigneePicker } = require('./handleModals');
const { STATUS, buildQuestEmbed, questComponents } = require('../utils/embeds');

async function fetchQuestMessage(interaction, quest) {
  let msg = interaction.message?.id === quest.messageId ? interaction.message : null;
  if (!msg && interaction.guild) {
    const channel = await interaction.guild.channels.fetch(quest.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      msg = await channel.messages.fetch(quest.messageId).catch(() => null);
    }
  }
  return msg;
}

/** Re-paint embed + disabled buttons (fixes rare failed edits; harmless if already correct). */
async function syncQuestCard(interaction, quest) {
  try {
    const msg = await fetchQuestMessage(interaction, quest);
    if (!msg) return;
    const embed = buildQuestEmbed(quest, {
      assigneeMention: `<@${quest.assigneeId}>`,
      creatorMention: `<@${quest.creatorId}>`,
    });
    await msg.edit({ embeds: [embed], components: questComponents(quest) });
  } catch {
    /* ignore — channel perms or deleted message */
  }
}

/**
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleButton(interaction) {
  if (interaction.customId === BOARD.CREATE_BUTTON) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'Oops — this button only works in a server text channel.',
        ephemeral: true,
      });
    }
    const board = db.getBoard(interaction.guild.id);
    if (!board || board.channelId !== interaction.channel.id) {
      return interaction.reply({
        content:
          'This isn’t the active Quest Board channel anymore. Ask an admin to run `/setup-quests` in the right spot.',
        ephemeral: true,
      });
    }
    return showAssigneePicker(interaction);
  }

  const parsed = parseQuestButton(interaction.customId);
  if (!parsed) return false;

  const quest = db.getQuest(parsed.questId);
  if (!quest) {
    return interaction.reply({
      content: 'I can’t find that quest on file — maybe it was cleared from storage?',
      ephemeral: true,
    });
  }

  if (quest.guildId !== interaction.guild?.id) {
    return interaction.reply({
      content: 'That quest belongs to another realm (server).',
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  const isAssignee = userId === quest.assigneeId;
  const isCreator = userId === quest.creatorId;

  if (quest.status === STATUS.COMPLETED) {
    await syncQuestCard(interaction, quest);
    const lines = {
      start: 'This one’s already wrapped up — nice job, village!',
      complete: 'Quest completed! Nothing left to do here.',
      reset: 'Completed quests stay in the book — no rewind after the trophy moment.',
    };
    return interaction.reply({
      content: lines[parsed.action] ?? 'This quest is already in the “done” chest.',
      ephemeral: true,
    });
  }

  if (parsed.action === 'start') {
    if (!isAssignee) {
      return interaction.reply({
        content: 'Only the assigned adventurer can start this quest.',
        ephemeral: true,
      });
    }
    if (quest.status === STATUS.WORKING) {
      return interaction.reply({
        content: 'This quest is already being worked on.',
        ephemeral: true,
      });
    }
    const next = db.updateQuest(quest.id, { status: STATUS.WORKING });
    return refreshQuestMessage(interaction, next, 'start');
  }

  if (parsed.action === 'complete') {
    if (!isAssignee && !isCreator) {
      return interaction.reply({
        content: 'Only the assigned adventurer or the quest creator can complete this quest.',
        ephemeral: true,
      });
    }
    const next = db.updateQuest(quest.id, {
      status: STATUS.COMPLETED,
      completedAt: Date.now(),
    });
    return refreshQuestMessage(interaction, next, 'complete');
  }

  if (parsed.action === 'reset') {
    if (!isAssignee && !isCreator) {
      return interaction.reply({
        content: 'Only the assigned adventurer or the creator can reset this quest.',
        ephemeral: true,
      });
    }
    if (quest.status === STATUS.NOT_STARTED) {
      return interaction.reply({
        content: 'Already fresh — this quest hasn’t been started yet.',
        ephemeral: true,
      });
    }
    const next = db.updateQuest(quest.id, { status: STATUS.NOT_STARTED });
    return refreshQuestMessage(interaction, next, 'reset');
  }

  return false;
}

const EPHEMERAL_NOTES = {
  start: 'Off you go — this quest is now **Working On It**!',
  complete: '🏆 Quest completed! Celebratory fist-bump.',
  reset: 'Back to **Not Started** — take a breath and try again when you’re ready.',
};

async function refreshQuestMessage(interaction, quest, noteKind) {
  if (!quest) {
    return interaction.reply({
      content: 'Something went wrong saving the quest. Try again in a moment.',
      ephemeral: true,
    });
  }

  const embed = buildQuestEmbed(quest, {
    assigneeMention: `<@${quest.assigneeId}>`,
    creatorMention: `<@${quest.creatorId}>`,
  });
  const components = questComponents(quest);

  try {
    const msg = await fetchQuestMessage(interaction, quest);
    if (msg) {
      await msg.edit({ embeds: [embed], components });
    } else {
      await interaction.reply({
        content: 'Updated the quest, but I couldn’t refresh the card message.',
        ephemeral: true,
      });
      return;
    }
  } catch (e) {
    console.error(e);
    await interaction.reply({
      content:
        'Couldn’t update the quest card. The save went through — check that I can manage messages in this channel.',
      ephemeral: true,
    });
    return;
  }

  return interaction.reply({
    content: EPHEMERAL_NOTES[noteKind] ?? 'Quest updated!',
    ephemeral: true,
  });
}

module.exports = { handleButton };
