const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directories if they don't exist
const baseUploadsDir = path.join(__dirname, '../uploads');
const uploadsDir = path.join(baseUploadsDir, 'courses');
const videosDir = path.join(baseUploadsDir, 'videos');
const audiosDir = path.join(baseUploadsDir, 'audios');
const documentsDir = path.join(baseUploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
if (!fs.existsSync(audiosDir)) {
  fs.mkdirSync(audiosDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure multer for course image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: courseId_timestamp.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `course_${uniqueSuffix}${ext}`);
  }
});

// Enhanced storage for content uploads (video/audio/documents)
const contentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let destinationDir;
    if (file.mimetype.startsWith('video/')) {
      destinationDir = videosDir;
    } else if (file.mimetype.startsWith('audio/')) {
      destinationDir = audiosDir;
    } else if (file.mimetype === 'application/pdf' || 
               file.mimetype.startsWith('application/vnd.openxmlformats-') ||
               file.mimetype.startsWith('application/vnd.ms-') ||
               file.mimetype === 'application/msword' ||
               file.mimetype === 'text/plain') {
      destinationDir = documentsDir;
    } else {
      destinationDir = uploadsDir;
    }
    cb(null, destinationDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with proper prefix
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    let prefix = 'content';
    
    if (file.mimetype.startsWith('video/')) {
      prefix = 'video';
    } else if (file.mimetype.startsWith('audio/')) {
      prefix = 'audio';
    } else if (file.mimetype === 'application/pdf' || 
               file.mimetype.startsWith('application/vnd.openxmlformats-') ||
               file.mimetype.startsWith('application/vnd.ms-') ||
               file.mimetype === 'application/msword' ||
               file.mimetype === 'text/plain') {
      prefix = 'document';
    }
    
    cb(null, `${prefix}_${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Enhanced file filter for content uploads (video/audio/images/documents)
const contentFileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'];
  const allowedAudioTypes = [
    'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac', 
    'audio/ogg', 'audio/vorbis', 'audio/webm'
  ];
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ];
  
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes, ...allowedDocumentTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported: Images (JPEG, PNG, GIF, WebP), Videos (MP4, AVI, MOV, WMV), Audio (MP3, WAV, M4A, AAC, OGG), Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)'), false);
  }
};

// Configure upload limits for regular course uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: fileFilter
});

// Configure upload limits for content uploads (video/audio)
const contentUpload = multer({
  storage: contentStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for video/audio
  },
  fileFilter: contentFileFilter
});

// Middleware for single course thumbnail upload
const uploadCourseImage = upload.single('thumbnail');

// Middleware for content upload (video/audio)
const uploadContent = contentUpload.single('file');

// Error handling wrapper for course images
const handleUpload = (req, res, next) => {
  uploadCourseImage(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

// Enhanced error handling wrapper for content uploads
const handleContentUpload = (req, res, next) => {
  console.log('🔄 Content upload middleware started');
  
  uploadContent(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer error during content upload:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 500MB for videos/audio.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    } else if (err) {
      console.error('❌ Content upload error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    console.log('✅ Content upload middleware completed successfully');
    if (req.file) {
      console.log('📁 File uploaded:', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        destination: req.file.destination
      });
    }
    
    next();
  });
};

module.exports = {
  handleUpload,
  handleContentUpload,
  uploadsDir,
  videosDir,
  audiosDir,
  documentsDir
};
