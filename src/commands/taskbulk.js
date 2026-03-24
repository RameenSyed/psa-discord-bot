import { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { resolveAlias, addTask } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('taskbulk')
  .setDescription('Create multiple tasks via a modal');

export async function execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('taskbulk_modal')
    .setTitle('Bulk Task Entry');

  const categoryInput = new TextInputBuilder()
    .setCustomId('category')
    .setLabel('Category')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('e.g. Marketing');

  const tasksInput = new TextInputBuilder()
    .setCustomId('tasks')
    .setLabel('Tasks (blank line between each)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setPlaceholder('Description\\nresponsible: alias1\\ndeadline: Friday');

  modal.addComponents(
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(tasksInput),
  );

  await interaction.showModal(modal);
}

export async function handleModal(interaction) {
  const category = interaction.fields.getTextInputValue('category').trim();
  const tasksText = interaction.fields.getTextInputValue('tasks').trim();

  // Split into blocks by blank lines
  const blocks = tasksText.split(/\n\s*\n/).filter(Boolean);

  if (blocks.length === 0) {
    await interaction.reply({ content: 'No tasks found. Separate tasks with blank lines.', ephemeral: true });
    return;
  }

  const channelId = process.env.TASK_CHANNEL_ID;
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    await interaction.reply({ content: 'Task channel not found. Check TASK_CHANNEL_ID.', ephemeral: true });
    return;
  }

  const parsedTasks = [];
  const errors = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const description = lines[0];
    let responsibleLine = '';
    let deadlineLine = '';

    for (let j = 1; j < lines.length; j++) {
      const lower = lines[j].toLowerCase();
      if (lower.startsWith('responsible:')) {
        responsibleLine = lines[j].slice('responsible:'.length).trim();
      } else if (lower.startsWith('deadline:')) {
        deadlineLine = lines[j].slice('deadline:'.length).trim();
      }
    }

    // Resolve aliases
    const names = responsibleLine.split(',').map(n => n.trim()).filter(Boolean);
    const resolvedIds = [];
    for (const name of names) {
      const mentionMatch = name.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        resolvedIds.push(mentionMatch[1]);
        continue;
      }
      const id = resolveAlias(name);
      if (id) {
        resolvedIds.push(id);
      } else {
        errors.push(`Task ${i + 1}: unknown alias "${name}"`);
      }
    }

    parsedTasks.push({ description, resolvedIds, deadline: deadlineLine, index: i + 1 });
  }

  if (errors.length > 0) {
    await interaction.reply({
      content: `Errors:\n${errors.join('\n')}\n\nUse \`/alias list\` to see available aliases.`,
      ephemeral: true,
    });
    return;
  }

  // Post category header if provided
  if (category) {
    await channel.send({ content: `**${category}**` });
  }

  // Post each task as an individual message
  for (const t of parsedTasks) {
    const mentions = t.resolvedIds.map(id => `<@${id}>`).join(' ');
    let messageContent = `• ${t.description}`;
    if (mentions) messageContent += `\nResponsible: ${mentions}`;
    if (t.deadline) messageContent += `\nDeadline: ${t.deadline}`;

    const msg = await channel.send({ content: messageContent });
    await msg.react('✅');

    addTask({
      description: t.description,
      responsibleIds: t.resolvedIds.join(','),
      deadline: t.deadline || null,
      category: category || null,
      messageId: msg.id,
      channelId: channel.id,
    });
  }

  await interaction.reply({
    content: `${parsedTasks.length} task(s) posted in <#${channelId}>.`,
    ephemeral: true,
  });
}
