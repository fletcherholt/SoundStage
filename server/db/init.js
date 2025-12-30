import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use SOUNDSTAGE_DATA_DIR if set (production), otherwise use relative path (development)
const dataDir = process.env.SOUNDSTAGE_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'soundstage.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Export dataDir for use by other modules
export const DATA_DIR = dataDir;

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Helper to safely add column if it doesn't exist
function addColumnIfNotExists(table, column, type, defaultValue = null) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const exists = columns.some(col => col.name === column);
    if (!exists) {
      const defaultClause = defaultValue !== null ? ` DEFAULT ${defaultValue}` : '';
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
      console.log(`Added column ${column} to ${table}`);
    }
  } catch (e) {
    // Table doesn't exist yet, will be created
  }
}

export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT DEFAULT '',
      display_name TEXT,
      avatar_path TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Libraries table (media folders)
  db.exec(`
    CREATE TABLE IF NOT EXISTS libraries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_scan DATETIME
    )
  `);

  // Media items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      library_id TEXT NOT NULL,
      title TEXT NOT NULL,
      original_title TEXT,
      type TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      file_name TEXT,
      file_size INTEGER,
      duration INTEGER,
      year INTEGER,
      end_year INTEGER,
      overview TEXT,
      tagline TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      logo_path TEXT,
      rating REAL,
      content_rating TEXT,
      genres TEXT,
      cast TEXT,
      directors TEXT,
      writers TEXT,
      studio TEXT,
      tmdb_id INTEGER,
      imdb_id TEXT,
      season_count INTEGER,
      episode_count INTEGER,
      status TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
    )
  `);

  // TV Show episodes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL,
      season_number INTEGER,
      episode_number INTEGER,
      title TEXT,
      overview TEXT,
      path TEXT NOT NULL,
      duration INTEGER,
      still_path TEXT,
      air_date TEXT,
      runtime INTEGER,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )
  `);

  // Seasons table for TV shows
  db.exec(`
    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL,
      season_number INTEGER NOT NULL,
      name TEXT,
      overview TEXT,
      poster_path TEXT,
      episode_count INTEGER,
      air_date TEXT,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )
  `);

  // Music tracks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL,
      title TEXT NOT NULL,
      track_number INTEGER,
      disc_number INTEGER,
      duration INTEGER,
      path TEXT NOT NULL,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )
  `);

  // Watch history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS watch_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Migrate existing tables - add new columns for TMDB metadata
  addColumnIfNotExists('media', 'original_title', 'TEXT');
  addColumnIfNotExists('media', 'tagline', 'TEXT');
  addColumnIfNotExists('media', 'end_year', 'INTEGER');
  addColumnIfNotExists('media', 'logo_path', 'TEXT');
  addColumnIfNotExists('media', 'content_rating', 'TEXT');
  addColumnIfNotExists('media', 'cast', 'TEXT');
  addColumnIfNotExists('media', 'directors', 'TEXT');
  addColumnIfNotExists('media', 'writers', 'TEXT');
  addColumnIfNotExists('media', 'studio', 'TEXT');
  addColumnIfNotExists('media', 'tmdb_id', 'INTEGER');
  addColumnIfNotExists('media', 'imdb_id', 'TEXT');
  addColumnIfNotExists('media', 'season_count', 'INTEGER');
  addColumnIfNotExists('media', 'episode_count', 'INTEGER');
  addColumnIfNotExists('media', 'status', 'TEXT');

  addColumnIfNotExists('episodes', 'air_date', 'TEXT');
  addColumnIfNotExists('episodes', 'runtime', 'INTEGER');

  console.log('✅ Database initialized');
}

export default db;
