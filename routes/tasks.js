/**
 * Tasks API Router
 * /api/tasks
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const TASKS_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

// Helper to read tasks
const readTasks = () => {
  try {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
};

// Helper to write tasks
const writeTasks = (tasks) => {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing tasks file:', error);
    return false;
  }
};

// Apply Authentication Middleware to all task routes
router.use(auth);

// 1. GET /api/tasks - Retrieve user tasks
router.get('/', (req, res) => {
  try {
    const allTasks = readTasks();
    // Filter tasks belonging only to the authenticated user
    const userTasks = allTasks.filter(task => task.userId === req.userId);
    
    res.status(200).json({
      success: true,
      tasks: userTasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
});

// 2. POST /api/tasks - Create a new task
router.post('/', (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Task title is required!' });
    }

    const allTasks = readTasks();
    const newTask = {
      id: Date.now().toString(),
      userId: req.userId,
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'Medium', // High, Medium, Low
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString()
    };

    allTasks.push(newTask);
    
    if (writeTasks(allTasks)) {
      res.status(201).json({
        success: true,
        message: 'Task added successfully!',
        task: newTask
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not save the task due to disk writing error.' });
    }
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
});

// 3. PUT /api/tasks/:id - Update an existing task
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, completed } = req.body;

    const allTasks = readTasks();
    
    // Find the task and verify ownership
    const taskIndex = allTasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: 'Task not found!' });
    }

    if (allTasks[taskIndex].userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not own this task!' });
    }

    // Update fields
    const taskToUpdate = allTasks[taskIndex];
    if (title !== undefined) taskToUpdate.title = title.trim();
    if (description !== undefined) taskToUpdate.description = description.trim();
    if (priority !== undefined) taskToUpdate.priority = priority;
    if (dueDate !== undefined) taskToUpdate.dueDate = dueDate || null;
    if (completed !== undefined) taskToUpdate.completed = !!completed;

    allTasks[taskIndex] = taskToUpdate;

    if (writeTasks(allTasks)) {
      res.status(200).json({
        success: true,
        message: 'Task updated successfully!',
        task: taskToUpdate
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not write task updates to disk.' });
    }
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
});

// 4. DELETE /api/tasks/:id - Delete a task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allTasks = readTasks();

    const taskIndex = allTasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: 'Task not found!' });
    }

    if (allTasks[taskIndex].userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Access Denied: You do not own this task!' });
    }

    // Remove task
    allTasks.splice(taskIndex, 1);

    if (writeTasks(allTasks)) {
      res.status(200).json({
        success: true,
        message: 'Task deleted successfully!'
      });
    } else {
      res.status(500).json({ success: false, message: 'Could not delete task due to file writing error.' });
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
});

module.exports = router;
