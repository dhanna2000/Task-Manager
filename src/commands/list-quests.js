const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const db = require('../storage/database');
const { buildAllQuestsTableEmbeds } = require('../utils/questTable');
const { renderAllQuestsPngs } = require('../utils/questTableImage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-quests')
    .setDescription('Show every quest in this server in a table (all assignees, all statuses).'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Use this in a server.',
        ephemeral: true,
      });
    }

    /** Public reply so everyone in the channel can see the quest table */
    await interaction.deferReply();

    const quests = db.getGuildQuests(interaction.guild.id);

    try {
      const { buffers, empty } = await renderAllQuestsPngs(interaction.guild, quests);
      if (empty) {
        const embeds = await buildAllQuestsTableEmbeds(interaction.guild, quests);
        return interaction.editReply({
          content:
            '**Quest overview** — assignee names use server nicknames when possible.',
          embeds,
        });
      }

      const files = buffers.map(
        (b, i) => new AttachmentBuilder(b).setName(`quest-table-${i + 1}.png`)
      );
      const embeds = buffers.map((_, i) =>
        new EmbedBuilder()
          .setColor(0x8bc34a)
          .setTitle(i === 0 ? '📋 All quests' : '📋 All quests (continued)')
          .setImage(`attachment://quest-table-${i + 1}.png`)
      );

      return interaction.editReply({
        content:
          '**Quest overview** — **PNG table** below (Discord-style dark theme). If images fail, you’ll see a text table instead.',
        files,
        embeds,
      });
    } catch (e) {
      console.error('quest table PNG:', e);
      const embeds = await buildAllQuestsTableEmbeds(interaction.guild, quests);
      return interaction.editReply({
        content:
          'Couldn’t render the image table — here’s the **text** version instead. Check that `canvas` and `dejavu-fonts-ttf` are installed.',
        embeds,
      });
    }
  },
};
