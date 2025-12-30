import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

import { initDatabase, DATA_DIR } from './db/init.js';
import authRoutes from './routes/auth.js';
import libraryRoutes from './routes/library.js';
import mediaRoutes from './routes/media.js';
import streamRoutes from './routes/stream.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Use the shared DATA_DIR from db/init.js
const dataDir = DATA_DIR;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static cache files (thumbnails, metadata images)
app.use('/cache', express.static(path.join(dataDir, 'cache')));
app.use('/api/cache', express.static(path.join(dataDir, 'cache')));

// Serve avatar images
app.use('/avatars', express.static(path.join(dataDir, 'avatars')));
app.use('/api/avatars', express.static(path.join(dataDir, 'avatars')));

// Serve logo assets (with /api prefix for frontend compatibility)
app.use('/api/logos', express.static(path.join(__dirname, '..', 'Logos')));

// Serve font files
app.use('/fonts', express.static(path.join(__dirname, '..', 'Font for logo')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🎬 Soundstage Media Server running on http://localhost:${PORT}`);
});
