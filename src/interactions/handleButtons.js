const { PermissionFlagsBits } = require('discord.js');
const db = require('../storage/database');
const { BOARD, parseQuestButton, parseQuestSubtaskButton } = require('../utils/ids');
const { getSubtasks, allSubtasksDone } = require('../utils/subtasks');
const { showEditCategoriesModal, buildCreateQuestModal } = require('./handleModals');
const { STATUS, buildQuestEmbed, questComponents } = require('../utils/embeds');
const { buildStatusSnapshotEmbed } = require('../utils/statusSnapshot');

function sameMessageId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

async function fetchQuestMessage(interaction, quest) {
  let msg = sameMessageId(interaction.message?.id, quest.messageId) ? interaction.message : null;
  if (!msg && interaction.guild) {
    const channel = await interaction.guild.channels.fetch(String(quest.channelId)).catch(() => null);
    if (channel?.isTextBased()) {
      msg = await channel.messages.fetch(String(quest.messageId)).catch(() => null);
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
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      return interaction.reply({
        content:
          'This isn’t the active Quest Board channel anymore. Ask an admin to run `/setup-quests` in the right spot.',
        ephemeral: true,
      });
    }
    return interaction.showModal(buildCreateQuestModal());
  }

  if (interaction.customId === BOARD.EDIT_CATEGORIES) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'This only works in a server channel.',
        ephemeral: true,
      });
    }
    const board = db.getBoard(interaction.guild.id);
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      return interaction.reply({
        content: 'Use **Edit categories** on the active Quest Board channel.',
        ephemeral: true,
      });
    }
    const member = interaction.member;
    const canManage =
      member?.permissions?.has(PermissionFlagsBits.Administrator) ||
      member?.permissions?.has(PermissionFlagsBits.ManageGuild);
    if (!canManage) {
      return interaction.reply({
        content: 'Only **server admins** (or **Manage Server**) can edit the category list.',
        ephemeral: true,
      });
    }
    return showEditCategoriesModal(interaction);
  }

  if (interaction.customId === BOARD.STATUS_BUTTON) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'This button only works in a server channel.',
        ephemeral: true,
      });
    }
    const board = db.getBoard(interaction.guild.id);
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      return interaction.reply({
        content:
          'Use **Quest snapshot** on the active Quest Board channel. Ask an admin to run `/setup-quests board` there.',
        ephemeral: true,
      });
    }
    const quests = db.getGuildQuests(interaction.guild.id);
    const archiveId = db.getArchiveChannel(interaction.guild.id);
    const embed = buildStatusSnapshotEmbed(interaction.guild, quests, archiveId);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const subParsed = parseQuestSubtaskButton(interaction.customId);
  if (subParsed) {
    const quest = db.getQuest(subParsed.questId);
    if (!quest) {
      return interaction.reply({
        content: 'I can’t find that quest on file — maybe it was cleared from storage?',
        ephemeral: true,
      });
    }
    if (String(quest.guildId) !== String(interaction.guild?.id)) {
      return interaction.reply({
        content: 'That quest belongs to another realm (server).',
        ephemeral: true,
      });
    }
    const userId = interaction.user.id;
    const isAssignee = userId === quest.assigneeId;
    const isCreator = userId === quest.creatorId;
    if (!isAssignee && !isCreator) {
      return interaction.reply({
        content: 'Only the assignee or creator can check off subtasks.',
        ephemeral: true,
      });
    }
    if (quest.status === STATUS.COMPLETED) {
      await syncQuestCard(interaction, quest);
      return interaction.reply({
        content: 'This quest is already completed.',
        ephemeral: true,
      });
    }
    const subs = getSubtasks(quest);
    if (subParsed.subtaskIndex < 0 || subParsed.subtaskIndex >= subs.length) {
      return interaction.reply({
        content: 'That subtask no longer exists — the card may be out of date.',
        ephemeral: true,
      });
    }
    const nextSubs = subs.map((s, i) =>
      i === subParsed.subtaskIndex ? { label: s.label, done: !s.done } : { ...s }
    );

    const mergedForDone = { ...quest, subtasks: nextSubs };
    if (allSubtasksDone(mergedForDone)) {
      const next = db.updateQuest(quest.id, {
        subtasks: nextSubs,
        status: STATUS.COMPLETED,
        completedAt: Date.now(),
      });
      return refreshQuestMessage(interaction, next, 'complete');
    }

    const patch = { subtasks: nextSubs };
    if (quest.status === STATUS.NOT_STARTED && nextSubs.some((s) => s.done)) {
      patch.status = STATUS.WORKING;
    }
    const next = db.updateQuest(quest.id, patch);
    const noteKind =
      quest.status === STATUS.NOT_STARTED && next.status === STATUS.WORKING
        ? 'subtaskStart'
        : 'subtask';
    return refreshQuestMessage(interaction, next, noteKind);
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

  if (String(quest.guildId) !== String(interaction.guild?.id)) {
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
    const cleared = getSubtasks(quest).map((s) => ({ label: s.label, done: false }));
    const next = db.updateQuest(quest.id, {
      status: STATUS.NOT_STARTED,
      subtasks: cleared,
    });
    return refreshQuestMessage(interaction, next, 'reset');
  }

  return false;
}

const EPHEMERAL_NOTES = {
  start: 'Off you go — this quest is now **Working On It**!',
  complete: '🏆 Quest completed! Celebratory fist-bump.',
  reset: 'Back to **Not Started** — take a breath and try again when you’re ready.',
  subtask: 'Subtask updated.',
  subtaskStart:
    'Subtask checked — quest is now **Working On It** (same as **Start Quest**).',
};

/**
 * Post completed card to the archive channel and remove it from the Quest Board.
 * @returns {{ ok: boolean, archiveMention?: string, userMessage?: string }}
 */
async function tryMoveCompletedToArchive(interaction, quest, embed, components) {
  const archiveId = db.getArchiveChannel(String(quest.guildId));
  if (!archiveId) {
    return { ok: false, reason: 'no_archive' };
  }

  const guild = interaction.guild;
  if (!guild) {
    return { ok: false, reason: 'no_guild' };
  }

  const archiveCh = await guild.channels.fetch(archiveId).catch(() => null);
  if (!archiveCh?.isTextBased()) {
    return {
      ok: false,
      reason: 'bad_channel',
      userMessage:
        `I can’t reach the archive channel (<#${archiveId}>). Check that the channel exists and the bot can see it.`,
    };
  }

  let posted;
  try {
    posted = await archiveCh.send({ embeds: [embed], components });
  } catch (e) {
    console.error('Archive send failed:', e);
    return {
      ok: false,
      reason: 'send_failed',
      userMessage:
        `Couldn’t **send** the card to <#${archiveId}>. Give the bot **Send Messages** and **Embed Links** there. (${e.message || 'error'})`,
    };
  }

  try {
    if (interaction.message && sameMessageId(interaction.message.id, quest.messageId)) {
      await interaction.message.delete();
    } else {
      const boardCh = await guild.channels.fetch(String(quest.channelId)).catch(() => null);
      if (boardCh?.isTextBased()) {
        await boardCh.messages.delete(String(quest.messageId));
      }
    }
  } catch (e) {
    console.error('Archive delete-from-board failed:', e);
    await posted.delete().catch(() => {});
    return {
      ok: false,
      reason: 'delete_failed',
      userMessage:
        `Posted to <#${archiveId}> but couldn’t **remove** the card from the Quest Board. Give the bot **Manage Messages** in the **Quest Board** channel (or delete that message yourself). (${e.message || 'error'})`,
    };
  }

  db.updateQuest(quest.id, { channelId: String(archiveCh.id), messageId: String(posted.id) });
  return { ok: true, archiveMention: `<#${archiveCh.id}>` };
}

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

  let archiveWarning = '';
  if (noteKind === 'complete' && quest.status === STATUS.COMPLETED) {
    const move = await tryMoveCompletedToArchive(interaction, quest, embed, components);
    if (move.ok) {
      return interaction.reply({
        content: `${EPHEMERAL_NOTES.complete} · Card moved to ${move.archiveMention}.`,
        ephemeral: true,
      });
    }
    if (move.userMessage) {
      archiveWarning = `${move.userMessage}\n\n`;
    }
  }

  try {
    const msg = await fetchQuestMessage(interaction, quest);
    if (msg) {
      await msg.edit({ embeds: [embed], components });
    } else {
      await interaction.reply({
        content:
          archiveWarning +
          'Updated the quest, but I couldn’t find the card message to refresh.',
        ephemeral: true,
      });
      return;
    }
  } catch (e) {
    console.error(e);
    await interaction.reply({
      content:
        archiveWarning +
        'Couldn’t update the quest card. The save went through — check that I can manage messages in this channel.',
      ephemeral: true,
    });
    return;
  }

  return interaction.reply({
    content: archiveWarning + (EPHEMERAL_NOTES[noteKind] ?? 'Quest updated!'),
    ephemeral: true,
  });
}

module.exports = { handleButton };
