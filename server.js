/**
 * Student Task & Notes Manager - Core Backend Server
 * Technology Stack: Node.js, Express.js
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure that database folder and JSON files exist
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initializeJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
  }
};

initializeJsonFile(USERS_FILE);
initializeJsonFile(TASKS_FILE);
initializeJsonFile(NOTES_FILE);

// Import API Route Modules
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');

// Map API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);

// SPA fallback for page routes (not for missing static assets)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Route not found' });
  }
  if (/\.[a-z0-9]+$/i.test(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start listening on port
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Student Task & Notes Manager is RUNNING`);
  console.log(`🖥️  Local server: http://localhost:${PORT}`);
  console.log(`📁 Local database folder: ${DATA_DIR}`);
  console.log(`=========================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Stop the other server (Ctrl+C in its terminal), or run:`);
    console.error(`   $env:PORT=3001; npm start\n`);
    process.exit(1);
  }
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
