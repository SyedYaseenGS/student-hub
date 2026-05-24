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
const voiceAIRoutes = require('./routes/voiceAI');

// Map API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/voiceAI', voiceAIRoutes);

// Fallback to login for non-existent HTML pages, or redirect to index
app.get('*', (req, res, next) => {
  // If requesting api, let it handle error or 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Route not found' });
  }
  // Otherwise, serve static index
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
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Student Task & Notes Manager is RUNNING`);
  console.log(`🖥️  Local server: http://localhost:${PORT}`);
  console.log(`📁 Local database folder: ${DATA_DIR}`);
  console.log(`=========================================`);
});
