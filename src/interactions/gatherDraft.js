/**
 * Carries slash-chosen assignee + accumulated items into the "Post gather card" button.
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GATHER } = require('../utils/ids');

const TTL_MS = 15 * 60 * 1000;

/**
 * @type {Map<string, { assigneeId: string, items: string[], title: string, expiresAt: number, interaction?: any }>}
 */
const drafts = new Map();

function touch(userId, data) {
  drafts.set(userId, {
    ...data,
    expiresAt: Date.now() + TTL_MS,
  });
}

function get(userId) {
  const row = drafts.get(userId);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    drafts.delete(userId);
    return null;
  }
  return row;
}

function take(userId) {
  const row = get(userId);
  if (row) drafts.delete(userId);
  return row;
}

function addItem(userId, label) {
  const row = get(userId);
  if (!row) return false;
  if (!Array.isArray(row.items)) row.items = [];
  row.items.push(label);
  row.expiresAt = Date.now() + TTL_MS;
  drafts.set(userId, row);
  return true;
}

function remove(userId) {
  drafts.delete(userId);
}

function setInteraction(userId, interaction) {
  const row = get(userId);
  if (!row) return;
  row.interaction = interaction;
  drafts.set(userId, row);
}

function buildMessage(draft) {
  const itemLines = draft.items.length
    ? draft.items.map((it, i) => `${i + 1}. ${it}`).join('\n')
    : '*No items yet — click "Add item" below.*';
  const content =
    `**Gather list for <@${draft.assigneeId}>** — *${draft.title}*\n` +
    `${itemLines}\n\n` +
    `*Click **Add item** to add more, then post when ready.*`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(GATHER.ADD_ITEM).setLabel('Add item').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(GATHER.POST).setLabel('Post gather card').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(GATHER.CANCEL).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );
  return { content, components: [row] };
}

module.exports = { touch, get, take, addItem, remove, setInteraction, buildMessage };
