const { SlashCommandBuilder } = require('discord.js');
const db = require('../storage/database');
const gatherDraft = require('../interactions/gatherDraft');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-gather')
    .setDescription('Create a gather order — add items with the Search button after')
    .addUserOption((o) =>
      o.setName('assignee').setDescription('Who should collect?').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('title').setDescription('Gather order title (optional)').setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({ content: 'Use this in a server text channel.', ephemeral: true });
    }

    const guildId = interaction.guild.id;
    const itemCh = db.getItemCollectionChannel(guildId);
    const hereId = String(interaction.channel.id);

    if (!itemCh) {
      return interaction.reply({
        content:
          '**Item collection isn\u2019t set up yet.**\n\nAn **admin** must run **`/setup-item-collection`** in this channel first.',
        ephemeral: true,
      });
    }

    if (String(itemCh) !== hereId) {
      return interaction.reply({
        content: `**Assign-gather** runs in <#${itemCh}>. Head there to use it.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const assigneeOption = interaction.options.getUser('assignee');
    const titleOption = (interaction.options.getString('title') ?? '').trim();

    const existingDraft = gatherDraft.get(interaction.user.id);
    if (existingDraft) {
      return interaction.editReply({
        content: `You already have an active draft for <@${existingDraft.assigneeId}>. Post it or cancel it first.`,
      });
    }

    const member = await interaction.guild.members.fetch(assigneeOption.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: "That user isn\u2019t in this server. Pick someone else." });
    }

    gatherDraft.touch(interaction.user.id, {
      assigneeId: assigneeOption.id,
      items: [],
      title: titleOption || 'Gather Order',
    });

    gatherDraft.setInteraction(interaction.user.id, interaction);

    const draft = gatherDraft.get(interaction.user.id);
    return interaction.editReply(gatherDraft.buildMessage(draft));
  },

};
