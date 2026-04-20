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
          'An **admin** (Manage Server or Administrator) must run the **slash command** in **this** channel. **Typing the words as a normal message does nothing** — Discord only runs commands from the **/** menu.\n\n' +
          '**How:** type **/** → choose **setup-quests** → choose **item-collection** → run it here.\n\n' +
          'If **item-collection** doesn’t appear under **setup-quests**, redeploy slash commands on the bot host (`npm run deploy-commands`) and restart the bot.\n\n' +
          'After that, **/assign-gather** works here. (Regular quests stay on the Quest Board with **/create-quest**.)',
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
