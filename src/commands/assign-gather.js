const { SlashCommandBuilder } = require('discord.js');
const db = require('../storage/database');
const gatherDraft = require('../interactions/gatherDraft');
const MINECRAFT_ITEMS = require('../data/minecraft-items');

const ITEM_SLOTS = [
  { item: 'item',  qty: 'quantity' },
  { item: 'item2', qty: 'qty2' },
  { item: 'item3', qty: 'qty3' },
  { item: 'item4', qty: 'qty4' },
  { item: 'item5', qty: 'qty5' },
];

function itemOption(name, desc) {
  return (o) => o.setName(name).setDescription(desc).setRequired(false).setAutocomplete(true);
}
function qtyOption(name) {
  return (o) => o.setName(name).setDescription('How many? e.g. 64, 2 stacks, a shulker box').setRequired(false);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-gather')
    .setDescription('Assign a gather order — fill in up to 5 items, then add more with the button')
    .addUserOption((o) => o.setName('assignee').setDescription('Who should collect?').setRequired(true))
    .addStringOption(itemOption('item',  'Item 1 (type to search Minecraft items)'))
    .addStringOption(qtyOption('quantity'))
    .addStringOption(itemOption('item2', 'Item 2'))
    .addStringOption(qtyOption('qty2'))
    .addStringOption(itemOption('item3', 'Item 3'))
    .addStringOption(qtyOption('qty3'))
    .addStringOption(itemOption('item4', 'Item 4'))
    .addStringOption(qtyOption('qty4'))
    .addStringOption(itemOption('item5', 'Item 5'))
    .addStringOption(qtyOption('qty5'))
    .addStringOption((o) => o.setName('title').setDescription('Gather order title').setRequired(false)),

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

    const assigneeUser = interaction.options.getUser('assignee', true);
    const member = await interaction.guild.members.fetch(assigneeUser.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: "That user isn\u2019t in this server. Pick someone else." });
    }

    const titleOption = (interaction.options.getString('title') ?? '').trim();

    const items = [];
    for (const { item: itemKey, qty: qtyKey } of ITEM_SLOTS) {
      const name = (interaction.options.getString(itemKey) ?? '').trim();
      if (!name) continue;
      const qty = (interaction.options.getString(qtyKey) ?? '').trim();
      items.push(qty ? `${qty}\u00d7 ${name}` : name);
    }

    gatherDraft.touch(interaction.user.id, {
      assigneeId: assigneeUser.id,
      items,
      title: titleOption || 'Gather Order',
    });
    gatherDraft.setInteraction(interaction.user.id, interaction);

    const draft = gatherDraft.get(interaction.user.id);
    return interaction.editReply(gatherDraft.buildMessage(draft));
  },

  /** @param {import('discord.js').AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (!ITEM_SLOTS.some((s) => s.item === focused.name)) return interaction.respond([]);
    const query = focused.value.toLowerCase().trim();
    const filtered = query
      ? MINECRAFT_ITEMS.filter((i) => i.toLowerCase().includes(query))
      : MINECRAFT_ITEMS.slice(0, 25);
    return interaction.respond(filtered.slice(0, 25).map((i) => ({ name: i, value: i })));
  },
};
