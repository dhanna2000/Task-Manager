const {
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../storage/database');
const { buildBoardEmbed } = require('../utils/embeds');
const { BOARD } = require('../utils/ids');

module.exports = {
  data: {
    name: 'setup-quests',
    description: 'Post the Quest Board in this channel (admins only).',
  },

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
    const channelId = interaction.channel.id;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(BOARD.CREATE_BUTTON)
        .setLabel('Create Quest')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Success)
    );

    const embed = buildBoardEmbed();

    const existing = db.getBoard(guildId);
    if (existing && existing.channelId === channelId && existing.messageId) {
      try {
        const old = await interaction.channel.messages.fetch(existing.messageId);
        await old.edit({ embeds: [embed], components: [row] });
        await interaction.reply({
          content: 'Quest Board refreshed in this channel. You’re all set!',
          ephemeral: true,
        });
        return;
      } catch {
        // fall through: post a new board if the old message is gone
      }
    }

    const msg = await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    db.setBoard(guildId, channelId, msg.id);

    await interaction.reply({
      content:
        existing && existing.channelId !== channelId
          ? 'New Quest Board posted here — this is now the active board for the server.'
          : 'Quest Board is live! Friends can tap **Create Quest** to add cards.',
      ephemeral: true,
    });
  },
};
