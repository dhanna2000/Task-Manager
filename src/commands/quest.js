const { SlashCommandBuilder } = require('discord.js');
const db = require('../storage/database');
const { buildQuestEmbed, questComponents } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Look up a quest by its ID number')
    .addIntegerOption((o) =>
      o.setName('id').setDescription('Quest ID number (e.g. 12)').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const questId = interaction.options.getInteger('id', true);
    const quest = db.getQuest(questId);

    if (!quest || String(quest.guildId) !== String(interaction.guild?.id)) {
      return interaction.reply({
        content: `No quest found with ID **Q-${String(questId).padStart(4, '0')}**.`,
        ephemeral: true,
      });
    }

    const embed = buildQuestEmbed(quest, {
      assigneeMention: `<@${quest.assigneeId}>`,
      creatorMention: `<@${quest.creatorId}>`,
    });

    const jumpUrl =
      quest.channelId && quest.messageId
        ? `https://discord.com/channels/${quest.guildId}/${quest.channelId}/${quest.messageId}`
        : null;

    return interaction.reply({
      content: jumpUrl ? `[Jump to quest card](${jumpUrl})` : null,
      embeds: [embed],
      components: questComponents(quest),
      ephemeral: true,
    });
  },
};
