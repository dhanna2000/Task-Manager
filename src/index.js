/**
 * Quest Board bot — entry point.
 * Slash: setup + list-quests + list-archived + create-quest; rest is buttons + modals.
 */

require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const setup = require('./commands/setup-quests');
const listQuests = require('./commands/list-quests');
const listArchived = require('./commands/list-archived');
const createQuest = require('./commands/create-quest');
const { handleButton } = require('./interactions/handleButtons');
const { handleModalSubmit } = require('./interactions/handleModals');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    /** Member list for assignee checks */
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === createQuest.data.name) {
        await createQuest.autocomplete(interaction);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === setup.data.name) {
        await setup.execute(interaction);
      } else if (interaction.commandName === listQuests.data.name) {
        await listQuests.execute(interaction);
      } else if (interaction.commandName === listArchived.data.name) {
        await listArchived.execute(interaction);
      } else if (interaction.commandName === createQuest.data.name) {
        await createQuest.execute(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      const handled = await handleButton(interaction);
      if (handled === false) return;
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (err) {
    console.error(err);
    const msg = 'The bot tripped on a gravel block — try again in a moment.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token);
