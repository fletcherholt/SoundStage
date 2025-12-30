import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db, { DATA_DIR } from '../db/init.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'soundstage-secret-key';

// Setup multer for profile picture uploads - use shared DATA_DIR
const avatarDir = path.join(DATA_DIR, 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// Check if setup is needed (no users exist)
router.get('/status', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const libraries = db.prepare('SELECT COUNT(*) as count FROM libraries').get();
  
  res.json({
    needsSetup: users.count === 0,
    hasLibraries: libraries.count > 0
  });
});

// Get all profiles (no auth required for local use)
router.get('/profiles', (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, avatar_path, is_admin, created_at FROM users').all();
  res.json(users.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name || u.username,
    avatarPath: u.avatar_path,
    isAdmin: u.is_admin === 1,
    createdAt: u.created_at
  })));
});

// Select a profile (no password needed)
router.post('/select-profile', (req, res) => {
  try {
    const { profileId } = req.body;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(profileId);
    
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin === 1 },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name || user.username,
        avatarPath: user.avatar_path,
        isAdmin: user.is_admin === 1
      }
    });
  } catch (error) {
    console.error('Select profile error:', error);
    res.status(500).json({ error: 'Failed to select profile' });
  }
});

// Create a new profile
router.post('/profiles', upload.single('avatar'), (req, res) => {
  try {
    const { name, isAdmin } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    const userId = uuidv4();
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const avatarPath = req.file ? `/avatars/${req.file.filename}` : null;

    // Check if first user (make them admin)
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const shouldBeAdmin = userCount.count === 0 ? 1 : (isAdmin === 'true' ? 1 : 0);

    db.prepare(`
      INSERT INTO users (id, username, password, display_name, avatar_path, is_admin)
      VALUES (?, ?, '', ?, ?, ?)
    `).run(userId, username + '_' + userId.slice(0, 8), name, avatarPath, shouldBeAdmin);

    res.json({
      id: userId,
      username: username,
      displayName: name,
      avatarPath,
      isAdmin: shouldBeAdmin === 1
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Update profile
router.put('/profiles/:id', upload.single('avatar'), (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let avatarPath = existing.avatar_path;
    if (req.file) {
      // Delete old avatar if exists
      if (existing.avatar_path) {
        const oldPath = path.join(avatarDir, path.basename(existing.avatar_path));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      avatarPath = `/avatars/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE users SET display_name = ?, avatar_path = ? WHERE id = ?
    `).run(name || existing.display_name, avatarPath, id);

    res.json({
      id,
      displayName: name || existing.display_name,
      avatarPath
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete profile
router.delete('/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Delete avatar file if exists
    if (existing.avatar_path) {
      const avatarFile = path.join(avatarDir, path.basename(existing.avatar_path));
      if (fs.existsSync(avatarFile)) {
        fs.unlinkSync(avatarFile);
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, avatar_path, is_admin FROM users WHERE id = ?').get(req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    avatarPath: user.avatar_path,
    isAdmin: user.is_admin === 1
  });
});

// Legacy endpoints for compatibility
router.get('/users', authenticateToken, (req, res) => {
  const users = db.prepare('SELECT id, username, display_name, avatar_path, is_admin, created_at FROM users').all();
  res.json(users.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name || u.username,
    avatarPath: u.avatar_path,
    isAdmin: u.is_admin === 1,
    createdAt: u.created_at
  })));
});

export default router;
