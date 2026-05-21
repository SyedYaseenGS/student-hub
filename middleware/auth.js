/**
 * JWT Authentication Middleware
 * Validates request authorization header and injects userId into request
 */

const jwt = require('jsonwebtoken');

// Simple JWT secret key (should be an environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_student_manager_key_2026';

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Extract token from "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No authentication token provided!'
    });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.userId = verified.id; // Assign decoded user id to request
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Access Denied: Invalid or expired authentication token!'
    });
  }
};
