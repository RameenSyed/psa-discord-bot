import { SlashCommandBuilder } from 'discord.js';
import { resolveAlias, addEvent } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Manage PSA events')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a new event')
      .addStringOption(opt => opt.setName('name').setDescription('Event name').setRequired(true))
      .addStringOption(opt => opt.setName('date').setDescription('Date (YYYY-MM-DD)').setRequired(true))
      .addStringOption(opt => opt.setName('time').setDescription('Time range (e.g. 2:00 PM - 5:00 PM)').setRequired(false))
      .addStringOption(opt => opt.setName('location').setDescription('Location').setRequired(false))
      .addStringOption(opt => opt.setName('description').setDescription('Brief description').setRequired(false))
      .addStringOption(opt => opt.setName('responsible').setDescription('Comma-separated aliases').setRequired(false))
  );

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const name = interaction.options.getString('name');
    const date = interaction.options.getString('date');
    const time = interaction.options.getString('time');
    const location = interaction.options.getString('location');
    const description = interaction.options.getString('description');
    const responsibleRaw = interaction.options.getString('responsible');

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      await interaction.reply({ content: 'Date must be in YYYY-MM-DD format (e.g. 2026-04-12).', ephemeral: true });
      return;
    }

    // Resolve aliases if provided
    let resolvedIds = [];
    if (responsibleRaw) {
      const names = responsibleRaw.split(',').map(n => n.trim()).filter(Boolean);
      const unknownAliases = [];
      for (const alias of names) {
        const mentionMatch = alias.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          resolvedIds.push(mentionMatch[1]);
          continue;
        }
        const id = resolveAlias(alias);
        if (id) {
          resolvedIds.push(id);
        } else {
          unknownAliases.push(alias);
        }
      }
      if (unknownAliases.length > 0) {
        await interaction.reply({
          content: `Unknown alias(es): **${unknownAliases.join(', ')}**. Use \`/alias list\` to see available aliases.`,
          ephemeral: true,
        });
        return;
      }
    }

    // Build event card
    let card = `📅 **${name}**\nDate: ${formatDate(date)}`;
    if (time) card += `\nTime: ${time}`;
    if (location) card += `\nLocation: ${location}`;
    if (description) card += `\n${description}`;
    if (resolvedIds.length > 0) {
      card += `\nLeads: ${resolvedIds.map(id => `<@${id}>`).join(' ')}`;
    }

    const msg = await interaction.channel.send({ content: card });

    const result = addEvent({
      name,
      date,
      time,
      location,
      description,
      responsibleIds: resolvedIds.join(',') || null,
    });

    await interaction.reply({ content: `Event **${name}** created (ID: ${result.lastInsertRowid}).`, ephemeral: true });
  }
}
