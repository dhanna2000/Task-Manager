const { EmbedBuilder } = require('discord.js');
const { STATUS } = require('./embeds');

function categoryLabel(quest) {
  const c = (quest.category || '').trim();
  return c.length > 0 ? c : 'Uncategorized';
}

function statusEmoji(st) {
  if (st === STATUS.WORKING) return '⚒️';
  if (st === STATUS.COMPLETED) return '🏆';
  return '🪵';
}

/**
 * Ephemeral embed: counts + active quests grouped by category name.
 * @param {import('discord.js').Guild} guild
 * @param {object[]} quests
 * @param {string|null} archiveChannelId
 */
function buildStatusSnapshotEmbed(guild, quests, archiveChannelId) {
  const active = quests.filter((q) => q.status !== STATUS.COMPLETED);
  const done = quests.filter((q) => q.status === STATUS.COMPLETED);

  const ns = quests.filter((q) => q.status === STATUS.NOT_STARTED).length;
  const wr = quests.filter((q) => q.status === STATUS.WORKING).length;
  const cp = done.length;

  let archiveLine = '_No archive channel yet — completed cards stay on the board._';
  if (archiveChannelId) {
    const ch = guild.channels.cache.get(archiveChannelId);
    const name = ch ? `#${ch.name}` : `<#${archiveChannelId}>`;
    archiveLine = `Finished quests are filed in **${name}**.`;
  }

  const byCat = new Map();
  for (const q of active) {
    const label = categoryLabel(q);
    if (!byCat.has(label)) byCat.set(label, []);
    byCat.get(label).push(q);
  }
  const sortedCats = [...byCat.keys()].sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  let body = `**All quests**\n🪵 Not started: **${ns}** · ⚒️ Working: **${wr}** · 🏆 Completed: **${cp}**\n\n${archiveLine}\n\n`;

  if (active.length === 0) {
    body += '**Active by category**\n_No open quests right now — the village is taking a snack break._';
  } else {
    body += '**Active quests by category**\n';
    for (const cat of sortedCats) {
      const list = byCat.get(cat);
      body += `\n**${cat}** (${list.length})\n`;
      for (const q of list) {
        const em = statusEmoji(q.status);
        const title =
          q.title.length > 60 ? `${q.title.slice(0, 57)}…` : q.title;
        body += `${em} **${title}** · <@${q.assigneeId}>\n`;
      }
    }
  }

  if (body.length > 4000) {
    body = body.slice(0, 3990) + '\n…';
  }

  return new EmbedBuilder()
    .setColor(0x8bc34a)
    .setTitle('📊 Quest snapshot')
    .setDescription(body);
}

module.exports = { buildStatusSnapshotEmbed };
