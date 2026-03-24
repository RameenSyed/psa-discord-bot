import { getTaskByMessageId, updateTaskStatus } from '../db.js';

export async function handleReactionAdd(reaction, user, client) {
  // Ignore bot's own reactions
  if (user.bot) return;

  // Only care about ✅
  if (reaction.emoji.name !== '✅') return;

  // Handle partials
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }
  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch {
      return;
    }
  }

  // Only process messages from the bot
  if (reaction.message.author.id !== client.user.id) return;

  const task = getTaskByMessageId(reaction.message.id);
  if (!task || task.status === 'done') return;

  // Check if the reactor is a responsible member
  const responsibleIds = task.responsible_ids.split(',');
  if (!responsibleIds.includes(user.id)) return;

  // Mark as done
  updateTaskStatus(task.id, 'done');

  // Edit message with strikethrough
  try {
    const edited = reaction.message.content.replace(
      `• ${task.description}`,
      `• ~~${task.description}~~`
    );
    await reaction.message.edit({ content: edited });
  } catch {
    // Message editing may fail; that's acceptable
  }
}
