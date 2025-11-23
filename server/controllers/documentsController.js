const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create upload directories
const createUploadDirs = () => {
  const dirs = [
    'uploads/documents',
    'uploads/course-materials',
    'uploads/assignments',
    'uploads/thumbnails'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/documents';
    
    // Determine upload path based on request type
    if (req.body.upload_type === 'course-material') {
      uploadPath = 'uploads/course-materials';
    } else if (req.body.upload_type === 'assignment') {
      uploadPath = 'uploads/assignments';
    } else if (req.body.upload_type === 'thumbnail') {
      uploadPath = 'uploads/thumbnails';
    }
    
    cb(null, path.join(__dirname, '..', uploadPath));
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedMimeTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'video': ['video/mp4', 'video/avi', 'video/mov', 'video/webm'],
    'audio': ['audio/mp3', 'audio/wav', 'audio/ogg'],
    'presentation': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'spreadsheet': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  };

  const allAllowedTypes = Object.values(allowedMimeTypes).flat();
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per request
  }
});

// Upload single file
const uploadSingleFile = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      upload_type = 'document',
      course_id = null,
      lesson_id = null,
      access_level = 'private'
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // If course_id is provided, verify the user owns the course (for experts)
    if (course_id) {
      const [courseRows] = await pool.execute(
        'SELECT id FROM courses WHERE id = ? AND expert_id = ?',
        [course_id, userId]
      );

      if (courseRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload files to your own courses'
        });
      }
    }

    const file = req.file;
    const fileUrl = `/uploads/${upload_type === 'course-material' ? 'course-materials' : 
                               upload_type === 'assignment' ? 'assignments' : 
                               upload_type === 'thumbnail' ? 'thumbnails' : 'documents'}/${file.filename}`;

    // Insert document record
    const [result] = await pool.execute(`
      INSERT INTO documents (
        user_id, course_id, lesson_id, title, description, file_name,
        original_name, file_path, file_size, mime_type, upload_type, access_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, course_id, lesson_id, title, description, file.filename,
      file.originalname, fileUrl, file.size, file.mimetype, upload_type, access_level
    ]);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: result.insertId,
        title,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: fileUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_type,
        access_level
      }
    });

  } catch (error) {
    console.error('Upload single file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
};

// Upload multiple files
const uploadMultipleFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      upload_type = 'document',
      course_id = null,
      lesson_id = null,
      access_level = 'private'
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // If course_id is provided, verify the user owns the course
    if (course_id) {
      const [courseRows] = await pool.execute(
        'SELECT id FROM courses WHERE id = ? AND expert_id = ?',
        [course_id, userId]
      );

      if (courseRows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload files to your own courses'
        });
      }
    }

    const uploadedFiles = [];

    // Process each file
    for (const file of req.files) {
      const fileUrl = `/uploads/${upload_type === 'course-material' ? 'course-materials' : 
                                 upload_type === 'assignment' ? 'assignments' : 
                                 upload_type === 'thumbnail' ? 'thumbnails' : 'documents'}/${file.filename}`;

      // Use original filename as title if not provided
      const title = file.originalname.split('.')[0];

      const [result] = await pool.execute(`
        INSERT INTO documents (
          user_id, course_id, lesson_id, title, file_name,
          original_name, file_path, file_size, mime_type, upload_type, access_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, course_id, lesson_id, title, file.filename,
        file.originalname, fileUrl, file.size, file.mimetype, upload_type, access_level
      ]);

      uploadedFiles.push({
        id: result.insertId,
        title,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: fileUrl,
        file_size: file.size,
        mime_type: file.mimetype,
        upload_type,
        access_level
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: uploadedFiles
    });

  } catch (error) {
    console.error('Upload multiple files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files'
    });
  }
};

// Get user's documents
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      upload_type, 
      course_id, 
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE d.user_id = ?';
    const queryParams = [userId];

    if (upload_type) {
      whereClause += ' AND d.upload_type = ?';
      queryParams.push(upload_type);
    }

    if (course_id) {
      whereClause += ' AND d.course_id = ?';
      queryParams.push(course_id);
    }

    queryParams.push(parseInt(limit), offset);

    const [documents] = await pool.execute(`
      SELECT 
        d.*,
        c.title as course_title,
        l.title as lesson_title
      FROM documents d
      LEFT JOIN courses c ON d.course_id = c.id
      LEFT JOIN lessons l ON d.lesson_id = l.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    // Get total count
    const countQueryParams = queryParams.slice(0, -2);
    const [totalRows] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM documents d
      ${whereClause}
    `, countQueryParams);

    const total = totalRows[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
};

// Get document by ID
const getDocumentById = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId;

    const [documentRows] = await pool.execute(`
      SELECT 
        d.*,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        c.title as course_title,
        l.title as lesson_title
      FROM documents d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN courses c ON d.course_id = c.id
      LEFT JOIN lessons l ON d.lesson_id = l.id
      WHERE d.id = ?
    `, [documentId]);

    if (documentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documentRows[0];

    // Check access permissions
    const hasAccess = 
      document.user_id === userId || // Owner
      document.access_level === 'public' || // Public document
      (document.access_level === 'course_members' && document.course_id && 
       await checkCourseEnrollment(userId, document.course_id)); // Course member

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this document'
      });
    }

    res.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document'
    });
  }
};

// Helper function to check course enrollment
const checkCourseEnrollment = async (userId, courseId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
      [userId, courseId]
    );
    return rows.length > 0;
  } catch (error) {
    return false;
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.userId;

    // Get document info
    const [documentRows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    if (documentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const document = documentRows[0];

    // Check if user owns the document
    if (document.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own documents'
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', document.file_path.substring(1));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.execute('DELETE FROM documents WHERE id = ?', [documentId]);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

// Get course documents (for enrolled students or course owner)
const getCourseDocuments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    const { upload_type, page = 1, limit = 20 } = req.query;

    // Check if user has access to the course
    const [courseRows] = await pool.execute(
      'SELECT expert_id FROM courses WHERE id = ?',
      [courseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const isOwner = courseRows[0].expert_id === userId;
    const isEnrolled = await checkCourseEnrollment(userId, courseId);

    if (!isOwner && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this course'
      });
    }

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE d.course_id = ? AND (d.access_level = "public" OR d.access_level = "course_members")';
    const queryParams = [courseId];

    // If user is the course owner, they can see all documents
    if (isOwner) {
      whereClause = 'WHERE d.course_id = ?';
    }

    if (upload_type) {
      whereClause += ' AND d.upload_type = ?';
      queryParams.push(upload_type);
    }

    queryParams.push(parseInt(limit), offset);

    const [documents] = await pool.execute(`
      SELECT 
        d.*,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        l.title as lesson_title
      FROM documents d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN lessons l ON d.lesson_id = l.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
    `, queryParams);

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Get course documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve course documents'
    });
  }
};

module.exports = {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  getUserDocuments,
  getDocumentById,
  deleteDocument,
  getCourseDocuments
};
