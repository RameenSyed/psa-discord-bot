import { SlashCommandBuilder } from 'discord.js';
import { listEvents } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('events')
  .setDescription('List PSA events')
  .addStringOption(opt =>
    opt.setName('show')
      .setDescription('Filter events')
      .setRequired(false)
      .addChoices(
        { name: 'upcoming', value: 'upcoming' },
        { name: 'past', value: 'past' },
        { name: 'all', value: 'all' },
      )
  );

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export async function execute(interaction) {
  const filter = interaction.options.getString('show') || 'upcoming';
  const events = listEvents(filter);

  if (events.length === 0) {
    await interaction.reply({ content: `No ${filter} events found.`, ephemeral: true });
    return;
  }

  const lines = events.map(e => {
    let line = `**#${e.id}** 📅 ${e.name} — ${formatDate(e.date)}`;
    if (e.time) line += ` · ${e.time}`;
    if (e.location) line += ` · ${e.location}`;
    if (e.countdown_active) line += ' ⏳';
    return line;
  });

  let content = `**Events (${filter})**\n${lines.join('\n')}`;
  if (content.length > 2000) {
    content = `**Events (${filter})**\n${lines.slice(0, 15).join('\n')}\n... and ${events.length - 15} more`;
  }

  await interaction.reply({ content, ephemeral: true });
}
