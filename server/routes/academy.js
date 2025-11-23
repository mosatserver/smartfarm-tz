const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireExpert } = require('../middleware/expertMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/academy');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'thumbnail') {
      // Accept only images for thumbnails
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnails'));
      }
    } else if (file.fieldname === 'video') {
      // Accept video files
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
      }
    } else if (file.fieldname === 'pdf') {
      // Accept PDF files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// GET /api/academy/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM academy_categories WHERE is_active = TRUE ORDER BY name'
    );

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// GET /api/academy/courses - Get all courses with filtering and search
router.get('/courses', async (req, res) => {
  try {
    const { 
      search = '', 
      category = '', 
      level = '', 
      is_free = '', 
      page = 1, 
      limit = 12,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    // Get user ID if authenticated (optional - won't fail if not authenticated)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // Token invalid or expired, continue without user ID
        console.log('Invalid token in courses request, continuing without user context');
      }
    }

    const offset = (page - 1) * limit;
    let whereConditions = ['c.status = "published"'];
    const queryParams = [];

    // Search functionality
    if (search) {
      whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.short_description LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (category && category !== 'all') {
      whereConditions.push('cat.name = ?');
      queryParams.push(category);
    }

    // Level filter
    if (level && level !== 'all') {
      whereConditions.push('c.level = ?');
      queryParams.push(level);
    }

    // Price filter
    if (is_free !== '') {
      whereConditions.push('c.is_free = ?');
      queryParams.push(is_free === 'true');
    }

    // Validate sort and order parameters
    const validSortColumns = ['created_at', 'title', 'rating', 'enrollment_count'];
    const validOrders = ['ASC', 'DESC'];
    const safeSortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const safeOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    // Build the complete query - include enrollment status if user is authenticated
    let baseQuery;
    if (userId) {
      baseQuery = `
        SELECT 
          c.*,
          CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
          u.email as instructor_email,
          cat.name as category_name,
          cat.icon as category_icon,
          CASE WHEN e.id IS NOT NULL THEN true ELSE false END as is_enrolled,
          CASE WHEN c.instructor_id = ? THEN true ELSE false END as is_instructor
        FROM academy_courses c
        JOIN users u ON c.instructor_id = u.id
        JOIN academy_categories cat ON c.category_id = cat.id
        LEFT JOIN academy_enrollments e ON c.id = e.course_id AND e.user_id = ? AND e.status = 'active'
        WHERE ` + whereConditions.join(' AND ') + `
        ORDER BY c.` + safeSortColumn + ` ` + safeOrder + `
        LIMIT ` + parseInt(limit) + ` OFFSET ` + parseInt(offset) + `
      `;
      queryParams.unshift(userId, userId); // Add userId at the beginning for the CASE statements
    } else {
      baseQuery = `
        SELECT 
          c.*,
          CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
          u.email as instructor_email,
          cat.name as category_name,
          cat.icon as category_icon,
          false as is_enrolled,
          false as is_instructor
        FROM academy_courses c
        JOIN users u ON c.instructor_id = u.id
        JOIN academy_categories cat ON c.category_id = cat.id
        WHERE ` + whereConditions.join(' AND ') + `
        ORDER BY c.` + safeSortColumn + ` ` + safeOrder + `
        LIMIT ` + parseInt(limit) + ` OFFSET ` + parseInt(offset) + `
      `;
    }

    const [courses] = await pool.execute(baseQuery, queryParams);

    // Build count query without template literals
    const countQuery = `
      SELECT COUNT(*) as total
      FROM academy_courses c
      JOIN users u ON c.instructor_id = u.id
      JOIN academy_categories cat ON c.category_id = cat.id
      WHERE ` + whereConditions.join(' AND ');
    
    // For count query, remove the userId parameters if they were added
    let countParams = queryParams;
    if (userId) {
      countParams = queryParams.slice(2); // Remove the first two userId parameters
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Format courses data
    const formattedCourses = courses.map(course => {
      let tags = [];
      try {
        tags = course.tags ? JSON.parse(course.tags) : [];
      } catch (e) {
        // If JSON parsing fails, treat tags as a simple string or empty array
        tags = course.tags ? [course.tags] : [];
      }
      
      // Determine enrollment status for UI
      let enrollmentStatus = 'available'; // default
      if (course.is_instructor) {
        enrollmentStatus = 'instructor';
      } else if (course.is_enrolled) {
        enrollmentStatus = 'enrolled';
      }
      
      return {
        ...course,
        tags,
        price: course.is_free ? 'Free' : `$${course.price}`,
        instructor: course.instructor_name,
        category: course.category_name,
        enrolled: course.enrollment_count,
        // New fields for frontend
        isEnrolled: course.is_enrolled,
        isInstructor: course.is_instructor,
        enrollmentStatus, // 'available', 'enrolled', 'instructor'
        canEnroll: !course.is_enrolled && !course.is_instructor
      };
    });

    console.log(`📚 Retrieved ${formattedCourses.length} courses for user ${userId || 'anonymous'}`);
    if (userId) {
      const enrolledCount = formattedCourses.filter(c => c.isEnrolled).length;
      const instructorCount = formattedCourses.filter(c => c.isInstructor).length;
      console.log(`   - Enrolled in: ${enrolledCount} courses`);
      console.log(`   - Instructor of: ${instructorCount} courses`);
    }

    res.json({
      success: true,
      data: {
        courses: formattedCourses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCourses: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        },
        userContext: userId ? {
          authenticated: true,
          userId: userId
        } : {
          authenticated: false
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// GET /api/academy/courses/:id - Get single course details
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get user ID if authenticated (optional)
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (error) {
        // Token invalid or expired, continue without user ID
        console.log('Invalid token in course details request, continuing without user context');
      }
    }

    // Get course details with enrollment status if user is authenticated
    let courseQuery;
    let queryParams = [id];
    
    if (userId) {
      courseQuery = `
        SELECT 
          c.*,
          CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
          u.email as instructor_email,
          cat.name as category_name,
          cat.icon as category_icon,
          CASE WHEN e.id IS NOT NULL THEN true ELSE false END as is_enrolled,
          CASE WHEN c.instructor_id = ? THEN true ELSE false END as is_instructor
        FROM academy_courses c
        JOIN users u ON c.instructor_id = u.id
        JOIN academy_categories cat ON c.category_id = cat.id
        LEFT JOIN academy_enrollments e ON c.id = e.course_id AND e.user_id = ? AND e.status = 'active'
        WHERE c.id = ? AND c.status = 'published'
      `;
      queryParams = [userId, userId, id];
    } else {
      courseQuery = `
        SELECT 
          c.*,
          CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
          u.email as instructor_email,
          cat.name as category_name,
          cat.icon as category_icon,
          false as is_enrolled,
          false as is_instructor
        FROM academy_courses c
        JOIN users u ON c.instructor_id = u.id
        JOIN academy_categories cat ON c.category_id = cat.id
        WHERE c.id = ? AND c.status = 'published'
      `;
    }

    const [courses] = await pool.execute(courseQuery, queryParams);

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const course = courses[0];

    // Get course lessons
    const [lessons] = await pool.execute(`
      SELECT id, title, slug, description, lesson_order, duration_minutes, 
             lesson_type, is_preview, is_active
      FROM academy_lessons
      WHERE course_id = ? AND is_active = TRUE
      ORDER BY lesson_order
    `, [id]);

    // Get course ratings
    const [ratings] = await pool.execute(`
      SELECT 
        r.*,
        CONCAT(u.first_name, ' ', u.last_name) as reviewer_name
      FROM academy_course_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = ? AND r.is_public = TRUE
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);

    // Get course content count if user is enrolled or instructor
    let contentCount = 0;
    if (userId && (course.is_enrolled || course.is_instructor)) {
      const [contentResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM course_content WHERE course_id = ? AND upload_status = "completed"',
        [id]
      );
      contentCount = contentResult[0].count;
    }

    let tags = [];
    try {
      tags = course.tags ? JSON.parse(course.tags) : [];
    } catch (e) {
      tags = course.tags ? [course.tags] : [];
    }

    // Determine enrollment status for UI
    let enrollmentStatus = 'available'; // default
    if (course.is_instructor) {
      enrollmentStatus = 'instructor';
    } else if (course.is_enrolled) {
      enrollmentStatus = 'enrolled';
    }

    const formattedCourse = {
      ...course,
      tags,
      price: course.is_free ? 'Free' : `$${course.price}`,
      instructor: course.instructor_name,
      category: course.category_name,
      enrolled: course.enrollment_count,
      lessons: lessons,
      reviews: ratings,
      // New fields for frontend
      isEnrolled: course.is_enrolled,
      isInstructor: course.is_instructor,
      enrollmentStatus, // 'available', 'enrolled', 'instructor'
      canEnroll: !course.is_enrolled && !course.is_instructor,
      contentCount, // Number of content items available
      hasContent: contentCount > 0,
      userContext: userId ? {
        authenticated: true,
        userId: userId
      } : {
        authenticated: false
      }
    };

    console.log(`📖 Retrieved course details for "${course.title}" - User: ${userId || 'anonymous'} - Status: ${enrollmentStatus}`);

    res.json({
      success: true,
      data: formattedCourse
    });
  } catch (error) {
    console.error('Get course details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course details'
    });
  }
});

// POST /api/academy/courses/:id/enroll - Enroll in a course
router.post('/courses/:id/enroll', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if course exists and is published
    const [courses] = await pool.execute(
      'SELECT * FROM academy_courses WHERE id = ? AND status = "published"',
      [id]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available'
      });
    }

    // Check if user is already enrolled
    const [existing] = await pool.execute(
      'SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?',
      [userId, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Create enrollment
    await pool.execute(
      'INSERT INTO academy_enrollments (user_id, course_id) VALUES (?, ?)',
      [userId, id]
    );

    // Update course enrollment count
    await pool.execute(
      'UPDATE academy_courses SET enrollment_count = enrollment_count + 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    console.error('Course enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    });
  }
});

// GET /api/academy/my-courses - Get user's enrolled courses
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [enrollments] = await pool.execute(`
      SELECT 
        e.*,
        c.title,
        c.slug,
        c.description,
        c.short_description,
        c.thumbnail_url,
        c.total_lessons,
        c.level,
        c.is_free,
        c.price,
        c.rating,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        cat.name as category_name
      FROM academy_enrollments e
      JOIN academy_courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN academy_categories cat ON c.category_id = cat.id
      WHERE e.user_id = ?
      ORDER BY e.last_accessed DESC
    `, [userId]);

    const formattedEnrollments = enrollments.map(enrollment => ({
      id: enrollment.course_id,
      title: enrollment.title,
      slug: enrollment.slug,
      description: enrollment.description,
      short_description: enrollment.short_description,
      thumbnail_url: enrollment.thumbnail_url,
      instructor: enrollment.instructor_name,
      category: enrollment.category_name,
      level: enrollment.level,
      price: enrollment.is_free ? 'Free' : `$${enrollment.price}`,
      rating: enrollment.rating,
      lessons: enrollment.total_lessons,
      progress: enrollment.progress_percentage,
      isCompleted: enrollment.is_completed,
      enrollmentDate: enrollment.enrollment_date,
      lastAccessed: enrollment.last_accessed,
      totalTimeSpent: enrollment.total_time_spent
    }));

    res.json({
      success: true,
      data: formattedEnrollments
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled courses'
    });
  }
});

// GET /api/academy/progress - Get user's learning progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get overall statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN is_completed = TRUE THEN 1 ELSE 0 END) as completed_courses,
        SUM(total_time_spent) as total_hours_learned,
        SUM(CASE WHEN certificate_issued = TRUE THEN 1 ELSE 0 END) as certificates
      FROM academy_enrollments 
      WHERE user_id = ?
    `, [userId]);

    // Calculate current streak (simplified - consecutive days with activity)
    const [streakResult] = await pool.execute(`
      SELECT COUNT(DISTINCT DATE(last_accessed)) as streak_days
      FROM academy_enrollments
      WHERE user_id = ? AND last_accessed >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [userId]);

    const progressData = {
      coursesCompleted: stats[0].completed_courses || 0,
      totalHoursLearned: Math.round((stats[0].total_hours_learned || 0) / 60), // Convert minutes to hours
      certificates: stats[0].certificates || 0,
      currentStreak: Math.min(streakResult[0].streak_days || 0, 30), // Cap at 30 days
      totalEnrollments: stats[0].total_enrollments || 0
    };

    res.json({
      success: true,
      data: progressData
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning progress'
    });
  }
});

// GET /api/academy/live-sessions - Get live sessions
router.get('/live-sessions', async (req, res) => {
  try {
    const { status = 'scheduled', limit = 10 } = req.query;

    const [sessions] = await pool.execute(`
      SELECT 
        s.*,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        c.title as course_title
      FROM academy_live_sessions s
      JOIN users u ON s.instructor_id = u.id
      LEFT JOIN academy_courses c ON s.course_id = c.id
      WHERE s.status = ?
      ORDER BY s.session_date ASC
      LIMIT ` + parseInt(limit) + `
    `, [status]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      instructor: session.instructor_name,
      courseTitle: session.course_title,
      date: session.session_date.toISOString().split('T')[0],
      time: session.session_date.toTimeString().split(' ')[0].substring(0, 5),
      duration: `${session.duration_minutes} minutes`,
      participants: session.current_participants,
      maxParticipants: session.max_participants,
      meetingUrl: session.meeting_url,
      status: session.status
    }));

    res.json({
      success: true,
      data: formattedSessions
    });
  } catch (error) {
    console.error('Get live sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live sessions'
    });
  }
});

// POST /api/academy/live-sessions/:id/join - Join a live session
router.post('/live-sessions/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if session exists and is available
    const [sessions] = await pool.execute(`
      SELECT * FROM academy_live_sessions 
      WHERE id = ? AND status IN ('scheduled', 'live') AND current_participants < max_participants
    `, [id]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or not available'
      });
    }

    const session = sessions[0];

    // Check if user is already registered
    const [existing] = await pool.execute(
      'SELECT id FROM academy_live_session_participants WHERE session_id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Already registered for this session',
        meetingUrl: session.meeting_url
      });
    }

    // Add user to session participants
    await pool.execute(
      'INSERT INTO academy_live_session_participants (session_id, user_id) VALUES (?, ?)',
      [id, userId]
    );

    // Update participant count
    await pool.execute(
      'UPDATE academy_live_sessions SET current_participants = current_participants + 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Successfully joined live session',
      meetingUrl: session.meeting_url
    });
  } catch (error) {
    console.error('Join live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join live session'
    });
  }
});

// POST /api/academy/live-sessions - Create a new live session (experts only)
router.post('/live-sessions', authenticateToken, requireExpert, async (req, res) => {
  try {
    const instructorId = req.userId;
    const {
      title,
      description,
      sessionDate,
      durationMinutes = 60,
      maxParticipants = 100,
      courseId = null,
      meetingUrl,
      meetingId,
      meetingPassword
    } = req.body;

    // Validate required fields
    if (!title || !description || !sessionDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and session date are required'
      });
    }

    // Validate session date is in the future
    const sessionDateTime = new Date(sessionDate);
    if (sessionDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Session date must be in the future'
      });
    }

    // If courseId is provided, verify it exists and belongs to the instructor
    if (courseId) {
      const [courses] = await pool.execute(
        'SELECT id FROM academy_courses WHERE id = ? AND instructor_id = ? AND status = "published"',
        [courseId, instructorId]
      );
      
      if (courses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or you do not have permission to create sessions for this course'
        });
      }
    }

    // Create the live session
    const [result] = await pool.execute(`
      INSERT INTO academy_live_sessions (
        course_id, instructor_id, title, description, session_date,
        duration_minutes, max_participants, meeting_url, meeting_id, meeting_password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      courseId, instructorId, title, description, sessionDateTime,
      durationMinutes, maxParticipants, meetingUrl, meetingId, meetingPassword
    ]);

    res.status(201).json({
      success: true,
      message: 'Live session created successfully',
      data: {
        sessionId: result.insertId,
        title,
        description,
        sessionDate: sessionDateTime.toISOString(),
        durationMinutes,
        maxParticipants
      }
    });
  } catch (error) {
    console.error('Create live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create live session'
    });
  }
});

// PUT /api/academy/live-sessions/:id - Update a live session (experts only)
router.put('/live-sessions/:id', authenticateToken, requireExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.userId;
    const {
      title,
      description,
      sessionDate,
      durationMinutes,
      maxParticipants,
      meetingUrl,
      meetingId,
      meetingPassword,
      status
    } = req.body;

    // Check if session exists and belongs to the instructor
    const [sessions] = await pool.execute(
      'SELECT id, status FROM academy_live_sessions WHERE id = ? AND instructor_id = ?',
      [id, instructorId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found or you do not have permission to update it'
      });
    }

    const session = sessions[0];
    
    // Don't allow updates to completed or cancelled sessions
    if (session.status === 'completed' || session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled sessions'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (sessionDate !== undefined) {
      const sessionDateTime = new Date(sessionDate);
      if (sessionDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Session date must be in the future'
        });
      }
      updateFields.push('session_date = ?');
      updateValues.push(sessionDateTime);
    }
    if (durationMinutes !== undefined) {
      updateFields.push('duration_minutes = ?');
      updateValues.push(durationMinutes);
    }
    if (maxParticipants !== undefined) {
      updateFields.push('max_participants = ?');
      updateValues.push(maxParticipants);
    }
    if (meetingUrl !== undefined) {
      updateFields.push('meeting_url = ?');
      updateValues.push(meetingUrl);
    }
    if (meetingId !== undefined) {
      updateFields.push('meeting_id = ?');
      updateValues.push(meetingId);
    }
    if (meetingPassword !== undefined) {
      updateFields.push('meeting_password = ?');
      updateValues.push(meetingPassword);
    }
    if (status !== undefined && ['scheduled', 'live', 'completed', 'cancelled'].includes(status)) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Execute update
    await pool.execute(
      `UPDATE academy_live_sessions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Live session updated successfully'
    });
  } catch (error) {
    console.error('Update live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update live session'
    });
  }
});

// DELETE /api/academy/live-sessions/:id - Delete a live session (experts only)
router.delete('/live-sessions/:id', authenticateToken, requireExpert, async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.userId;

    // Check if session exists and belongs to the instructor
    const [sessions] = await pool.execute(
      'SELECT id, status, current_participants FROM academy_live_sessions WHERE id = ? AND instructor_id = ?',
      [id, instructorId]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Live session not found or you do not have permission to delete it'
      });
    }

    const session = sessions[0];
    
    // Don't allow deletion of live sessions
    if (session.status === 'live') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a live session that is currently in progress'
      });
    }

    // If session has participants, cancel instead of delete
    if (session.current_participants > 0) {
      await pool.execute(
        'UPDATE academy_live_sessions SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      return res.json({
        success: true,
        message: 'Live session cancelled due to existing participants'
      });
    }

    // Delete the session
    await pool.execute('DELETE FROM academy_live_sessions WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Live session deleted successfully'
    });
  } catch (error) {
    console.error('Delete live session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete live session'
    });
  }
});

// GET /api/academy/my-sessions - Get instructor's live sessions (experts only)
router.get('/my-sessions', authenticateToken, requireExpert, async (req, res) => {
  try {
    const instructorId = req.userId;
    const { status = 'all', limit = 20, page = 1 } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['s.instructor_id = ?'];
    const queryParams = [instructorId];

    if (status !== 'all') {
      whereConditions.push('s.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    const [sessions] = await pool.execute(`
      SELECT 
        s.*,
        c.title as course_title
      FROM academy_live_sessions s
      LEFT JOIN academy_courses c ON s.course_id = c.id
      WHERE ${whereClause}
      ORDER BY s.session_date ASC
      LIMIT ` + parseInt(limit) + ` OFFSET ` + parseInt(offset) + `
    `, queryParams);

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM academy_live_sessions s
      WHERE ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      courseTitle: session.course_title,
      sessionDate: session.session_date,
      durationMinutes: session.duration_minutes,
      maxParticipants: session.max_participants,
      currentParticipants: session.current_participants,
      meetingUrl: session.meeting_url,
      status: session.status,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalSessions: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get instructor sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your live sessions'
    });
  }
});

// POST /api/academy/courses/:id/bookmark - Bookmark/unbookmark a course
router.post('/courses/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Check if already bookmarked
    const [existing] = await pool.execute(
      'SELECT id FROM academy_course_bookmarks WHERE user_id = ? AND course_id = ?',
      [userId, id]
    );

    if (existing.length > 0) {
      // Remove bookmark
      await pool.execute(
        'DELETE FROM academy_course_bookmarks WHERE user_id = ? AND course_id = ?',
        [userId, id]
      );
      
      res.json({
        success: true,
        message: 'Course removed from bookmarks',
        bookmarked: false
      });
    } else {
      // Add bookmark
      await pool.execute(
        'INSERT INTO academy_course_bookmarks (user_id, course_id) VALUES (?, ?)',
        [userId, id]
      );
      
      res.json({
        success: true,
        message: 'Course bookmarked successfully',
        bookmarked: true
      });
    }
  } catch (error) {
    console.error('Bookmark course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bookmark course'
    });
  }
});

// GET /api/academy/bookmarks - Get user's bookmarked courses
router.get('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [bookmarks] = await pool.execute(`
      SELECT 
        c.*,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        cat.name as category_name,
        b.created_at as bookmarked_at
      FROM academy_course_bookmarks b
      JOIN academy_courses c ON b.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      JOIN academy_categories cat ON c.category_id = cat.id
      WHERE b.user_id = ? AND c.status = 'published'
      ORDER BY b.created_at DESC
    `, [userId]);

    const formattedBookmarks = bookmarks.map(course => {
      let tags = [];
      try {
        tags = course.tags ? JSON.parse(course.tags) : [];
      } catch (e) {
        tags = course.tags ? [course.tags] : [];
      }
      
      return {
        ...course,
        tags,
        price: course.is_free ? 'Free' : `$${course.price}`,
        instructor: course.instructor_name,
        category: course.category_name,
        enrolled: course.enrollment_count
      };
    });

    res.json({
      success: true,
      data: formattedBookmarks
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookmarks'
    });
  }
});

// Import course controller functions for content access
const { getCourseContent, getContentItem, getMyEnrolledCourses } = require('../controllers/courseController');

// GET /api/academy/my-enrolled-courses - Get user's enrolled courses
router.get('/my-enrolled-courses', authenticateToken, getMyEnrolledCourses);

// GET /api/academy/courses/:courseId/content - Get course content (enrolled students only)
router.get('/courses/:courseId/content', authenticateToken, getCourseContent);

// GET /api/academy/courses/:courseId/content/:contentId - Get specific content item
router.get('/courses/:courseId/content/:contentId', authenticateToken, getContentItem);

// POST /api/academy/courses/:courseId/content/:contentId/complete - Mark content as completed
router.post('/courses/:courseId/content/:contentId/complete', authenticateToken, async (req, res) => {
  try {
    const { courseId, contentId } = req.params;
    const userId = req.userId;

    // Verify user is enrolled in the course
    const [enrollment] = await pool.execute(
      'SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
      [userId, courseId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to mark content as completed'
      });
    }

    // Verify content exists for this course
    const [content] = await pool.execute(
      'SELECT id FROM course_content WHERE id = ? AND course_id = ?',
      [contentId, courseId]
    );

    if (content.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Create or update content progress
    await pool.execute(`
      INSERT INTO content_progress (user_id, course_id, content_id, completed, completed_at, created_at, updated_at)
      VALUES (?, ?, ?, TRUE, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        completed = TRUE, 
        completed_at = NOW(), 
        updated_at = NOW()
    `, [userId, courseId, contentId]).catch(err => {
      // If content_progress table doesn't exist, just return success
      console.log('Content progress tracking not available, skipping...');
    });

    // Update enrollment progress
    const [totalContent] = await pool.execute(
      'SELECT COUNT(*) as total FROM course_content WHERE course_id = ? AND upload_status = "completed"',
      [courseId]
    );

    const [completedContent] = await pool.execute(`
      SELECT COUNT(*) as completed FROM content_progress 
      WHERE user_id = ? AND course_id = ? AND completed = TRUE
    `, [userId, courseId]).catch(() => [[{ completed: 0 }]]);

    const progressPercentage = totalContent[0].total > 0 
      ? Math.round(((completedContent[0]?.completed || 0) / totalContent[0].total) * 100)
      : 0;

    // Update enrollment progress
    await pool.execute(
      'UPDATE academy_enrollments SET progress_percentage = ?, last_accessed = NOW() WHERE user_id = ? AND course_id = ?',
      [progressPercentage, userId, courseId]
    );

    res.json({
      success: true,
      message: 'Content marked as completed',
      data: {
        contentId,
        completed: true,
        completedAt: new Date().toISOString(),
        progress: progressPercentage
      }
    });
  } catch (error) {
    console.error('Mark content completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark content as completed'
    });
  }
});

// POST /api/academy/courses/:courseId/enroll - Enroll in a course
const { enrollInCourse } = require('../controllers/courseController');
router.post('/courses/:courseId/enroll', authenticateToken, enrollInCourse);

module.exports = router;
