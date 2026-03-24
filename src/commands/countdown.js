import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { getEvent, activateCountdown, deactivateCountdown, getActiveCountdowns } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('countdown')
  .setDescription('Manage event countdowns')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start daily countdown for an event')
      .addIntegerOption(opt => opt.setName('event_id').setDescription('Event ID').setRequired(true))
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel for countdown posts (defaults to current)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('stop')
      .setDescription('Stop countdown for an event')
      .addIntegerOption(opt => opt.setName('event_id').setDescription('Event ID').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show all active countdowns')
  );

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const eventId = interaction.options.getInteger('event_id');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const event = getEvent(eventId);

    if (!event) {
      await interaction.reply({ content: `Event #${eventId} not found. Use \`/events\` to see available events.`, ephemeral: true });
      return;
    }

    if (event.countdown_active) {
      await interaction.reply({ content: `Countdown for **${event.name}** is already active.`, ephemeral: true });
      return;
    }

    activateCountdown(eventId, channel.id);
    await interaction.reply({
      content: `⏳ Countdown started for **${event.name}** (${formatDate(event.date)}) in <#${channel.id}>. Posts daily at 9:00 AM ET.`,
      ephemeral: true,
    });
  }

  else if (sub === 'stop') {
    const eventId = interaction.options.getInteger('event_id');
    const event = getEvent(eventId);

    if (!event) {
      await interaction.reply({ content: `Event #${eventId} not found.`, ephemeral: true });
      return;
    }

    if (!event.countdown_active) {
      await interaction.reply({ content: `Countdown for **${event.name}** is not active.`, ephemeral: true });
      return;
    }

    deactivateCountdown(eventId);
    await interaction.reply({ content: `Countdown stopped for **${event.name}**.`, ephemeral: true });
  }

  else if (sub === 'list') {
    const countdowns = getActiveCountdowns();

    if (countdowns.length === 0) {
      await interaction.reply({ content: 'No active countdowns.', ephemeral: true });
      return;
    }

    const lines = countdowns.map(e => {
      const daysLeft = Math.ceil((new Date(e.date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
      let status = `${daysLeft} day(s) away`;
      if (daysLeft === 0) status = 'TODAY';
      if (daysLeft < 0) status = 'PAST (will auto-stop)';
      return `**#${e.id}** ${e.name} — ${formatDate(e.date)} — ${status} — <#${e.countdown_channel_id}>`;
    });

    await interaction.reply({ content: `**Active Countdowns**\n${lines.join('\n')}`, ephemeral: true });
  }
}
