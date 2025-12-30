import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import db from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';
import { scanLibrary } from '../services/scanner.js';

const router = express.Router();

// Get all libraries
router.get('/', authenticateToken, (req, res) => {
  const libraries = db.prepare('SELECT * FROM libraries ORDER BY name').all();
  res.json(libraries);
});

// Add a new library
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, path: libraryPath, type } = req.body;

    if (!name || !libraryPath || !type) {
      return res.status(400).json({ error: 'Name, path, and type are required' });
    }

    // Validate path exists
    if (!fs.existsSync(libraryPath)) {
      return res.status(400).json({ error: 'Path does not exist' });
    }

    const validTypes = ['movies', 'tvshows', 'music', 'photos'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid library type' });
    }

    const libraryId = uuidv4();

    db.prepare(`
      INSERT INTO libraries (id, name, path, type)
      VALUES (?, ?, ?, ?)
    `).run(libraryId, name, libraryPath, type);

    const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(libraryId);

    // Start scanning in background
    scanLibrary(libraryId).catch(err => console.error('Scan error:', err));

    res.json(library);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Library path already exists' });
    }
    console.error('Add library error:', error);
    res.status(500).json({ error: 'Failed to add library' });
  }
});

// Scan/rescan a library
router.post('/:id/scan', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const library = db.prepare('SELECT * FROM libraries WHERE id = ?').get(req.params.id);
    
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    // Start scanning in background
    scanLibrary(library.id).catch(err => console.error('Scan error:', err));

    res.json({ message: 'Scan started' });
  } catch (error) {
    console.error('Scan library error:', error);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

// Delete a library
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = db.prepare('DELETE FROM libraries WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Library not found' });
    }

    res.json({ message: 'Library deleted' });
  } catch (error) {
    console.error('Delete library error:', error);
    res.status(500).json({ error: 'Failed to delete library' });
  }
});

// Browse filesystem (for library setup)
router.get('/browse', authenticateToken, (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let browsePath = req.query.path || process.env.HOME || '/';
    
    // Handle special paths
    if (browsePath === '~') {
      browsePath = process.env.HOME || '/';
    }

    if (!fs.existsSync(browsePath)) {
      return res.status(400).json({ error: 'Path does not exist' });
    }

    const stats = fs.statSync(browsePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' });
    }

    const entries = fs.readdirSync(browsePath, { withFileTypes: true })
      .filter(entry => {
        // Filter out hidden files and system directories
        if (entry.name.startsWith('.')) return false;
        if (entry.name === 'node_modules') return false;
        return entry.isDirectory();
      })
      .map(entry => ({
        name: entry.name,
        path: path.join(browsePath, entry.name),
        isDirectory: entry.isDirectory()
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentPath: browsePath,
      parentPath: path.dirname(browsePath),
      entries
    });
  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Get mounted volumes (for removable devices)
router.get('/volumes', authenticateToken, (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const volumes = [];
    
    // macOS volumes
    const macVolumesPath = '/Volumes';
    if (fs.existsSync(macVolumesPath)) {
      const macVolumes = fs.readdirSync(macVolumesPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory() || entry.isSymbolicLink())
        .map(entry => ({
          name: entry.name,
          path: path.join(macVolumesPath, entry.name),
          type: 'volume'
        }));
      volumes.push(...macVolumes);
    }

    // Linux mount points
    const linuxMediaPath = '/media';
    if (fs.existsSync(linuxMediaPath)) {
      const username = process.env.USER || process.env.USERNAME;
      const userMediaPath = path.join(linuxMediaPath, username);
      
      if (fs.existsSync(userMediaPath)) {
        const linuxVolumes = fs.readdirSync(userMediaPath, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => ({
            name: entry.name,
            path: path.join(userMediaPath, entry.name),
            type: 'volume'
          }));
        volumes.push(...linuxVolumes);
      }
    }

    // Add home directory
    volumes.unshift({
      name: 'Home',
      path: process.env.HOME || '/',
      type: 'home'
    });

    res.json(volumes);
  } catch (error) {
    console.error('Volumes error:', error);
    res.status(500).json({ error: 'Failed to get volumes' });
  }
});

export default router;
