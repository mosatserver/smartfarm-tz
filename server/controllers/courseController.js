const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { uploadsDir } = require('../middleware/upload');

/**
 * Secure query wrapper that works like pool.execute() but with pool.query()
 * Ensures all parameters are properly validated and escaped
 */
const secureQuery = async (query, params = []) => {
  // Validate that all parameters are safe types
  const safeParams = params.map(param => {
    if (param === null || param === undefined) {
      return param;
    }
    if (typeof param === 'string') {
      // Ensure string is properly escaped by mysql2
      return param;
    }
    if (typeof param === 'number') {
      // Ensure it's a valid number
      if (isNaN(param) || !isFinite(param)) {
        throw new Error('Invalid number parameter');
      }
      return param;
    }
    if (typeof param === 'boolean') {
      return param;
    }
    // For other types, convert to string safely
    return String(param);
  });
  
  // Use pool.query which still provides parameter escaping
  return await pool.query(query, safeParams);
};

/**
 * Create a new course (Expert only)
 */
const createCourse = async (req, res) => {
  try {
    console.log('🎯 Course creation started');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 User ID:', req.userId);
    console.log('🏷️ User Type:', req.userType);
    console.log('📸 File upload:', req.file ? req.file.filename : 'No file uploaded');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      category,
      level = 'beginner',
      duration_weeks,
      price = 'Free',
      tags = [],
      prerequisites = '',
      learning_objectives = []
    } = req.body;

    // Handle thumbnail image if uploaded
    let thumbnailUrl = null;
    if (req.file) {
      thumbnailUrl = `/uploads/courses/${req.file.filename}`;
      console.log('📸 Thumbnail URL:', thumbnailUrl);
    }

    const instructorId = req.userId; // From auth middleware
    
    // Get instructor name for the course
    const [instructor] = await pool.execute(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [instructorId]
    );

    if (instructor.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Instructor not found'
      });
    }

    const instructorName = `${instructor[0].first_name} ${instructor[0].last_name}`;

    // Generate course slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    // Check if slug already exists
    const [existingCourse] = await pool.execute(
      'SELECT id FROM academy_courses WHERE slug = ?',
      [slug]
    );

    if (existingCourse.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A course with similar title already exists'
      });
    }

    // Get category ID from category name or create a default one
    let categoryId = 1; // Default category
    const [categoryResult] = await pool.execute(
      'SELECT id FROM academy_categories WHERE name = ? AND is_active = TRUE',
      [category]
    );

    if (categoryResult.length > 0) {
      categoryId = categoryResult[0].id;
    } else {
      // Try to create or find a similar category
      console.log(`Category "${category}" not found, using default category`);
    }
    
    // Determine if course is free
    const isFree = price === 'Free' || price === '' || parseFloat(price) === 0;
    const coursePrice = isFree ? 0.00 : parseFloat(price.replace('$', ''));

    // Insert course into database
    const [result] = await pool.execute(`
      INSERT INTO academy_courses (
        title, slug, description, instructor_id, category_id, level, duration_weeks, 
        price, is_free, tags, requirements, what_you_learn, status, thumbnail_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `, [
      title, slug, description, instructorId, categoryId, level, duration_weeks,
      coursePrice, isFree, JSON.stringify(tags), prerequisites, 
      JSON.stringify(learning_objectives), thumbnailUrl
    ]);

    // Get the created course
    const [newCourse] = await pool.execute(
      'SELECT c.*, cat.name as category_name FROM academy_courses c LEFT JOIN academy_categories cat ON c.category_id = cat.id WHERE c.id = ?',
      [result.insertId]
    );

    console.log(`✅ New course created: "${title}" by ${instructorName}`);
    console.log('🔍 Course data from DB:', newCourse[0]);
    console.log('🔍 Tags value:', newCourse[0].tags);
    console.log('🔍 What you learn value:', newCourse[0].what_you_learn);

    // Helper function to safely parse JSON or return array if already parsed
    const safeJSONParse = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      }
      return [];
    };

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        id: result.insertId,
        ...newCourse[0],
        tags: safeJSONParse(newCourse[0].tags),
        learning_objectives: safeJSONParse(newCourse[0].what_you_learn)
      }
    });

  } catch (error) {
    console.error('❌ Course creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during course creation'
    });
  }
};

/**
 * Get all courses created by the expert
 */
const getMyCourses = async (req, res) => {
  try {
    const instructorId = req.userId;
    
    const [courses] = await pool.execute(`
      SELECT 
        c.*,
        cat.name as category_name,
        COUNT(DISTINCT e.user_id) as enrolled_count,
        COUNT(DISTINCT l.id) as lessons_count
      FROM academy_courses c
      LEFT JOIN academy_categories cat ON c.category_id = cat.id
      LEFT JOIN academy_enrollments e ON c.id = e.course_id
      LEFT JOIN academy_lessons l ON c.id = l.course_id
      WHERE c.instructor_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [instructorId]);

    // Helper function to safely parse JSON or return array if already parsed
    const safeJSONParse = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.log('Failed to parse JSON:', value, 'Error:', e.message);
          return [];
        }
      }
      return [];
    };

    // Parse JSON fields
    const formattedCourses = courses.map(course => ({
      ...course,
      tags: safeJSONParse(course.tags),
      learning_objectives: safeJSONParse(course.what_you_learn),
      enrolled_count: parseInt(course.enrolled_count || 0),
      lessons_count: parseInt(course.lessons_count || 0),
      // Add additional fields for UI to handle draft courses
      can_publish: course.status === 'draft',
      can_edit: true,
      is_draft: course.status === 'draft',
      thumbnail_url: course.thumbnail_url || '/images/default-course.jpg'
    }));

    res.status(200).json({
      success: true,
      data: formattedCourses,
      count: formattedCourses.length
    });

  } catch (error) {
    console.error('❌ Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
};

/**
 * Update a course (Expert only - own courses)
 */
const updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const instructorId = req.userId;
    
    console.log('🔄 Course update started');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📸 File upload:', req.file ? req.file.filename : 'No file uploaded');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Verify course ownership
    const [existingCourse] = await pool.execute(
      'SELECT id, instructor_id FROM academy_courses WHERE id = ?',
      [courseId]
    );

    if (existingCourse.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (existingCourse[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own courses.'
      });
    }

    const {
      title,
      description,
      category,
      level,
      duration_weeks,
      price,
      tags,
      prerequisites,
      learning_objectives,
      status
    } = req.body;
    
    // Get category ID from category name if category is provided
    let categoryId = null;
    if (category) {
      const [categoryResult] = await pool.execute(
        'SELECT id FROM academy_categories WHERE name = ? AND is_active = TRUE',
        [category]
      );
      
      if (categoryResult.length > 0) {
        categoryId = categoryResult[0].id;
      } else {
        console.log(`Category "${category}" not found, keeping existing category`);
        categoryId = null; // Will use COALESCE to keep existing value
      }
    }
    
    // Handle thumbnail image if uploaded
    let thumbnailUrl = null;
    if (req.file) {
      thumbnailUrl = `/uploads/courses/${req.file.filename}`;
      console.log('📸 New thumbnail URL:', thumbnailUrl);
      
      // Delete old thumbnail if exists
      const [oldCourse] = await pool.execute(
        'SELECT thumbnail_url FROM academy_courses WHERE id = ?',
        [courseId]
      );
      
      if (oldCourse.length > 0 && oldCourse[0].thumbnail_url) {
        const oldPath = path.join(__dirname, '..', oldCourse[0].thumbnail_url);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
            console.log('🗑️ Old thumbnail deleted:', oldCourse[0].thumbnail_url);
          } catch (err) {
            console.error('Error deleting old thumbnail:', err);
          }
        }
      }
    }

    // Prepare update query
    let updateQuery = `
      UPDATE academy_courses SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        level = COALESCE(?, level),
        duration_weeks = COALESCE(?, duration_weeks),
        price = COALESCE(?, price),
        requirements = COALESCE(?, requirements),
        tags = COALESCE(?, tags),
        what_you_learn = COALESCE(?, what_you_learn),
        status = COALESCE(?, status),
        updated_at = NOW()
    `;
    
    let params = [
      title, description, categoryId, level, duration_weeks, price,
      prerequisites, 
      tags ? JSON.stringify(tags) : null,
      learning_objectives ? JSON.stringify(learning_objectives) : null,
      status || null  // Default to null if status is undefined
    ];
    
    // Debug: Log each parameter
    console.log('🔍 Debug parameters before query:');
    console.log('  title:', title, typeof title);
    console.log('  description:', description, typeof description);
    console.log('  categoryId:', categoryId, typeof categoryId);
    console.log('  level:', level, typeof level);
    console.log('  duration_weeks:', duration_weeks, typeof duration_weeks);
    console.log('  price:', price, typeof price);
    console.log('  prerequisites:', prerequisites, typeof prerequisites);
    console.log('  tags JSON:', tags ? JSON.stringify(tags) : null);
    console.log('  learning_objectives JSON:', learning_objectives ? JSON.stringify(learning_objectives) : null);
    console.log('  status:', status, typeof status);
    console.log('  params array:', params);
    console.log('  undefined params:', params.map((p, i) => p === undefined ? `Index ${i}: undefined` : null).filter(Boolean));
    
    // Add thumbnail_url if a new image was uploaded
    if (req.file) {
      updateQuery += `, thumbnail_url = ?`;
      params.push(thumbnailUrl);
      console.log('  Added thumbnailUrl:', thumbnailUrl);
    }
    
    // Complete the query
    updateQuery += ` WHERE id = ?`;
    params.push(courseId);
    console.log('  Added courseId:', courseId);
    console.log('  Final params:', params);
    
    // Execute the update
    await pool.execute(updateQuery, params);

    // Get updated course
    const [updatedCourse] = await pool.execute(
      'SELECT * FROM academy_courses WHERE id = ?',
      [courseId]
    );

    console.log(`✅ Course updated: "${updatedCourse[0].title}"`);

    // Helper function to safely parse JSON
    const safeJSONParse = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          console.log('Failed to parse JSON in response:', value, 'Error:', e.message);
          return [];
        }
      }
      return [];
    };

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: {
        ...updatedCourse[0],
        tags: safeJSONParse(updatedCourse[0].tags),
        learning_objectives: safeJSONParse(updatedCourse[0].what_you_learn)
      }
    });

  } catch (error) {
    console.error('❌ Course update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course'
    });
  }
};

/**
 * Delete a course (Expert only - own courses)
 */
const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const instructorId = req.userId;

    // Verify course ownership
    const [existingCourse] = await pool.execute(
      'SELECT id, instructor_id, title FROM courses WHERE id = ?',
      [courseId]
    );

    if (existingCourse.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (existingCourse[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own courses.'
      });
    }

    // Check if course has enrollments
    const [enrollments] = await pool.execute(
      'SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = ?',
      [courseId]
    );

    if (enrollments[0].count > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete course with active enrollments. Please contact support.'
      });
    }

    // Delete course (CASCADE will handle related records)
    await pool.execute('DELETE FROM courses WHERE id = ?', [courseId]);

    console.log(`✅ Course deleted: "${existingCourse[0].title}"`);

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('❌ Course deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete course'
    });
  }
};

/**
 * Publish/Unpublish a course
 */
const toggleCourseStatus = async (req, res) => {
  try {
    const courseId = req.params.id;
    const instructorId = req.userId;
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: draft, published, or archived'
      });
    }

    // Verify course ownership
    const [existingCourse] = await pool.execute(
      'SELECT id, instructor_id, title FROM courses WHERE id = ?',
      [courseId]
    );

    if (existingCourse.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (existingCourse[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own courses.'
      });
    }

    // Update course status
    await pool.execute(
      'UPDATE courses SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, courseId]
    );

    console.log(`✅ Course status changed: "${existingCourse[0].title}" -> ${status}`);

    res.status(200).json({
      success: true,
      message: `Course ${status} successfully`,
      data: { status }
    });

  } catch (error) {
    console.error('❌ Course status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course status'
    });
  }
};

/**
 * Get course analytics for instructor
 */
const getCourseAnalytics = async (req, res) => {
  try {
    const courseId = req.params.id;
    const instructorId = req.userId;

    // Verify course ownership
    const [course] = await pool.execute(
      'SELECT id, instructor_id, title FROM courses WHERE id = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view analytics for your own courses.'
      });
    }

    // Get enrollment analytics
    const [enrollmentStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as enrollments_last_30_days,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as enrollments_last_7_days
      FROM course_enrollments 
      WHERE course_id = ?
    `, [courseId]);

    // Get completion rate (placeholder - you can implement progress tracking)
    const completionRate = 0; // TODO: Implement based on lessons completion

    res.status(200).json({
      success: true,
      data: {
        course_id: courseId,
        course_title: course[0].title,
        ...enrollmentStats[0],
        completion_rate: completionRate
      }
    });

  } catch (error) {
    console.error('❌ Course analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course analytics'
    });
  }
};

/**
 * Get all published courses with filtering (public)
 */
const getCourses = async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      level = '',
      sort = 'created_at',
      order = 'DESC',
      limit = 12,
      page = 1
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Validate sort parameters
    const validSorts = ['created_at', 'title', 'rating', 'enrollment_count'];
    const validOrders = ['ASC', 'DESC'];
    const safeSort = validSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
    
    // Build query conditions
    const conditions = ['c.status = ?'];
    const params = ['published'];
    
    // Add search condition
    if (search && search.trim() !== '') {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }
    
    // Add category filter
    if (category && category !== 'all' && category.trim() !== '') {
      conditions.push('cat.name = ?');
      params.push(category.trim());
    }
    
    // Add level filter
    if (level && level !== 'all' && level.trim() !== '') {
      conditions.push('c.level = ?');
      params.push(level.trim());
    }
    
    // Build the complete query
    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT 
        c.*,
        cat.name as category_name,
        CONCAT(u.first_name, ' ', u.last_name) as expert_name
      FROM academy_courses c
      LEFT JOIN academy_categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE ${whereClause}
      ORDER BY c.${safeSort} ${safeOrder}
      LIMIT ? OFFSET ?`;
    
    // Add pagination parameters
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('🔍 Debug getCourses:');
    console.log('📊 Query:', query);
    console.log('🔢 Query params:', params);
    console.log('📝 Param count:', params.length);
    
    // Use our secure query wrapper
    const [courses] = await secureQuery(query, params);
    return handleCoursesResponse(courses, res);
    
  } catch (error) {
    console.error('Get courses error:', error);
    res.json({ success: true, data: [] });
  }
};

// Helper function to handle courses response
function handleCoursesResponse(courses, res) {
  const safeJSONParse = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const formattedCourses = courses.map(course => ({
    ...course,
    tags: safeJSONParse(course.tags),
    learning_objectives: safeJSONParse(course.what_you_learn)
  }));

  console.log(`✅ Successfully fetched ${formattedCourses.length} courses`);
  
  res.json({
    success: true,
    data: formattedCourses
  });
}

/**
 * Get single course by ID
 */
const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const [courses] = await pool.execute(
      'SELECT * FROM courses WHERE id = ? AND status = "published"',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const course = courses[0];
    const formattedCourse = {
      ...course,
      tags: course.tags ? JSON.parse(course.tags) : [],
      learning_objectives: course.learning_objectives ? JSON.parse(course.learning_objectives) : []
    };

    res.json({
      success: true,
      data: formattedCourse
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
};

/**
 * Publish course (Expert only)
 */
const publishCourse = async (req, res) => {
  try {
    // Try multiple parameter sources
    const courseId = req.params.courseId || req.params.id || req.body.courseId;
    const instructorId = req.userId;

    console.log('🔍 Debug publishCourse params:', { 
      'req.params': req.params, 
      'req.body': req.body,
      'extracted courseId': courseId,
      'instructorId': instructorId
    });

    // Validate parameters
    if (!courseId || !instructorId) {
      console.log('❌ Missing required parameters:', { courseId, instructorId });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    console.log('🔍 Publishing course:', { courseId: courseId, instructorId: instructorId });

    // Verify course ownership
    const [course] = await pool.execute(
      'SELECT id, instructor_id, title, status FROM academy_courses WHERE id = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only publish your own courses.'
      });
    }

    // Update to published
    await pool.execute(
      'UPDATE academy_courses SET status = "published", updated_at = NOW() WHERE id = ?',
      [courseId]
    );

    console.log(`✅ Course published: "${course[0].title}"`);

    res.json({
      success: true,
      message: 'Course published successfully',
      data: {
        id: courseId,
        status: 'published'
      }
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish course'
    });
  }
};

/**
 * Unpublish course (Expert only)
 */
const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.userId;

    // Verify course ownership
    const [course] = await pool.execute(
      'SELECT id, instructor_id, title FROM academy_courses WHERE id = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only unpublish your own courses.'
      });
    }

    // Update to draft
    await pool.execute(
      'UPDATE academy_courses SET status = "draft", updated_at = NOW() WHERE id = ?',
      [courseId]
    );

    res.json({
      success: true,
      message: 'Course unpublished successfully'
    });
  } catch (error) {
    console.error('Unpublish course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unpublish course'
    });
  }
};

/**
 * Get expert's courses
 */
const getExpertCourses = async (req, res) => {
  // This is an alias for getMyCourses
  return await getMyCourses(req, res);
};

/**
 * Enroll in course (Student only)
 */
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    console.log('📝 Enrollment attempt:', { courseId, userId });

    // Check if course exists and is published
    const [courses] = await pool.execute(
      'SELECT * FROM academy_courses WHERE id = ? AND status = "published"',
      [courseId]
    );

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available'
      });
    }

    const course = courses[0];

    // Check if user is the instructor of this course
    if (course.instructor_id === userId) {
      console.log('⚠️ Instructor trying to enroll in their own course:', { courseId, userId, instructorId: course.instructor_id });
      return res.status(403).json({
        success: false,
        message: 'Instructors cannot enroll in their own courses'
      });
    }

    // Check if already enrolled
    const [existing] = await pool.execute(
      'SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
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
      [userId, courseId]
    );

    console.log(`✅ User ${userId} successfully enrolled in course ${courseId}: "${course.title}"`);

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        course_id: courseId,
        course_title: course.title,
        enrollment_date: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Enroll in course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    });
  }
};

/**
 * Get user enrollments
 */
const getUserEnrollments = async (req, res) => {
  try {
    const userId = req.userId;

    const [enrollments] = await pool.execute(`
      SELECT 
        e.*,
        c.id as course_id,
        c.title,
        c.description,
        c.instructor_name,
        c.category,
        c.level,
        c.thumbnail_url,
        c.total_lessons,
        c.rating
      FROM course_enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrollment_date DESC
    `, [userId]);

    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Get user enrollments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
};

/**
 * Upload course content (video/audio)
 */
const uploadCourseContent = async (req, res) => {
  try {
    console.log('🚀 UPLOAD REQUEST RECEIVED');
    console.log('================================');
    
    const instructorId = req.userId;
    const { course_id, type, title } = req.body;

    // Log everything about the request
    console.log('📋 Request Details:');
    console.log('  - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('  - Method:', req.method);
    console.log('  - URL:', req.url);
    console.log('  - User ID:', instructorId);
    console.log('  - User Type:', req.userType);
    console.log('  - Raw Body:', req.body);
    console.log('  - Body Keys:', Object.keys(req.body));
    console.log('  - Body Values:', Object.values(req.body));
    console.log('  - File Object:', req.file);
    console.log('  - Files Array:', req.files);
    
    console.log('🎵 Audio/Video Upload Started:');
    console.log('  - Instructor ID:', instructorId);
    console.log('  - Course ID:', course_id, typeof course_id);
    console.log('  - Content Type:', type, typeof type);
    console.log('  - Title:', title, typeof title);
    console.log('  - File Details:', req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : 'No file');

    // Detailed validation with specific error messages
    const validationErrors = [];
    
    if (!instructorId) validationErrors.push('Missing instructor ID (authentication failed)');
    if (!course_id) validationErrors.push('Missing course_id in request body');
    if (!type) validationErrors.push('Missing type in request body');
    if (!title) validationErrors.push('Missing title in request body');
    if (!req.file) validationErrors.push('Missing file in request');
    
    if (validationErrors.length > 0) {
      console.log('❌ Validation failed:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + validationErrors.join(', '),
        errors: validationErrors,
        received: {
          instructorId: !!instructorId,
          course_id: !!course_id,
          type: !!type,
          title: !!title,
          file: !!req.file
        }
      });
    }

    // Verify course ownership
    const [course] = await pool.execute(
      'SELECT id, instructor_id, title FROM academy_courses WHERE id = ?',
      [course_id]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course[0].instructor_id !== instructorId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only upload content to your own courses.'
      });
    }

    // Validate file type - include more audio types and handle MIME type variations
    const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'];
    const validAudioTypes = [
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac', 
      'audio/ogg', 'audio/vorbis', 'audio/webm'
    ];
    
    console.log('🔍 File type validation:');
    console.log('  - File MIME type:', req.file.mimetype);
    console.log('  - Content type:', type);
    console.log('  - Valid audio types:', validAudioTypes);
    console.log('  - Valid video types:', validVideoTypes);
    
    if (type === 'video' && !validVideoTypes.includes(req.file.mimetype)) {
      console.log('❌ Invalid video file type');
      return res.status(400).json({
        success: false,
        message: 'Invalid video file type. Supported: MP4, AVI, MOV, WMV, QuickTime'
      });
    }

    if (type === 'audio' && !validAudioTypes.includes(req.file.mimetype)) {
      console.log('❌ Invalid audio file type');
      return res.status(400).json({
        success: false,
        message: 'Invalid audio file type. Supported: MP3, WAV, M4A, AAC, OGG'
      });
    }
    
    console.log('✅ File type validation passed');
    
    // Additional validation: Check if file type matches declared content type
    const fileIsVideo = req.file.mimetype.startsWith('video/');
    const fileIsAudio = req.file.mimetype.startsWith('audio/');
    
    if (type === 'video' && !fileIsVideo) {
      console.log('❌ Content type mismatch: declared video but file is not video');
      return res.status(400).json({
        success: false,
        message: 'Content type mismatch: file is not a video'
      });
    }
    
    if (type === 'audio' && !fileIsAudio) {
      console.log('❌ Content type mismatch: declared audio but file is not audio');
      return res.status(400).json({
        success: false,
        message: 'Content type mismatch: file is not audio'
      });
    }

    // Check file size limits
    const maxVideoSize = 500 * 1024 * 1024; // 500MB
    const maxAudioSize = 100 * 1024 * 1024; // 100MB

    if (type === 'video' && req.file.size > maxVideoSize) {
      return res.status(400).json({
        success: false,
        message: 'Video file too large. Maximum size: 500MB'
      });
    }

    if (type === 'audio' && req.file.size > maxAudioSize) {
      return res.status(400).json({
        success: false,
        message: 'Audio file too large. Maximum size: 100MB'
      });
    }

    const contentUrl = `/uploads/${type}s/${req.file.filename}`;
    const fileSize = req.file.size;
    const duration = 0; // TODO: Extract duration from media file
    
    console.log('💾 Saving to database:');
    console.log('  - Content URL:', contentUrl);
    console.log('  - File size:', fileSize);
    console.log('  - Duration:', duration);

    // Save content record to database
    const [result] = await pool.execute(`
      INSERT INTO course_content (
        course_id, title, content_type, file_url, file_name, file_size, mime_type,
        duration_seconds, upload_status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `, [
      course_id, title, type, contentUrl, req.file.filename, fileSize, 
      req.file.mimetype, duration, instructorId
    ]);

    console.log(`✅ ${type} content uploaded for course "${course[0].title}": ${title}`);

    res.status(201).json({
      success: true,
      message: `${type} content uploaded successfully`,
      data: {
        id: result.insertId,
        course_id,
        title,
        content_type: type,
        file_url: contentUrl,
        file_size: fileSize,
        upload_date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Upload course content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload course content'
    });
  }
};

/**
 * Get instructor courses (alias for getMyCourses)
 */
const getInstructorCourses = async (req, res) => {
  return await getMyCourses(req, res);
};

/**
 * Get sessions for a specific course
 */
const getCourseSessions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    // Verify course exists and user has access
    const [course] = await pool.execute(
      'SELECT id, instructor_id, title FROM academy_courses WHERE id = ?',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is instructor or enrolled student
    const isInstructor = course[0].instructor_id === userId;
    let isEnrolled = false;

    if (!isInstructor) {
      const [enrollment] = await pool.execute(
        'SELECT id FROM academy_enrollments WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );
      isEnrolled = enrollment.length > 0;
    }

    if (!isInstructor && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be enrolled in this course or be the instructor.'
      });
    }

    // Get sessions for this course
    const [sessions] = await pool.execute(`
      SELECT 
        s.*,
        u.first_name as expert_first_name,
        u.last_name as expert_last_name,
        COUNT(sp.user_id) as participant_count
      FROM live_sessions s
      JOIN users u ON s.expert_id = u.id
      LEFT JOIN session_participants sp ON s.id = sp.session_id
      WHERE s.course_id = ?
      GROUP BY s.id
      ORDER BY s.scheduled_at ASC
    `, [courseId]);

    // Format sessions
    const formattedSessions = sessions.map(session => {
      const sessionDate = new Date(session.scheduled_at);
      return {
        id: session.id,
        title: session.title,
        description: session.description,
        instructor: `${session.expert_first_name} ${session.expert_last_name}`,
        date: sessionDate.toISOString().split('T')[0],
        time: sessionDate.toTimeString().split(' ')[0].substring(0, 5),
        duration: `${session.duration_minutes} minutes`,
        participants: session.participant_count || 0,
        maxParticipants: session.max_participants,
        status: session.status,
        meetingUrl: session.meeting_url,
        canJoin: session.status === 'scheduled' && session.participant_count < session.max_participants
      };
    });

    res.json({
      success: true,
      data: formattedSessions,
      course: {
        id: course[0].id,
        title: course[0].title,
        isInstructor
      }
    });

  } catch (error) {
    console.error('❌ Get course sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course sessions'
    });
  }
};

/**
 * Get course content for enrolled students
 */
const getCourseContent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    console.log('📚 Getting course content:', { courseId, userId });

    // First, verify the course exists and is published
    const [course] = await pool.execute(
      'SELECT id, title, instructor_id, status FROM academy_courses WHERE id = ? AND status = "published"',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or not available'
      });
    }

    const courseData = course[0];
    const isInstructor = courseData.instructor_id === userId;

    // Check if user is enrolled (unless they're the instructor)
    if (!isInstructor) {
      const [enrollment] = await pool.execute(
        'SELECT id, status FROM academy_enrollments WHERE user_id = ? AND course_id = ?',
        [userId, courseId]
      );

      if (enrollment.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must enroll in this course to access content.',
          requiresEnrollment: true
        });
      }

      // Check if enrollment is active
      if (enrollment[0].status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Your enrollment status is inactive.'
        });
      }
    }

    // Get all course content
    const [contents] = await pool.execute(`
      SELECT 
        cc.id,
        cc.title,
        cc.description,
        cc.content_type,
        cc.file_url,
        cc.file_name,
        cc.file_size,
        cc.duration_seconds,
        cc.thumbnail_url,
        cc.content_order,
        cc.is_preview,
        cc.access_level,
        cc.view_count,
        cc.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM course_content cc
      JOIN users u ON cc.created_by = u.id
      WHERE cc.course_id = ? AND cc.upload_status = 'completed'
      ORDER BY cc.content_order ASC, cc.created_at ASC
    `, [courseId]);

    // Filter content based on access level and enrollment
    const accessibleContent = contents.filter(content => {
      // Instructor can access everything
      if (isInstructor) return true;
      
      // Free content is accessible to everyone
      if (content.access_level === 'free') return true;
      
      // Preview content is accessible to everyone
      if (content.is_preview) return true;
      
      // Enrolled-only content requires enrollment (already verified above)
      if (content.access_level === 'enrolled_only') return true;
      
      // Premium content (future feature)
      if (content.access_level === 'premium') {
        // For now, treat premium same as enrolled_only
        return true;
      }
      
      return false;
    });

    // Format content for response
    const formattedContent = accessibleContent.map(content => ({
      id: content.id,
      title: content.title,
      description: content.description,
      contentType: content.content_type,
      fileUrl: content.file_url,
      fileName: content.file_name,
      fileSize: content.file_size,
      duration: content.duration_seconds,
      thumbnailUrl: content.thumbnail_url,
      order: content.content_order,
      isPreview: content.is_preview,
      accessLevel: content.access_level,
      viewCount: content.view_count,
      uploadedBy: content.created_by_name,
      uploadedAt: content.created_at
    }));

    console.log(`✅ Retrieved ${formattedContent.length} content items for course "${courseData.title}"`);

    res.json({
      success: true,
      data: {
        course: {
          id: courseData.id,
          title: courseData.title,
          isInstructor
        },
        content: formattedContent,
        totalItems: formattedContent.length
      }
    });

  } catch (error) {
    console.error('❌ Get course content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve course content'
    });
  }
};

/**
 * Get single content item with access control
 */
const getContentItem = async (req, res) => {
  try {
    const { courseId, contentId } = req.params;
    const userId = req.userId;

    console.log('🎬 Getting content item:', { courseId, contentId, userId });

    // Verify course exists and user has access
    const [course] = await pool.execute(
      'SELECT id, title, instructor_id, status FROM academy_courses WHERE id = ? AND status = "published"',
      [courseId]
    );

    if (course.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const courseData = course[0];
    const isInstructor = courseData.instructor_id === userId;

    // Check enrollment for non-instructors
    if (!isInstructor) {
      const [enrollment] = await pool.execute(
        'SELECT id, status FROM academy_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
        [userId, courseId]
      );

      if (enrollment.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be enrolled in this course.',
          requiresEnrollment: true
        });
      }
    }

    // Get the specific content item
    const [content] = await pool.execute(`
      SELECT 
        cc.*,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM course_content cc
      JOIN users u ON cc.created_by = u.id
      WHERE cc.id = ? AND cc.course_id = ? AND cc.upload_status = 'completed'
    `, [contentId, courseId]);

    if (content.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    const contentItem = content[0];

    // Check access level
    if (!isInstructor) {
      if (contentItem.access_level === 'premium' && !contentItem.is_preview) {
        // Future: Check if user has premium access
        // For now, allow if enrolled
      }
      
      if (contentItem.access_level === 'enrolled_only' && !contentItem.is_preview) {
        // Already verified enrollment above
      }
    }

    // Update view count
    await pool.execute(
      'UPDATE course_content SET view_count = view_count + 1 WHERE id = ?',
      [contentId]
    );

    // Track content progress (create or update)
    if (!isInstructor) {
      await pool.execute(`
        INSERT INTO content_progress (user_id, course_id, content_id, created_at) 
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `, [userId, courseId, contentId]).catch(err => {
        // Ignore if content_progress table doesn't exist yet
        console.log('Note: content_progress table not found, skipping progress tracking');
      });
    }

    const formattedContent = {
      id: contentItem.id,
      title: contentItem.title,
      description: contentItem.description,
      contentType: contentItem.content_type,
      fileUrl: contentItem.file_url,
      fileName: contentItem.file_name,
      fileSize: contentItem.file_size,
      mimeType: contentItem.mime_type,
      duration: contentItem.duration_seconds,
      thumbnailUrl: contentItem.thumbnail_url,
      order: contentItem.content_order,
      isPreview: contentItem.is_preview,
      accessLevel: contentItem.access_level,
      viewCount: contentItem.view_count + 1, // Include the increment
      uploadedBy: contentItem.created_by_name,
      uploadedAt: contentItem.created_at
    };

    console.log(`✅ Accessed content "${contentItem.title}" in course "${courseData.title}"`);

    res.json({
      success: true,
      data: {
        course: {
          id: courseData.id,
          title: courseData.title
        },
        content: formattedContent
      }
    });

  } catch (error) {
    console.error('❌ Get content item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve content item'
    });
  }
};

/**
 * Get user's enrolled courses with content access
 */
const getMyEnrolledCourses = async (req, res) => {
  try {
    const userId = req.userId;

    const [enrollments] = await pool.execute(`
      SELECT 
        e.*,
        c.id as course_id,
        c.title,
        c.description,
        c.short_description,
        c.level,
        c.duration_weeks,
        c.thumbnail_url,
        c.rating,
        c.enrollment_count,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
        cat.name as category_name,
        COUNT(cc.id) as total_content_items
      FROM academy_enrollments e
      JOIN academy_courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN academy_categories cat ON c.category_id = cat.id
      LEFT JOIN course_content cc ON c.id = cc.course_id AND cc.upload_status = 'completed'
      WHERE e.user_id = ? AND e.status = 'active'
      GROUP BY e.id, c.id
      ORDER BY e.enrollment_date DESC
    `, [userId]);

    const formattedEnrollments = enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      title: enrollment.title,
      description: enrollment.description,
      shortDescription: enrollment.short_description,
      level: enrollment.level,
      durationWeeks: enrollment.duration_weeks,
      thumbnailUrl: enrollment.thumbnail_url,
      rating: enrollment.rating,
      instructor: enrollment.instructor_name,
      category: enrollment.category_name,
      enrollmentDate: enrollment.enrollment_date,
      progress: enrollment.progress_percentage,
      isCompleted: enrollment.is_completed,
      certificateIssued: enrollment.certificate_issued,
      certificateUrl: enrollment.certificate_url,
      totalTimeSpent: enrollment.total_time_spent,
      lastAccessed: enrollment.last_accessed,
      totalContentItems: enrollment.total_content_items || 0,
      canAccessContent: true // They're enrolled, so they can access content
    }));

    console.log(`✅ Retrieved ${formattedEnrollments.length} enrolled courses for user ${userId}`);

    res.json({
      success: true,
      data: formattedEnrollments
    });

  } catch (error) {
    console.error('❌ Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve enrolled courses'
    });
  }
};

module.exports = {
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
  toggleCourseStatus,
  uploadCourseContent,
  getInstructorCourses,
  getCourseSessions,
  getCourseContent,
  getContentItem,
  getMyEnrolledCourses
};
