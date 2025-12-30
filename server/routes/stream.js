import express from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import db from '../db/init.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { transcodeVideo } from '../services/transcoder.js';

const router = express.Router();

// Stream video/audio file
router.get('/video/:id', optionalAuth, async (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const filePath = media.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = mime.lookup(filePath) || 'video/mp4';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// Stream episode
router.get('/episode/:id', optionalAuth, async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(req.params.id);
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const filePath = episode.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = mime.lookup(filePath) || 'video/mp4';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream episode error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// Stream audio track
router.get('/track/:id', optionalAuth, async (req, res) => {
  try {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const filePath = track.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = mime.lookup(filePath) || 'audio/mpeg';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Stream track error:', error);
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// Transcode video (HLS)
router.get('/transcode/:id/playlist.m3u8', optionalAuth, async (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const playlist = await transcodeVideo(media.path, media.id);
    res.type('application/vnd.apple.mpegurl').send(playlist);
  } catch (error) {
    console.error('Transcode error:', error);
    res.status(500).json({ error: 'Transcoding failed' });
  }
});

// Serve HLS segments
router.get('/transcode/:id/:segment', optionalAuth, (req, res) => {
  try {
    const segmentPath = path.join(
      process.cwd(),
      'data',
      'cache',
      'transcode',
      req.params.id,
      req.params.segment
    );

    if (!fs.existsSync(segmentPath)) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.sendFile(segmentPath);
  } catch (error) {
    console.error('Serve segment error:', error);
    res.status(500).json({ error: 'Failed to serve segment' });
  }
});

// Get thumbnail
router.get('/thumbnail/:id', (req, res) => {
  try {
    const media = db.prepare('SELECT poster_path FROM media WHERE id = ?').get(req.params.id);
    
    if (!media || !media.poster_path) {
      // Return placeholder
      return res.redirect('/placeholder-poster.png');
    }

    if (media.poster_path.startsWith('http')) {
      return res.redirect(media.poster_path);
    }

    if (fs.existsSync(media.poster_path)) {
      return res.sendFile(media.poster_path);
    }

    res.redirect('/placeholder-poster.png');
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: 'Failed to get thumbnail' });
  }
});

export default router;
