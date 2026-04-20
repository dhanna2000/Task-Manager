const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../storage/database');

/**
 * Top-level command (no subcommands) so Discord always shows it after deploy.
 * Same effect as /setup-quests item-collection.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-item-collection')
    .setDescription(
      'Set this channel for /assign-gather — block & item collection orders (admins only)'
    ),

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
    const chId = interaction.channel.id;
    db.setItemCollectionChannel(guildId, chId);

    return interaction.reply({
      content:
        `✅ **Item collection channel set** — run \`/assign-gather\` here (not in the Quest Board channel). Gather cards will post in <#${chId}>.`,
      ephemeral: true,
    });
  },
};
