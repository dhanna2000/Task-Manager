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
    const guildId = interaction.guild.id;
    const itemCh = db.getItemCollectionChannel(guildId);
    const hereId = String(interaction.channel.id);

    if (!itemCh) {
      return interaction.reply({
        content:
          '**Item collection isn’t set up yet.**\n\n' +
          'An **admin** (Manage Server or Administrator) must run **`/setup-item-collection`** in **this** channel (use the **/** menu — typing as chat does nothing).\n\n' +
          'If you don’t see that command, redeploy on the bot host: **`npm run deploy-commands`** then restart the bot and wait ~1 minute.\n\n' +
          '*(Same as **`/setup-quests item-collection`** if that subcommand shows up after deploy.)*\n\n' +
          'Then **/assign-gather** works here. Regular quests stay on the Quest Board with **/create-quest**.',
        ephemeral: true,
      });
    }

    if (String(itemCh) !== hereId) {
      return interaction.reply({
        content:
          `**Assign-gather** is locked to <#${itemCh}>. Run the command there, **or** ask an admin to run \`/setup-quests item-collection\` in <#${hereId}> to switch the item collection channel to this one.`,
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
