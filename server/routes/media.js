import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all media with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { type, library_id, search, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM media WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (library_id) {
      query += ' AND library_id = ?';
      params.push(library_id);
    }

    if (search) {
      query += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY title LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const media = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM media WHERE 1=1';
    const countParams = [];
    
    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }
    if (library_id) {
      countQuery += ' AND library_id = ?';
      countParams.push(library_id);
    }
    if (search) {
      countQuery += ' AND title LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ media, total });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Failed to get media' });
  }
});

// Get recent additions
router.get('/recent', authenticateToken, (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const media = db.prepare(`
      SELECT * FROM media 
      ORDER BY added_at DESC 
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json(media);
  } catch (error) {
    console.error('Get recent error:', error);
    res.status(500).json({ error: 'Failed to get recent media' });
  }
});

// Get single media item
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Parse JSON fields
    if (media.genres) media.genres = JSON.parse(media.genres);
    if (media.cast) media.cast = JSON.parse(media.cast);
    if (media.directors) media.directors = JSON.parse(media.directors);
    if (media.writers) media.writers = JSON.parse(media.writers);

    // Get episodes and seasons if TV show
    if (media.type === 'tvshow') {
      const episodes = db.prepare(`
        SELECT * FROM episodes 
        WHERE media_id = ? 
        ORDER BY season_number, episode_number
      `).all(media.id);
      media.episodes = episodes;

      const seasons = db.prepare(`
        SELECT * FROM seasons
        WHERE media_id = ?
        ORDER BY season_number
      `).all(media.id);
      media.seasons = seasons;
    }

    // Get tracks if album
    if (media.type === 'album') {
      const tracks = db.prepare(`
        SELECT * FROM tracks 
        WHERE media_id = ? 
        ORDER BY disc_number, track_number
      `).all(media.id);
      media.tracks = tracks;
    }

    // Get watch progress for user
    if (req.user) {
      const progress = db.prepare(`
        SELECT position, completed FROM watch_history 
        WHERE user_id = ? AND media_id = ?
        ORDER BY watched_at DESC
        LIMIT 1
      `).get(req.user.id, media.id);
      
      media.progress = progress || { position: 0, completed: false };
    }

    res.json(media);
  } catch (error) {
    console.error('Get media item error:', error);
    res.status(500).json({ error: 'Failed to get media item' });
  }
});

// Update watch progress
router.post('/:id/progress', authenticateToken, (req, res) => {
  try {
    const { position, completed } = req.body;
    const mediaId = req.params.id;
    const userId = req.user.id;

    const existing = db.prepare(`
      SELECT id FROM watch_history 
      WHERE user_id = ? AND media_id = ?
    `).get(userId, mediaId);

    if (existing) {
      db.prepare(`
        UPDATE watch_history 
        SET position = ?, completed = ?, watched_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(position || 0, completed ? 1 : 0, existing.id);
    } else {
      db.prepare(`
        INSERT INTO watch_history (id, user_id, media_id, position, completed)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, mediaId, position || 0, completed ? 1 : 0);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get continue watching
router.get('/user/continue', authenticateToken, (req, res) => {
  try {
    const media = db.prepare(`
      SELECT m.*, wh.position, wh.completed 
      FROM media m
      JOIN watch_history wh ON m.id = wh.media_id
      WHERE wh.user_id = ? AND wh.completed = 0 AND wh.position > 0
      ORDER BY wh.watched_at DESC
      LIMIT 10
    `).all(req.user.id);

    res.json(media);
  } catch (error) {
    console.error('Get continue watching error:', error);
    res.status(500).json({ error: 'Failed to get continue watching' });
  }
});

// Get library stats
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    const movies = db.prepare("SELECT COUNT(*) as count FROM media WHERE type = 'movie'").get();
    const tvshows = db.prepare("SELECT COUNT(*) as count FROM media WHERE type = 'tvshow'").get();
    const music = db.prepare("SELECT COUNT(*) as count FROM media WHERE type = 'album'").get();
    const episodes = db.prepare("SELECT COUNT(*) as count FROM episodes").get();
    const tracks = db.prepare("SELECT COUNT(*) as count FROM tracks").get();

    res.json({
      movies: movies.count,
      tvshows: tvshows.count,
      albums: music.count,
      episodes: episodes.count,
      tracks: tracks.count
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
