const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const db = require('../storage/database');
const { buildCompletedQuestsTableEmbeds } = require('../utils/questTable');
const { renderCompletedQuestsPngs } = require('../utils/questTableImage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-archived')
    .setDescription(
      'Show completed quests in a table (same style as /list-quests — visible to everyone here).'
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Use this in a server.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const quests = db.getGuildQuests(interaction.guild.id);

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
        return interaction.editReply({
          content:
            '**Archived / completed quests** — nothing in the vault yet.',
          embeds,
        });
      }

      const files = buffers.map(
        (b, i) => new AttachmentBuilder(b).setName(`archived-quests-${i + 1}.png`)
      );
      const embeds = buffers.map((_, i) =>
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(
            i === 0 ? '🏆 Archived & completed quests' : '🏆 Archived (continued)'
          )
          .setImage(`attachment://archived-quests-${i + 1}.png`)
      );

      return interaction.editReply({
        content:
          '**Archived / completed quests** — PNG table below (newest completions first). Same data the bot keeps when quests are finished.',
        files,
        embeds,
      });
    } catch (e) {
      console.error('archived quest table PNG:', e);
      const embeds = await buildCompletedQuestsTableEmbeds(
        interaction.guild,
        quests
      );
      return interaction.editReply({
        content:
          'Couldn’t render the image table — **text** version below. Check that `canvas` and `dejavu-fonts-ttf` are installed.',
        embeds,
      });
    }
  },
};
