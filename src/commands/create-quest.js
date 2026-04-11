const { SlashCommandBuilder } = require('discord.js');
const db = require('../storage/database');
const questDraft = require('../interactions/questDraft');
const {
  buildCreateQuestModalSlash,
  buildCreateQuestModalSlashOther,
} = require('../interactions/handleModals');

const OTHER_VALUE = '__other__';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create-quest')
    .setDescription('New quest — pick assignee & category here, then name it in the modal')
    .addUserOption((o) =>
      o
        .setName('assignee')
        .setDescription('Who is this quest for?')
        .setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('category')
        .setDescription('Category (type to filter)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction) {
    if (!interaction.guild || !interaction.channel) {
      return interaction.reply({
        content: 'Use this in a **server text channel**.',
        ephemeral: true,
      });
    }
    const board = db.getBoard(interaction.guild.id);
    if (!board || String(board.channelId) !== String(interaction.channel.id)) {
      return interaction.reply({
        content:
          'Run **`/create-quest`** in the **Quest Board** channel, or use **Create Quest** on the board.',
        ephemeral: true,
      });
    }

    const assignee = interaction.options.getUser('assignee', true);
    const category = interaction.options.getString('category', true);

    const member = await interaction.guild.members.fetch(assignee.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: 'That user isn’t in this server (or I can’t see them). Pick someone else.',
        ephemeral: true,
      });
    }

    questDraft.touch(interaction.user.id, {
      assigneeId: assignee.id,
      categoryValue: category,
    });

    if (category === OTHER_VALUE) {
      return interaction.showModal(buildCreateQuestModalSlashOther());
    }
    return interaction.showModal(buildCreateQuestModalSlash());
  },

  /** @param {import('discord.js').AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== 'category') {
      return interaction.respond([]);
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.respond([]);
    }

    const names = db.getCategories(guildId);
    const q = (focused.value || '').toLowerCase().trim();
    const filtered = names.filter((n) => n.toLowerCase().includes(q));

    /** @type {{ name: string, value: string }[]} */
    const choices = [];
    const used = new Set();

    for (const n of filtered) {
      if (choices.length >= 23) break;
      const s = String(n).trim();
      const value = s.slice(0, 100);
      if (!value || used.has(value)) continue;
      used.add(value);
      choices.push({
        name: s.length > 100 ? `${s.slice(0, 97)}…` : s,
        value,
      });
    }

    const typed = focused.value.trim().slice(0, 100);
    const matchesPreset = names.some((n) => n.toLowerCase() === typed.toLowerCase());
    if (typed && !matchesPreset && !used.has(typed) && choices.length < 24) {
      choices.push({
        name: `✓ Use "${typed.length > 36 ? `${typed.slice(0, 33)}…` : typed}"`,
        value: typed,
      });
    }

    choices.push({
      name: '✏️ Other (type name in next step)',
      value: OTHER_VALUE,
    });

    return interaction.respond(choices.slice(0, 25));
  },
};
