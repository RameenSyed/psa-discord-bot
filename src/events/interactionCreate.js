import * as alias from '../commands/alias.js';
import * as task from '../commands/task.js';
import * as taskbulk from '../commands/taskbulk.js';
import * as tasks from '../commands/tasks.js';
import * as event from '../commands/event.js';
import * as events from '../commands/events.js';
import * as countdown from '../commands/countdown.js';
import * as rollcall from '../commands/rollcall.js';

const commands = new Map();
commands.set(alias.data.name, alias);
commands.set(task.data.name, task);
commands.set(taskbulk.data.name, taskbulk);
commands.set(tasks.data.name, tasks);
commands.set(event.data.name, event);
commands.set(events.data.name, events);
commands.set(countdown.data.name, countdown);
commands.set(rollcall.data.name, rollcall);

export { commands };

export async function handleInteraction(interaction) {
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'taskbulk_modal') {
      await taskbulk.handleModal(interaction);
    }
    return;
  }

  // Handle slash commands
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const reply = { content: 'Something went wrong executing that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
