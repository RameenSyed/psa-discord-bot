import { SlashCommandBuilder } from 'discord.js';
import { addAlias, removeAlias, listAliases } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('alias')
  .setDescription('Manage member aliases')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add or update a member alias')
      .addStringOption(opt => opt.setName('name').setDescription('Short alias name').setRequired(true))
      .addUserOption(opt => opt.setName('user').setDescription('Discord user').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a member alias')
      .addStringOption(opt => opt.setName('name').setDescription('Alias to remove').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List all aliases')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const name = interaction.options.getString('name');
    const user = interaction.options.getUser('user');
    addAlias(name, user.id, user.username);
    await interaction.reply({ content: `Alias **${name.toLowerCase()}** → ${user} saved.`, ephemeral: true });
  }

  else if (sub === 'remove') {
    const name = interaction.options.getString('name');
    const result = removeAlias(name);
    if (result.changes === 0) {
      await interaction.reply({ content: `Alias **${name}** not found.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `Alias **${name.toLowerCase()}** removed.`, ephemeral: true });
    }
  }

  else if (sub === 'list') {
    const aliases = listAliases();
    if (aliases.length === 0) {
      await interaction.reply({ content: 'No aliases configured. Use `/alias add` to create one.', ephemeral: true });
      return;
    }
    const lines = aliases.map(a => `**${a.alias}** → <@${a.discord_id}> (${a.discord_handle || 'unknown'})`);
    await interaction.reply({ content: `**Member Aliases**\n${lines.join('\n')}`, ephemeral: true });
  }
}
