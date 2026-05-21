/**
 * Authentication Endpoints Router
 * /api/auth
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_student_manager_key_2026';

// Helper to read users from JSON file
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Helper to write users to JSON file
const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
};

// 1. User Signup Route (/api/auth/register)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required!' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Read existing users
    const users = readUsers();

    // Check if user already exists
    const userExists = users.some(user => user.email === trimmedEmail);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists!' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    // Create user object
    const newUser = {
      id: Date.now().toString(),
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Save to users.json
    users.push(newUser);
    if (writeUsers(users)) {
      res.status(201).json({
        success: true,
        message: 'Account registered successfully! You can now log in.'
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not complete registration due to file storage issue.' });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during registration.' });
  }
});

// 2. User Login Route (/api/auth/login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required!' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Read existing users
    const users = readUsers();

    // Find the user
    const user = users.find(u => u.email === trimmedEmail);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password!' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password!' });
    }

    // Sign JWT Token (lasts for 7 days)
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return Token and User Info
    res.status(200).json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during login.' });
  }
});

// 3. Delete Account Route (/api/auth/delete-account)
router.delete('/delete-account', (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required!' });
    }

    // Read existing users
    const users = readUsers();

    // Find the user to delete
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found!' });
    }

    // Remove user from array
    users.splice(userIndex, 1);

    // Also delete their tasks and notes
    const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');
    const NOTES_FILE = path.join(__dirname, '..', 'data', 'notes.json');

    // Delete user's tasks
    try {
      if (fs.existsSync(TASKS_FILE)) {
        const tasksData = fs.readFileSync(TASKS_FILE, 'utf8');
        let tasks = JSON.parse(tasksData || '[]');
        tasks = tasks.filter(task => task.userId !== userId);
        fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Error deleting user tasks:', err);
    }

    // Delete user's notes
    try {
      if (fs.existsSync(NOTES_FILE)) {
        const notesData = fs.readFileSync(NOTES_FILE, 'utf8');
        let notes = JSON.parse(notesData || '[]');
        notes = notes.filter(note => note.userId !== userId);
        fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Error deleting user notes:', err);
    }

    // Save updated users list
    if (writeUsers(users)) {
      res.status(200).json({
        success: true,
        message: 'Account and all associated data deleted successfully!'
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not complete account deletion.' });
    }

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error during account deletion.' });
  }
});

module.exports = router;
