const { SlashCommandBuilder } = require('discord.js');
const db = require('../storage/database');
const gatherDraft = require('../interactions/gatherDraft');
const { buildGatherModalSlash } = require('../interactions/handleModals');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-gather')
    .setDescription(
      'Assign someone to collect blocks or items — pick them here, then list materials in the modal'
    )
    .addUserOption((o) =>
      o
        .setName('assignee')
        .setDescription('Who should gather these materials?')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'Use this in a **server text channel**.',
        ephemeral: true,
      });
    }
    const board = db.getBoard(interaction.guild.id);
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      return interaction.reply({
        content:
          'Run **`/assign-gather`** in the **Quest Board** channel (same place as **`/create-quest`**).',
        ephemeral: true,
      });
    }

    const assignee = interaction.options.getUser('assignee', true);

    const member = await interaction.guild.members.fetch(assignee.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'That user isn’t in this server (or I can’t see them). Pick someone else.',
        ephemeral: true,
      });
    }

    gatherDraft.touch(interaction.user.id, {
      assigneeId: assignee.id,
    });

    return interaction.showModal(buildGatherModalSlash());
  },
};
