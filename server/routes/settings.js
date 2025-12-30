import express from 'express';
import db from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsObj = {};
    settings.forEach(s => {
      // Mask API keys
      if (s.key.toLowerCase().includes('api_key')) {
        settingsObj[s.key] = s.value ? '••••••••' + s.value.slice(-4) : '';
      } else {
        settingsObj[s.key] = s.value;
      }
    });
    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get TMDB API key status (for internal use)
export function getTMDBApiKey() {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('tmdb_api_key');
    return result?.value || process.env.TMDB_API_KEY || '';
  } catch (e) {
    return process.env.TMDB_API_KEY || '';
  }
}

// Update setting
router.put('/:key', authenticateToken, (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { key } = req.params;
    const { value } = req.body;

    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);

    if (existing) {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }

    res.json({ key, value });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get server info
router.get('/server', (req, res) => {
  res.json({
    name: 'Soundstage Media Server',
    version: '1.0.0',
    platform: process.platform,
    nodeVersion: process.version
  });
});

export default router;
