const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  getCourseAnalytics,
  getExpertCourses,
  enrollInCourse,
  getUserEnrollments,
  getMyCourses,
  uploadCourseContent,
  getInstructorCourses,
  getCourseSessions
} = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireExpert, requireStudent } = require('../middleware/roleMiddleware');
const { parseJSONFields, validateCourseCreation, validateCourseUpdate } = require('../middleware/courseValidation');
const { handleUpload, handleContentUpload } = require('../middleware/upload');

// Get all published courses (public)
router.get('/', getCourses);

// Get expert's own courses (including drafts)
router.get('/my-courses', authenticateToken, requireExpert, getMyCourses);

// Get expert's own courses (alias)
router.get('/expert/my-courses', authenticateToken, requireExpert, getExpertCourses);

// Get user's enrollments
router.get('/student/my-enrollments', authenticateToken, getUserEnrollments);

// Get single course by ID (public for published courses)
router.get('/:courseId', getCourseById);

// Create a new course (Expert only)
router.post('/', authenticateToken, requireExpert, handleUpload, parseJSONFields, validateCourseCreation, createCourse);

// Update course (Expert only - own courses)
router.put('/:id', authenticateToken, requireExpert, handleUpload, parseJSONFields, validateCourseUpdate, updateCourse);

// Delete course (Expert only - own courses)
router.delete('/:id', authenticateToken, requireExpert, deleteCourse);

// Publish course (Expert only - own courses)
router.patch('/:id/publish', authenticateToken, requireExpert, publishCourse);

// Unpublish course (Expert only - own courses)
router.patch('/:id/unpublish', authenticateToken, requireExpert, unpublishCourse);

// Get course analytics (Expert only - own courses)
router.get('/:id/analytics', authenticateToken, requireExpert, getCourseAnalytics);

// Enroll in a course (Any authenticated user)
router.post('/:courseId/enroll', authenticateToken, enrollInCourse);

// Upload content for a course (Expert only - own courses)
router.post('/upload-content', authenticateToken, requireExpert, handleContentUpload, uploadCourseContent);

// Get instructor's courses for session management
router.get('/instructor/my-courses', authenticateToken, requireExpert, getInstructorCourses);

// Get sessions for a specific course
router.get('/:courseId/sessions', authenticateToken, getCourseSessions);

module.exports = router;
