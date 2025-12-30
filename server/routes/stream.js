import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db/init.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { transcodeVideo } from '../services/transcoder.js';

const router = express.Router();

// Mime type mapping for media files
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.wma': 'audio/x-ms-wma',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Stream file with range support
const streamFile = (req, res, filePath) => {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(filePath);
  const range = req.headers.range;

  console.log(`Streaming file: ${filePath}, Size: ${fileSize}, Range: ${range || 'none'}`);

  // Set headers for streaming
  res.setHeader('Accept-Ranges', 'bytes');
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    // Validate range
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }
    
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    
    file.on('error', (err) => {
      console.error('Stream read error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    });
    
    file.pipe(res);
  } else {
    // No range requested, send entire file
    const file = fs.createReadStream(filePath);
    
    file.on('error', (err) => {
      console.error('Stream read error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });
    
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    });
    
    file.pipe(res);
  }
};

// Stream video/audio file
router.get('/video/:id', optionalAuth, async (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    
    if (!media) {
      return res.status(404).json({ error: 'Media not found in database' });
    }

    console.log(`Streaming video: ${media.title} from ${media.path}`);
    streamFile(req, res, media.path);
  } catch (error) {
    console.error('Stream video error:', error);
    res.status(500).json({ error: 'Streaming failed', details: error.message });
  }
});

// Stream episode
router.get('/episode/:id', optionalAuth, async (req, res) => {
  try {
    const episode = db.prepare('SELECT * FROM episodes WHERE id = ?').get(req.params.id);
    
    if (!episode) {
      return res.status(404).json({ error: 'Episode not found in database' });
    }

    console.log(`Streaming episode: ${episode.title} from ${episode.path}`);
    streamFile(req, res, episode.path);
  } catch (error) {
    console.error('Stream episode error:', error);
    res.status(500).json({ error: 'Streaming failed', details: error.message });
  }
});

// Stream audio track
router.get('/track/:id', optionalAuth, async (req, res) => {
  try {
    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
    
    if (!track) {
      return res.status(404).json({ error: 'Track not found in database' });
    }

    console.log(`Streaming track: ${track.title} from ${track.path}`);
    streamFile(req, res, track.path);
  } catch (error) {
    console.error('Stream track error:', error);
    res.status(500).json({ error: 'Streaming failed', details: error.message });
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
