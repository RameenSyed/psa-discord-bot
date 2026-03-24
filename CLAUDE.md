# PSA Discord Task Bot

## Project Overview

A Discord bot for the Pakistani Student Association (PSA) at RIT's E-board server. It creates, assigns, and tracks tasks with proper @mentions using Discord's native `<@USER_ID>` syntax.

## Tech Stack

- **Runtime:** Node.js 20+
- **Discord Library:** discord.js v14
- **Database:** SQLite via better-sqlite3
- **Language:** JavaScript (ESM)

## Project Structure

```
psa-task-bot/
├── CLAUDE.md
├── package.json
├── .env                  # DISCORD_BOT_TOKEN, GUILD_ID, TASK_CHANNEL_ID
├── .gitignore
├── src/
│   ├── index.js          # Entry point — client setup, event handlers, command registration
│   ├── db.js             # SQLite init, schema, query helpers
│   ├── commands/
│   │   ├── task.js       # /task slash command
│   │   ├── taskbulk.js   # /taskbulk modal flow
│   │   ├── alias.js      # /alias add|remove|list subcommands
│   │   └── tasks.js      # /tasks list|done|mine subcommands
│   └── events/
│       ├── reactionAdd.js    # ✅ reaction listener for task completion
│       └── interactionCreate.js  # Route slash commands and modals
└── psa_tasks.db          # Auto-created on first run
```

## Key Design Decisions

- **Guild-specific command registration** — slash commands register instantly (no 1-hour global cache). Use `guild.commands.set()` not `application.commands.set()`.
- **Alias system** — members table maps short names ("ruqiah") to Discord user IDs. The `/task` command accepts comma-separated aliases in the `responsible` field and resolves them to `<@ID>` mentions.
- **Task message format:**
  ```
  • Task description here.
  Responsible: <@123> <@456>
  Deadline: Friday, March 27
  ```
  Use `•` bullet character. Each field on its own line. One blank line between tasks.
- **Bulk tasks** — `/taskbulk` opens a Discord modal. The "Tasks" field is a paragraph input parsed as blocks separated by blank lines, each block having lines for description, `responsible:`, and `deadline:`.
- **Task completion** — bot reacts with ✅ on posted tasks. When a responsible member clicks ✅, the bot edits the message to strikethrough the description and marks it done in the DB.

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT UNIQUE NOT NULL,
  discord_id TEXT NOT NULL,
  discord_handle TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  responsible_ids TEXT NOT NULL,       -- comma-separated Discord user IDs
  deadline TEXT,
  category TEXT,
  status TEXT DEFAULT 'open',          -- 'open' or 'done'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_id TEXT,                     -- Discord message ID
  channel_id TEXT                      -- Discord channel ID
);
```

## Default Member Aliases

Seed these on first run or via `/alias add`:

| Alias | Handle |
|-------|--------|
| ruqiah | ruq2179 |
| vaania | vmk5404 |
| hashir | hashiradeel |
| aamir | singhamreturns |
| zara | zarazalea |
| ahyan | azkhanrikkey |
| kamran | kami766 |
| ramin | habibiramin |

The discord_id for each must be obtained from the actual server (right-click user → Copy User ID with Developer Mode enabled).

## Slash Commands

### /task
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| description | STRING | Yes | |
| responsible | STRING | Yes | Comma-separated aliases or raw @mentions |
| deadline | STRING | Yes | Free-text |
| category | STRING | No | Bold header above the task |

### /taskbulk
No params — opens a modal with:
- **Category** (short text)
- **Tasks** (paragraph text) — blocks separated by blank lines:
  ```
  Description line
  responsible: alias1, alias2
  deadline: Friday
  ```

### /alias add
| Param | Type | Required |
|-------|------|----------|
| name | STRING | Yes |
| user | USER | Yes |

### /alias remove
| Param | Type | Required |
|-------|------|----------|
| name | STRING | Yes |

### /alias list
No params. Ephemeral response.

### /tasks list
| Param | Type | Required |
|-------|------|----------|
| member | STRING | No — alias filter |
| status | STRING (choices: open/done/all) | No, default open |

### /tasks done
| Param | Type | Required |
|-------|------|----------|
| task_id | INTEGER | Yes |

### /tasks mine
No params. Shows caller's open tasks.

## Implementation Notes

- Use `discord.js` SlashCommandBuilder and SubcommandBuilder for `/alias` and `/tasks`.
- Modal submissions come through the `interactionCreate` event with `interaction.isModalSubmit()`.
- For the ✅ reaction flow, listen to `messageReactionAdd`. The bot must have the `GatewayIntentBits.MessageContent` and `GatewayIntentBits.GuildMessageReactions` intents, plus partials for `MESSAGE` and `REACTION`.
- All command responses that show task lists or alias lists should be ephemeral (`ephemeral: true`).
- Error handling: if an alias lookup fails, reply with an ephemeral error listing the unknown alias and suggesting `/alias list`.
- Use `dotenv` for environment variables.

## Build Order

1. Scaffold: package.json, .env, .gitignore, src/index.js with client login
2. Database: src/db.js with schema init and helpers
3. /alias commands (add, remove, list) — needed before tasks work
4. /task command with alias resolution and formatted posting
5. /taskbulk modal flow
6. /tasks list, done, mine
7. ✅ reaction listener
8. Polish: error messages, input validation, edge cases
