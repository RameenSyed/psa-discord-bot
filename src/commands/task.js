import { SlashCommandBuilder } from 'discord.js';
import { resolveAlias, addTask } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('task')
  .setDescription('Create and post a task')
  .addStringOption(opt => opt.setName('description').setDescription('Task description').setRequired(true))
  .addStringOption(opt => opt.setName('responsible').setDescription('Comma-separated aliases or @mentions').setRequired(true))
  .addStringOption(opt => opt.setName('deadline').setDescription('Deadline (free text)').setRequired(true))
  .addStringOption(opt => opt.setName('category').setDescription('Bold header above the task').setRequired(false));

export async function execute(interaction) {
  const description = interaction.options.getString('description');
  const responsibleRaw = interaction.options.getString('responsible');
  const deadline = interaction.options.getString('deadline');
  const category = interaction.options.getString('category');

  // Resolve aliases to Discord IDs
  const names = responsibleRaw.split(',').map(n => n.trim()).filter(Boolean);
  const resolvedIds = [];
  const unknownAliases = [];

  for (const name of names) {
    // Check if it's already a mention like <@123456>
    const mentionMatch = name.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
      resolvedIds.push(mentionMatch[1]);
      continue;
    }
    const id = resolveAlias(name);
    if (id) {
      resolvedIds.push(id);
    } else {
      unknownAliases.push(name);
    }
  }

  if (unknownAliases.length > 0) {
    await interaction.reply({
      content: `Unknown alias(es): **${unknownAliases.join(', ')}**. Use \`/alias list\` to see available aliases.`,
      ephemeral: true,
    });
    return;
  }

  const mentions = resolvedIds.map(id => `<@${id}>`).join(' ');
  let messageContent = '';
  if (category) {
    messageContent += `**${category}**\n`;
  }
  messageContent += `• ${description}\nResponsible: ${mentions}\nDeadline: ${deadline}`;

  // Post to the task channel
  const channelId = process.env.TASK_CHANNEL_ID;
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    await interaction.reply({ content: 'Task channel not found. Check TASK_CHANNEL_ID.', ephemeral: true });
    return;
  }

  const msg = await channel.send({ content: messageContent });
  await msg.react('✅');

  // Store in DB
  addTask({
    description,
    responsibleIds: resolvedIds.join(','),
    deadline,
    category: category || null,
    messageId: msg.id,
    channelId: channel.id,
  });

  await interaction.reply({ content: `Task posted in <#${channelId}>.`, ephemeral: true });
}
