const {
  PermissionFlagsBits,
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require('discord.js');
const db = require('../storage/database');
const { buildBoardEmbed, buildBoardComponents } = require('../utils/embeds');
const { buildCompletedQuestsTableEmbeds } = require('../utils/questTable');
const { renderCompletedQuestsPngs } = require('../utils/questTableImage');

module.exports = {
  /** Put `archive` first so Discord doesn’t auto-pick `board` when people rush the submit key. */
  data: new SlashCommandBuilder()
    .setName('setup-quests')
    .setDescription(
      'Set up the Quest Board, item collection channel, or archive for finished quests (admins only).'
    )
    .addSubcommand((sub) =>
      sub
        .setName('archive')
        .setDescription('Save this channel for finished cards + show the list of completed quests')
    )
    .addSubcommand((sub) =>
      sub
        .setName('item-collection')
        .setDescription('Use this channel for /assign-gather (block & item collection orders)')
    )
    .addSubcommand((sub) =>
      sub.setName('board').setDescription('Post or refresh the Quest Board in this channel')
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'This only works inside a server channel.',
        ephemeral: true,
      });
    }

    const member = interaction.member;
    const canManage =
      member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
      member?.permissions?.has?.(PermissionFlagsBits.ManageGuild);

    if (!canManage) {
      return interaction.reply({
        content: 'You need **Administrator** or **Manage Server** to run this.',
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand(false);

    if (sub == null) {
      return interaction.reply({
        content:
          'Pick **`archive`**, **`item-collection`**, or **`board`**. Tips: **`/list-quests`** (all quests) and **`/list-archived`** (completed only).\n\n' +
          'If you don’t see subcommands, run **`npm run deploy-commands`**, restart the bot, wait a minute, and try again.',
        ephemeral: true,
      });
    }

    if (sub === 'archive') {
      const chId = interaction.channel.id;
      db.setArchiveChannel(guildId, chId);
      await interaction.deferReply({ ephemeral: true });

      const quests = db.getGuildQuests(guildId);
      const header =
        `✅ **Archive channel set** — new completions will move cards to <#${chId}>.\n\n` +
        '**Completed quests on file:**';

      try {
        const { buffers, empty } = await renderCompletedQuestsPngs(
          interaction.guild,
          quests
        );
        if (empty) {
          const embeds = await buildCompletedQuestsTableEmbeds(
            interaction.guild,
            quests
          );
          return interaction.editReply({ content: header, embeds });
        }

        const files = buffers.map(
          (b, i) => new AttachmentBuilder(b).setName(`completed-quests-${i + 1}.png`)
        );
        const embeds = buffers.map((_, i) =>
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(i === 0 ? '🏆 Completed quests' : '🏆 Completed quests (continued)')
            .setImage(`attachment://completed-quests-${i + 1}.png`)
        );
        return interaction.editReply({ content: header, files, embeds });
      } catch (e) {
        console.error('completed quest PNG:', e);
        const embeds = await buildCompletedQuestsTableEmbeds(
          interaction.guild,
          quests
        );
        return interaction.editReply({
          content:
            header +
            '\n\n_Couldn’t render PNG — showing the text table instead._',
          embeds,
        });
      }
    }

    if (sub === 'item-collection') {
      const chId = interaction.channel.id;
      db.setItemCollectionChannel(guildId, chId);
      return interaction.reply({
        content:
          `✅ **Item collection channel set** — run **`/assign-gather`** here (not in the Quest Board channel). Gather cards will post in <#${chId}>.`,
        ephemeral: true,
      });
    }

    if (sub !== 'board') {
      return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
    }

    // board
    const channelId = interaction.channel.id;
    const archiveId = db.getArchiveChannel(guildId);
    let archiveHint;
    if (archiveId) {
      const ch = await interaction.guild.channels.fetch(archiveId).catch(() => null);
      archiveHint = ch ? `<#${ch.id}>` : 'your archive channel';
    }

    const embed = buildBoardEmbed(archiveHint ? { archiveHint } : {});
    const rows = buildBoardComponents();

    const existing = db.getBoard(guildId);
    if (existing && String(existing.channelId) === String(channelId) && existing.messageId) {
      try {
        const old = await interaction.channel.messages.fetch(String(existing.messageId));
        await old.edit({ embeds: [embed], components: rows });
        await interaction.reply({
          content: 'Quest Board refreshed in this channel. You’re all set!',
          ephemeral: true,
        });
        return;
      } catch {
        // post new if old message missing
      }
    }

    const msg = await interaction.channel.send({
      embeds: [embed],
      components: rows,
    });

    db.setBoard(guildId, channelId, msg.id);

    await interaction.reply({
      content:
        existing && String(existing.channelId) !== String(channelId)
          ? 'New Quest Board posted here — this is now the active board for the server.'
          : 'Quest Board is live! Friends can tap **Create Quest** or **Quest snapshot**.',
      ephemeral: true,
    });
  },
};
