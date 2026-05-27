const { GATHER } = require('../utils/ids');
const gatherDraft = require('./gatherDraft');
const { buildQtyModal } = require('./handleModals');

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

    gatherDraft.setPendingItems(interaction.user.id, interaction.values);
    return interaction.showModal(buildQtyModal());
  }
}

module.exports = { handleSelect };
