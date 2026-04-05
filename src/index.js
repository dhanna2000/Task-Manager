/**
 * Quest Board bot — entry point.
 * One slash command for setup; everything else is buttons + modals.
 */

require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const setup = require('./commands/setup-quests');
const { handleButton } = require('./interactions/handleButtons');
const { handleUserSelect, handleModalSubmit } = require('./interactions/handleModals');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    /** Member list for user select + assignee checks */
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === setup.data.name) {
        await setup.execute(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      const handled = await handleButton(interaction);
      if (handled === false) return;
      return;
    }

    if (interaction.isUserSelectMenu()) {
      const handled = await handleUserSelect(interaction);
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
