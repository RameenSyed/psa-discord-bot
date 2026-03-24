import { SlashCommandBuilder } from 'discord.js';
import { createRollcall, getOpenRollcall, closeRollcall, listAliases } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('rollcall')
  .setDescription('Meeting attendance check')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a roll call')
      .addStringOption(opt =>
        opt.setName('message')
          .setDescription('Custom message')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('close')
      .setDescription('Close the current roll call and show attendance')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    // Check if there's already an open rollcall
    const existing = getOpenRollcall();
    if (existing) {
      await interaction.reply({
        content: 'There is already an open roll call. Use `/rollcall close` first.',
        ephemeral: true,
      });
      return;
    }

    const customMessage = interaction.options.getString('message') || "React ✋ if you'll be at today's meeting!";
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    });

    const content = `✋ **Roll Call — ${today} Meeting**\n${customMessage}`;
    const msg = await interaction.channel.send({ content });
    await msg.react('✋');

    createRollcall(msg.id, msg.channel.id);
    await interaction.reply({ content: 'Roll call started!', ephemeral: true });
  }

  else if (sub === 'close') {
    const rollcall = getOpenRollcall();
    if (!rollcall) {
      await interaction.reply({ content: 'No open roll call to close.', ephemeral: true });
      return;
    }

    // Fetch the rollcall message and its reactions
    const channel = interaction.guild.channels.cache.get(rollcall.channel_id);
    if (!channel) {
      await interaction.reply({ content: 'Roll call channel not found.', ephemeral: true });
      return;
    }

    let msg;
    try {
      msg = await channel.messages.fetch(rollcall.message_id);
    } catch {
      await interaction.reply({ content: 'Roll call message not found (may have been deleted).', ephemeral: true });
      closeRollcall(rollcall.id);
      return;
    }

    // Get users who reacted with ✋
    const reaction = msg.reactions.cache.get('✋');
    let reactedUserIds = new Set();
    if (reaction) {
      const users = await reaction.users.fetch();
      for (const [userId, user] of users) {
        if (!user.bot) reactedUserIds.add(userId);
      }
    }

    // Get all members from alias table
    const allMembers = listAliases();
    const attending = [];
    const notResponded = [];

    for (const member of allMembers) {
      if (reactedUserIds.has(member.discord_id)) {
        attending.push(`<@${member.discord_id}>`);
      } else {
        notResponded.push(`<@${member.discord_id}>`);
      }
    }

    // Edit the message with attendance summary
    let summary = msg.content;
    summary += `\n\n**Attending (${attending.length}):** ${attending.join(' ') || 'None'}`;
    summary += `\n**Not responded (${notResponded.length}):** ${notResponded.join(' ') || 'None'}`;

    await msg.edit({ content: summary });
    closeRollcall(rollcall.id);

    await interaction.reply({ content: `Roll call closed. ${attending.length} attending, ${notResponded.length} not responded.`, ephemeral: true });
  }
}
