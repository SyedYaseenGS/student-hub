/**
 * Notes API Router
 * /api/notes
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const NOTES_FILE = path.join(__dirname, '..', 'data', 'notes.json');

// Helper to read notes
const readNotes = () => {
  try {
    const data = fs.readFileSync(NOTES_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading notes file:', error);
    return [];
  }
};

// Helper to write notes
const writeNotes = (notes) => {
  try {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing notes file:', error);
    return false;
  }
};

// Apply Authentication Middleware to all note routes
router.use(auth);

// 1. GET /api/notes - Retrieve user notes
router.get('/', (req, res) => {
  try {
    const allNotes = readNotes();
    // Filter notes belonging to user
    const userNotes = allNotes.filter(note => note.userId === req.userId);
    
    res.status(200).json({
      success: true,
      notes: userNotes
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes.' });
  }
});

// 2. POST /api/notes - Create a new note
router.post('/', (req, res) => {
  try {
    const { title, content, color } = req.body;

    const allNotes = readNotes();
    const newNote = {
      id: Date.now().toString(),
      userId: req.userId,
      title: (title || '').trim(),
      content: (content || '').trim(),
      color: color || '#fdf0d5', // Default pastel yellow/cream
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allNotes.push(newNote);
    
    if (writeNotes(allNotes)) {
      res.status(201).json({
        success: true,
        message: 'Note created successfully!',
        note: newNote
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not write note file to disk.' });
    }
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, message: 'Failed to create note.' });
  }
});

// 3. PUT /api/notes/:id - Update an existing note
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, color } = req.body;

    const allNotes = readNotes();
    
    const noteIndex = allNotes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      return res.status(404).json({ success: false, message: 'Note not found!' });
    }

    if (allNotes[noteIndex].userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not own this note!' });
    }

    // Update note fields
    const noteToUpdate = allNotes[noteIndex];
    if (title !== undefined) noteToUpdate.title = title.trim();
    if (content !== undefined) noteToUpdate.content = content;
    if (color !== undefined) noteToUpdate.color = color;
    
    noteToUpdate.updatedAt = new Date().toISOString();

    allNotes[noteIndex] = noteToUpdate;

    if (writeNotes(allNotes)) {
      res.status(200).json({
        success: true,
        message: 'Note saved successfully!',
        note: noteToUpdate
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not write note updates to disk.' });
    }
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, message: 'Failed to update note.' });
  }
});

// 4. DELETE /api/notes/:id - Delete a note
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allNotes = readNotes();

    const noteIndex = allNotes.findIndex(note => note.id === id);
    if (noteIndex === -1) {
      return res.status(404).json({ success: false, message: 'Note not found!' });
    }

    if (allNotes[noteIndex].userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not own this note!' });
    }

    // Remove note
    allNotes.splice(noteIndex, 1);

    if (writeNotes(allNotes)) {
      res.status(200).json({
        success: true,
        message: 'Note deleted successfully!'
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not delete note due to writing error.' });
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, message: 'Failed to delete note.' });
  }
});

module.exports = router;
