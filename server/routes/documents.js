const express = require('express');
const router = express.Router();
const {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  getUserDocuments,
  getDocumentById,
  deleteDocument,
  getCourseDocuments
} = require('../controllers/documentsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Upload single file
router.post('/upload', authenticateToken, upload.single('file'), uploadSingleFile);

// Upload multiple files
router.post('/upload-multiple', authenticateToken, upload.array('files', 5), uploadMultipleFiles);

// Get user's documents
router.get('/my-documents', authenticateToken, getUserDocuments);

// Get single document by ID
router.get('/:documentId', authenticateToken, getDocumentById);

// Delete document
router.delete('/:documentId', authenticateToken, deleteDocument);

// Get course documents
router.get('/course/:courseId', authenticateToken, getCourseDocuments);

module.exports = router;
