const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../storage/database');
const gatherDraft = require('../interactions/gatherDraft');
const MINECRAFT_ITEMS = require('../data/minecraft-items');
const { GATHER } = require('../utils/ids');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-gather')
    .setDescription('Assign someone to collect blocks or items — add items one at a time with autocomplete')
    .addStringOption((o) =>
      o
        .setName('item')
        .setDescription('Block or item to collect (type to search Minecraft items)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption((o) =>
      o
        .setName('assignee')
        .setDescription('Who should collect? (only needed for the first item)')
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName('quantity')
        .setDescription('How many? e.g. 64, 2 stacks, a shulker box')
        .setRequired(false)
    )
    .addStringOption((o) =>
      o
        .setName('title')
        .setDescription('Gather order title (optional — only used when starting a new order)')
        .setRequired(false)
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

    const itemName = interaction.options.getString('item', true).trim();
    const quantityRaw = (interaction.options.getString('quantity') ?? '').trim();
    const label = quantityRaw ? `${quantityRaw}\u00d7 ${itemName}` : itemName;

    const assigneeOption = interaction.options.getUser('assignee');
    const titleOption = (interaction.options.getString('title') ?? '').trim();

    let draft = gatherDraft.get(interaction.user.id);

    if (!draft) {
      if (!assigneeOption) {
        return interaction.editReply({
          content: 'Pick an **@assignee** — required when starting a new gather list.',
        });
      }
      const member = await interaction.guild.members.fetch(assigneeOption.id).catch(() => null);
      if (!member) {
        return interaction.editReply({
          content: "That user isn\u2019t in this server. Pick someone else.",
        });
      }
      gatherDraft.touch(interaction.user.id, {
        assigneeId: assigneeOption.id,
        items: [label],
        title: titleOption || 'Gather Order',
      });
    } else {
      if (assigneeOption && String(assigneeOption.id) !== String(draft.assigneeId)) {
        return interaction.editReply({
          content: `You already have an active draft for <@${draft.assigneeId}>. Post it or let it expire first.`,
        });
      }
      gatherDraft.addItem(interaction.user.id, label);
    }

    draft = gatherDraft.get(interaction.user.id);
    const itemLines = draft.items.map((it, i) => `${i + 1}. ${it}`).join('\n');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(GATHER.POST)
        .setLabel('Post gather card')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(GATHER.CANCEL)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      content:
        `**Gather list for <@${draft.assigneeId}>** — *${draft.title}*\n${itemLines}\n\n` +
        `*Run \`/assign-gather item:...\` again to add more items, then post when ready.*`,
      components: [row],
    });
  },

  /** @param {import('discord.js').AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const query = interaction.options.getFocused().toLowerCase().trim();
    const filtered = query
      ? MINECRAFT_ITEMS.filter((i) => i.toLowerCase().includes(query))
      : MINECRAFT_ITEMS.slice(0, 25);
    return interaction.respond(
      filtered.slice(0, 25).map((i) => ({ name: i, value: i }))
    );
  },
};
