import { getActiveCountdowns, deactivateCountdown } from '../db.js';

let lastPostedDate = null;

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

async function checkCountdowns(client) {
  // Only post once per day, at 9 AM ET
  const now = new Date();
  const etHour = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }));
  const todayStr = now.toLocaleDateString('en-US', { timeZone: 'America/New_York' });

  // Post at the 9 AM hour check, and only once per day
  if (etHour !== 9 || lastPostedDate === todayStr) return;
  lastPostedDate = todayStr;

  const countdowns = getActiveCountdowns();
  if (countdowns.length === 0) return;

  const today = new Date(now.toLocaleDateString('en-US', { timeZone: 'America/New_York' }));

  for (const event of countdowns) {
    const eventDate = new Date(event.date + 'T12:00:00');
    const diffMs = eventDate - today;
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const channel = client.channels.cache.get(event.countdown_channel_id);
    if (!channel) continue;

    try {
      if (daysLeft > 1) {
        let details = `📅 ${formatDate(event.date)}`;
        if (event.time) details += ` · ${event.time}`;
        if (event.location) details += ` · ${event.location}`;
        await channel.send(`⏳ **${event.name}** is in **${daysLeft} days!**\n${details}`);
      } else if (daysLeft === 1) {
        let details = `📅 ${formatDate(event.date)}`;
        if (event.time) details += ` · ${event.time}`;
        if (event.location) details += ` · ${event.location}`;
        await channel.send(`⏳ **${event.name}** is **tomorrow!**\n${details}`);
      } else if (daysLeft === 0) {
        let details = '📅';
        if (event.time) details += ` ${event.time}`;
        if (event.location) details += ` · ${event.location}`;
        await channel.send(`🎉 **${event.name}** is **TODAY!**\n${details}`);
      } else {
        // Event has passed — auto-stop
        deactivateCountdown(event.id);
      }
    } catch (err) {
      console.error(`Countdown post failed for event #${event.id}:`, err.message);
    }
  }
}

export function startCountdownScheduler(client) {
  // Check every 30 minutes
  setInterval(() => checkCountdowns(client), 30 * 60 * 1000);
  // Also run once on startup
  checkCountdowns(client);
  console.log('Countdown scheduler started (checks every 30 min, posts at 9 AM ET)');
}
