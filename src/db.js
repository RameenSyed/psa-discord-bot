import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'psa_tasks.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE NOT NULL,
    discord_id TEXT NOT NULL,
    discord_handle TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    location TEXT,
    description TEXT,
    responsible_ids TEXT,
    countdown_active INTEGER DEFAULT 0,
    countdown_channel_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rollcalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    responsible_ids TEXT NOT NULL,
    deadline TEXT,
    category TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_id TEXT,
    channel_id TEXT
  );
`);

// --- Member / Alias helpers ---

const stmtAddAlias = db.prepare(
  'INSERT OR REPLACE INTO members (alias, discord_id, discord_handle) VALUES (?, ?, ?)'
);
export function addAlias(alias, discordId, discordHandle) {
  return stmtAddAlias.run(alias.toLowerCase(), discordId, discordHandle);
}

const stmtRemoveAlias = db.prepare('DELETE FROM members WHERE alias = ?');
export function removeAlias(alias) {
  return stmtRemoveAlias.run(alias.toLowerCase());
}

const stmtListAliases = db.prepare('SELECT alias, discord_id, discord_handle FROM members ORDER BY alias');
export function listAliases() {
  return stmtListAliases.all();
}

const stmtResolveAlias = db.prepare('SELECT discord_id FROM members WHERE alias = ?');
export function resolveAlias(alias) {
  const row = stmtResolveAlias.get(alias.toLowerCase());
  return row ? row.discord_id : null;
}

// --- Task helpers ---

const stmtAddTask = db.prepare(`
  INSERT INTO tasks (description, responsible_ids, deadline, category, message_id, channel_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);
export function addTask({ description, responsibleIds, deadline, category, messageId, channelId }) {
  return stmtAddTask.run(
    description,
    responsibleIds,
    deadline || null,
    category || null,
    messageId || null,
    channelId || null
  );
}

const stmtGetTask = db.prepare('SELECT * FROM tasks WHERE id = ?');
export function getTask(id) {
  return stmtGetTask.get(id);
}

const stmtUpdateTaskStatus = db.prepare('UPDATE tasks SET status = ? WHERE id = ?');
export function updateTaskStatus(id, status) {
  return stmtUpdateTaskStatus.run(status, id);
}

const stmtGetTasksByStatus = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC');
const stmtGetAllTasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
export function getTasksByStatus(status) {
  if (status === 'all') return stmtGetAllTasks.all();
  return stmtGetTasksByStatus.all(status);
}

export function getTasksByMember(discordId, status = 'open') {
  const tasks = status === 'all' ? stmtGetAllTasks.all() : stmtGetTasksByStatus.all(status);
  return tasks.filter(t => t.responsible_ids.split(',').includes(discordId));
}

const stmtGetTaskByMessageId = db.prepare('SELECT * FROM tasks WHERE message_id = ?');
export function getTaskByMessageId(messageId) {
  return stmtGetTaskByMessageId.get(messageId);
}

// --- Event helpers ---

const stmtAddEvent = db.prepare(`
  INSERT INTO events (name, date, time, location, description, responsible_ids)
  VALUES (?, ?, ?, ?, ?, ?)
`);
export function addEvent({ name, date, time, location, description, responsibleIds }) {
  return stmtAddEvent.run(name, date, time || null, location || null, description || null, responsibleIds || null);
}

const stmtGetEvent = db.prepare('SELECT * FROM events WHERE id = ?');
export function getEvent(id) {
  return stmtGetEvent.get(id);
}

const stmtListUpcomingEvents = db.prepare('SELECT * FROM events WHERE date >= ? ORDER BY date ASC');
const stmtListPastEvents = db.prepare('SELECT * FROM events WHERE date < ? ORDER BY date DESC');
const stmtListAllEvents = db.prepare('SELECT * FROM events ORDER BY date ASC');
export function listEvents(filter = 'upcoming') {
  const today = new Date().toISOString().split('T')[0];
  if (filter === 'upcoming') return stmtListUpcomingEvents.all(today);
  if (filter === 'past') return stmtListPastEvents.all(today);
  return stmtListAllEvents.all();
}

const stmtActivateCountdown = db.prepare('UPDATE events SET countdown_active = 1, countdown_channel_id = ? WHERE id = ?');
export function activateCountdown(eventId, channelId) {
  return stmtActivateCountdown.run(channelId, eventId);
}

const stmtDeactivateCountdown = db.prepare('UPDATE events SET countdown_active = 0 WHERE id = ?');
export function deactivateCountdown(eventId) {
  return stmtDeactivateCountdown.run(eventId);
}

const stmtGetActiveCountdowns = db.prepare('SELECT * FROM events WHERE countdown_active = 1');
export function getActiveCountdowns() {
  return stmtGetActiveCountdowns.all();
}

// --- Rollcall helpers ---

const stmtCreateRollcall = db.prepare('INSERT INTO rollcalls (message_id, channel_id) VALUES (?, ?)');
export function createRollcall(messageId, channelId) {
  return stmtCreateRollcall.run(messageId, channelId);
}

const stmtGetOpenRollcall = db.prepare("SELECT * FROM rollcalls WHERE status = 'open' ORDER BY created_at DESC LIMIT 1");
export function getOpenRollcall() {
  return stmtGetOpenRollcall.get();
}

const stmtCloseRollcall = db.prepare("UPDATE rollcalls SET status = 'closed' WHERE id = ?");
export function closeRollcall(id) {
  return stmtCloseRollcall.run(id);
}

export default db;
