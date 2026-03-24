# PSA Discord Task Bot

Discord bot for PSA @ RIT's E-board that creates, assigns, and tracks tasks with proper @mentions. Supports slash commands for single and bulk task posting, member alias resolution, event tracking, countdowns, and roll call.

## Setup

1. Create a Discord Application at https://discord.com/developers/applications
2. Create a Bot user and copy the token
3. Invite the bot to your server with: `Send Messages`, `Manage Messages`, `Add Reactions`, `Read Message History`, `Use Slash Commands`
4. Copy `.env.example` to `.env` and fill in your values
5. `npm install`
6. `node src/index.js`

## Commands

### Member Aliases

Before creating tasks, register your board members so you can reference them by name.

**`/alias add`** — Register a member
```
/alias add name:ruqiah user:@ruq2179
```

**`/alias remove`** — Remove a member
```
/alias remove name:ruqiah
```

**`/alias list`** — Show all registered aliases (only visible to you)

---

### Creating Tasks

**`/task`** — Create a single task

| Parameter | Required | Description |
|-----------|----------|-------------|
| description | Yes | What needs to be done |
| responsible | Yes | Comma-separated aliases (e.g. `ruqiah, zara`) |
| deadline | Yes | When it's due (free text) |
| category | No | Bold header above the task |

Example:
```
/task description:Film promo reel responsible:kamran deadline:Friday category:Marketing
```

Posts in the task channel:
```
**Marketing**
• Film promo reel
Responsible: @kamran
Deadline: Friday
```

**`/taskbulk`** — Create multiple tasks at once via a popup form

1. Run `/taskbulk`
2. Fill in the **Category** (optional header)
3. In the **Tasks** field, enter one task per block separated by blank lines:

```
Film promo reel
responsible: kamran
deadline: Friday

Design event poster
responsible: ruqiah, vaania
deadline: Thursday
```

Each task is posted as its own message with a ✅ reaction.

---

### Managing Tasks

**`/tasks list`** — View tasks (only visible to you)

| Parameter | Required | Description |
|-----------|----------|-------------|
| member | No | Filter by alias |
| status | No | `open` (default), `done`, or `all` |

Examples:
```
/tasks list
/tasks list member:kamran status:all
```

**`/tasks done`** — Mark a task as complete
```
/tasks done task_id:5
```
Edits the original message with ~~strikethrough~~ and updates the database.

**`/tasks mine`** — Show your own open tasks (only visible to you)

**Reaction completion:** You can also click the ✅ reaction on any task message. If you're one of the responsible members, the bot marks it done automatically.

---

### Events

**`/event add`** — Create and post an event card

| Parameter | Required | Description |
|-----------|----------|-------------|
| name | Yes | Event name |
| date | Yes | Date in `YYYY-MM-DD` format |
| time | No | Time range (e.g. `2:00 PM - 5:00 PM`) |
| location | No | Where it's happening |
| description | No | Brief description |
| responsible | No | Comma-separated aliases for event leads |

Example:
```
/event add name:Jeeto Pakistan date:2026-04-12 time:2:00 PM - 5:00 PM location:SAU Room 1829 responsible:ahyan, kamran
```

Posts:
```
📅 **Jeeto Pakistan**
Date: Saturday, April 12
Time: 2:00 PM - 5:00 PM
Location: SAU Room 1829
Leads: @ahyan @kamran
```

**`/events`** — List events (only visible to you)

| Parameter | Required | Description |
|-----------|----------|-------------|
| show | No | `upcoming` (default), `past`, or `all` |

Each event shows its **ID number** which you'll need for countdown commands.

---

### Countdowns

Activate daily countdown messages for an event. The bot posts once per day at **9:00 AM ET**.

**`/countdown start`** — Start a countdown

| Parameter | Required | Description |
|-----------|----------|-------------|
| event_id | Yes | Event ID from `/events` |
| channel | No | Channel for posts (defaults to current) |

```
/countdown start event_id:3
```

Daily posts look like:
```
⏳ **Jeeto Pakistan** is in **3 days!**
📅 Saturday, April 12 · 2:00 PM - 5:00 PM · SAU Room 1829
```

On the day of:
```
🎉 **Jeeto Pakistan** is TODAY!
📅 2:00 PM - 5:00 PM · SAU Room 1829
```

Countdowns **auto-stop** after the event date passes.

**`/countdown stop`** — Stop a countdown manually
```
/countdown stop event_id:3
```

**`/countdown list`** — Show all active countdowns (only visible to you)

---

### Roll Call

Quick attendance check for meetings.

**`/rollcall start`** — Start a roll call

| Parameter | Required | Description |
|-----------|----------|-------------|
| message | No | Custom message (default: "React ✋ if you'll be at today's meeting!") |

Posts a message and reacts with ✋. Board members react to confirm attendance.

**`/rollcall close`** — Close the roll call and show results

Edits the original message to show:
```
✋ **Roll Call — March 24 Meeting**
React ✋ if you'll be at today's meeting!

**Attending (5):** @ruqiah @ahyan @kamran @ramin @vaania
**Not responded (3):** @aamir @hashir @zara
```

The bot compares ✋ reactions against all registered aliases to determine who responded.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Bot token from Discord Developer Portal |
| `GUILD_ID` | Your Discord server ID |
| `TASK_CHANNEL_ID` | Channel where `/task` and `/taskbulk` post messages |
| `TZ` | Timezone for countdowns (default: `America/New_York`) |

## Semester Turnover

When the board changes:
- Use `/alias remove` and `/alias add` to update members
- Old tasks stay in the database for reference
- Active countdowns continue until their events pass
