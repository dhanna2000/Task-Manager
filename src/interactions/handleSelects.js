const { GATHER } = require('../utils/ids');
const gatherDraft = require('./gatherDraft');

/**
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 */
async function handleSelect(interaction) {
  if (interaction.customId === GATHER.SEARCH_SELECT) {
    const draft = gatherDraft.get(interaction.user.id);
    if (!draft) {
      return interaction.update({
        content: 'That gather draft expired. Run `/assign-gather` again.',
        components: [],
      });
    }

    const qty = draft.pendingQty || '';
    for (const item of interaction.values) {
      const label = qty ? `${qty}\u00d7 ${item}` : item;
      gatherDraft.addItem(interaction.user.id, label);
    }
    gatherDraft.setPendingQty(interaction.user.id, null);

    const updated = gatherDraft.get(interaction.user.id);

    // Update the original gather card in place
    await draft.interaction.editReply(gatherDraft.buildMessage(updated));

    // Dismiss the search results message
    const added = interaction.values.length;
    return interaction.update({
      content: `\u2705 Added **${added}** item${added > 1 ? 's' : ''} to your gather list. Click "Search & Add Items" again for more, or post when ready.`,
      components: [],
    });
  }
}

module.exports = { handleSelect };
