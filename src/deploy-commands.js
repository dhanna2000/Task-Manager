/**
 * Registers guild slash commands (fast updates while you iterate).
 * Run once after changing command definitions: npm run deploy-commands
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const setup = require('./commands/setup-quests');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID in .env');
  process.exit(1);
}

const body = [
  {
    name: setup.data.name,
    description: setup.data.description,
  },
];

const rest = new REST({ version: '10' }).setToken(token);

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body })
  .then(() => console.log('Slash commands registered for this guild.'))
  .catch(console.error);
