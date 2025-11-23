const { pool } = require('../config/database');

// Middleware to check if user is an expert
const requireExpert = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user has expert role
    const [users] = await pool.execute(
      'SELECT user_type FROM users WHERE id = ? AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    
    if (user.user_type !== 'expert') {
      return res.status(403).json({
        success: false,
        message: 'Expert access required. Only registered experts can perform this action.'
      });
    }

    // User is verified expert, proceed
    next();
  } catch (error) {
    console.error('Expert middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

module.exports = {
  requireExpert
};
