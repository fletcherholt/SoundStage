// Server wrapper for Electron - CommonJS entry point
const { spawn } = require('child_process');
const path = require('path');

// Get the directory where this file is located
const serverDir = __dirname;
const serverMain = path.join(serverDir, 'index.js');

// Set environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Use dynamic import to load the ES module server
async function startServer() {
  try {
    // Import the ES module server
    await import(serverMain);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
