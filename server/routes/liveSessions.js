const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  bookSession,
  startSession,
  endSession,
  getExpertSessions,
  getStudentSessions
} = require('../controllers/liveSessionsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireExpert, requireStudent } = require('../middleware/roleMiddleware');

// Create a new session (Expert only)
router.post('/', authenticateToken, requireExpert, createSession);

// Get all available sessions (with filters)
router.get('/', getSessions);

// Get single session by ID
router.get('/:sessionId', authenticateToken, getSessionById);

// Book a session (Any authenticated user)
router.post('/:sessionId/book', authenticateToken, bookSession);

// Join a session (alias for book - used by frontend)
router.post('/:sessionId/join', authenticateToken, bookSession);

// Start a session (Expert only)
router.patch('/:sessionId/start', authenticateToken, requireExpert, startSession);

// End a session (Expert only)
router.patch('/:sessionId/end', authenticateToken, requireExpert, endSession);

// Get expert's own sessions
router.get('/expert/my-sessions', authenticateToken, requireExpert, getExpertSessions);

// Get student's booked sessions
router.get('/student/my-bookings', authenticateToken, getStudentSessions);

module.exports = router;
