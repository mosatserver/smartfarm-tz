const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { pool } = require('../config/database');
require('dotenv').config();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// User Registration
const registerUser = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      userType,
      mobileNumber,
      password
    } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      console.log(`⚠️ Registration attempt with existing email: ${email}`);
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password with high salt rounds for security
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user into database
    const [result] = await pool.execute(
      `INSERT INTO users 
       (first_name, last_name, email, user_type, mobile_number, password_hash) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email.toLowerCase(), userType, mobileNumber, passwordHash]
    );

    // Generate JWT token
    const token = generateToken(result.insertId);

    // Log successful registration
    console.log(`✅ New user registered: ${email} (${userType})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.insertId,
        firstName,
        lastName,
        email: email.toLowerCase(),
        userType,
        token
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

// User Login
const loginUser = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user in database
    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, user_type, 
              password_hash, is_active, email_verified 
       FROM users 
       WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login timestamp
    await pool.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(user.id);

    // Log successful login
    console.log(`✅ User logged in: ${user.email} (${user.user_type})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        userType: user.user_type,
        emailVerified: user.email_verified,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// Get user profile (protected route)
const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId; // Set by auth middleware

    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, user_type, 
              mobile_number, is_active, email_verified, 
              created_at, last_login 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        userType: user.user_type,
        mobileNumber: user.mobile_number,
        emailVerified: user.email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile
};
