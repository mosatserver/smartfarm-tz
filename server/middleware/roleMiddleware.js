/**
 * Role-based access control middleware
 * Validates user roles and permissions for protected routes
 */

const { pool } = require('../config/database');

/**
 * Middleware to check if user has expert role
 */
const requireExpert = async (req, res, next) => {
  try {
    const userId = req.userId; // Set by auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user details from database
    const [users] = await pool.execute(
      'SELECT user_type FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = users[0];

    // Check if user is an expert
    if (user.user_type !== 'expert') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Expert privileges required.',
        userType: user.user_type,
        requiredRole: 'expert'
      });
    }

    // Add user type to request object for use in controllers
    req.userType = user.user_type;
    next();

  } catch (error) {
    console.error('Role middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role validation'
    });
  }
};

/**
 * Middleware to check if user has student role (non-expert)
 */
const requireStudent = async (req, res, next) => {
  try {
    const userId = req.userId; // Set by auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user details from database
    const [users] = await pool.execute(
      'SELECT user_type FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = users[0];

    // Check if user is a student (not an expert)
    if (user.user_type === 'expert') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This action is only available for students. As an expert, you can create and manage courses instead.',
        userType: user.user_type,
        allowedRoles: ['farmer', 'buyer', 'transporter', 'farm inputs seller']
      });
    }

    // Add user type to request object for use in controllers
    req.userType = user.user_type;
    next();

  } catch (error) {
    console.error('Role middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role validation'
    });
  }
};

/**
 * Middleware to check if user has any of the specified roles
 */
const requireRoles = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId; // Set by auth middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user details from database
      const [users] = await pool.execute(
        'SELECT user_type FROM users WHERE id = ? AND is_active = TRUE',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found or inactive'
        });
      }

      const user = users[0];

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.user_type)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          userType: user.user_type,
          allowedRoles: allowedRoles
        });
      }

      // Add user type to request object for use in controllers
      req.userType = user.user_type;
      next();

    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during role validation'
      });
    }
  };
};

/**
 * Helper function to check user role without middleware
 */
const getUserRole = async (userId) => {
  try {
    const [users] = await pool.execute(
      'SELECT user_type FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return null;
    }

    return users[0].user_type;
  } catch (error) {
    console.error('Get user role error:', error);
    return null;
  }
};

/**
 * Helper function to check if user is expert
 */
const isExpert = async (userId) => {
  const userType = await getUserRole(userId);
  return userType === 'expert';
};

/**
 * Helper function to check if user is student
 */
const isStudent = async (userId) => {
  const userType = await getUserRole(userId);
  return userType && userType !== 'expert';
};

module.exports = {
  requireExpert,
  requireStudent,
  requireRoles,
  getUserRole,
  isExpert,
  isStudent
};
