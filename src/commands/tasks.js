import { SlashCommandBuilder } from 'discord.js';
import { getTasksByStatus, getTasksByMember, getTask, updateTaskStatus, resolveAlias } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('View and manage tasks')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List tasks')
      .addStringOption(opt =>
        opt.setName('member').setDescription('Filter by alias').setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('status')
          .setDescription('Filter by status')
          .setRequired(false)
          .addChoices(
            { name: 'open', value: 'open' },
            { name: 'done', value: 'done' },
            { name: 'all', value: 'all' },
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('done')
      .setDescription('Mark a task as done')
      .addIntegerOption(opt =>
        opt.setName('task_id').setDescription('Task ID').setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('mine')
      .setDescription('Show your open tasks')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const memberAlias = interaction.options.getString('member');
    const status = interaction.options.getString('status') || 'open';

    let tasks;
    if (memberAlias) {
      const discordId = resolveAlias(memberAlias);
      if (!discordId) {
        await interaction.reply({
          content: `Unknown alias **${memberAlias}**. Use \`/alias list\` to see available aliases.`,
          ephemeral: true,
        });
        return;
      }
      tasks = getTasksByMember(discordId, status);
    } else {
      tasks = getTasksByStatus(status);
    }

    if (tasks.length === 0) {
      await interaction.reply({ content: `No ${status} tasks found.`, ephemeral: true });
      return;
    }

    const lines = tasks.map(t => {
      const mentions = t.responsible_ids.split(',').map(id => `<@${id}>`).join(' ');
      const statusIcon = t.status === 'done' ? '~~' : '';
      let line = `**#${t.id}** ${statusIcon}${t.description}${statusIcon}`;
      line += `\n   Responsible: ${mentions}`;
      if (t.deadline) line += ` | Deadline: ${t.deadline}`;
      line += ` | Status: ${t.status}`;
      return line;
    });

    // Discord has a 2000 char limit; chunk if needed
    const header = `**Tasks (${status})**\n`;
    let content = header + lines.join('\n\n');
    if (content.length > 2000) {
      content = header + lines.slice(0, 10).join('\n\n') + `\n\n... and ${tasks.length - 10} more`;
    }

    await interaction.reply({ content, ephemeral: true });
  }

  else if (sub === 'done') {
    const taskId = interaction.options.getInteger('task_id');
    const task = getTask(taskId);

    if (!task) {
      await interaction.reply({ content: `Task #${taskId} not found.`, ephemeral: true });
      return;
    }

    if (task.status === 'done') {
      await interaction.reply({ content: `Task #${taskId} is already marked done.`, ephemeral: true });
      return;
    }

    updateTaskStatus(taskId, 'done');

    // Edit the original Discord message to strikethrough
    if (task.message_id && task.channel_id) {
      try {
        const channel = interaction.guild.channels.cache.get(task.channel_id);
        if (channel) {
          const msg = await channel.messages.fetch(task.message_id);
          const edited = msg.content.replace(
            `• ${task.description}`,
            `• ~~${task.description}~~`
          );
          await msg.edit({ content: edited });
        }
      } catch {
        // Message may have been deleted; that's fine
      }
    }

    await interaction.reply({ content: `Task #${taskId} marked as done.`, ephemeral: true });
  }

  else if (sub === 'mine') {
    const discordId = interaction.user.id;
    const tasks = getTasksByMember(discordId, 'open');

    if (tasks.length === 0) {
      await interaction.reply({ content: 'You have no open tasks.', ephemeral: true });
      return;
    }

    const lines = tasks.map(t => {
      let line = `**#${t.id}** ${t.description}`;
      if (t.deadline) line += ` — Deadline: ${t.deadline}`;
      return line;
    });

    await interaction.reply({ content: `**Your Open Tasks**\n${lines.join('\n')}`, ephemeral: true });
  }
}
