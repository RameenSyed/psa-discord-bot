import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { commands, handleInteraction } from './events/interactionCreate.js';
import { handleReactionAdd } from './events/reactionAdd.js';
import { startCountdownScheduler } from './events/countdownScheduler.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Register slash commands to the guild (instant, no 1-hour cache)
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('Guild not found. Check GUILD_ID.');
    return;
  }

  const commandData = [...commands.values()].map(c => c.data.toJSON());
  await guild.commands.set(commandData);
  console.log(`Registered ${commandData.length} slash commands to guild ${guild.name}`);

  // Start countdown scheduler
  startCountdownScheduler(client);
});

client.on('interactionCreate', handleInteraction);

client.on('messageReactionAdd', (reaction, user) => {
  handleReactionAdd(reaction, user, client);
});

client.login(process.env.DISCORD_BOT_TOKEN);
