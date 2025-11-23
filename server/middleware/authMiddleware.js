const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      try {
        // Check if user still exists and is active
        const [users] = await pool.execute(
          'SELECT id, is_active, user_type FROM users WHERE id = ?',
          [decoded.userId]
        );

        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        const user = users[0];
        if (!user.is_active) {
          return res.status(401).json({
            success: false,
            message: 'Account has been deactivated'
          });
        }

        req.userId = decoded.userId;
        req.userType = user.user_type;
        next();
      } catch (dbError) {
        console.error('❌ Auth middleware database error:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = { authenticateToken };
