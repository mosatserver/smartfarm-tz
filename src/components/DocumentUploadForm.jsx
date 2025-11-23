import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Download,
  Eye,
  Trash2,
  Clock,
  BookOpen
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';

const DocumentUploadForm = ({ user, courses = [] }) => {
  const { showToast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Document form fields
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Fetch instructor courses
  const [instructorCourses, setInstructorCourses] = useState([]);

  useEffect(() => {
    fetchInstructorCourses();
  }, [user]);
  
  useEffect(() => {
    if (instructorCourses.length > 0) {
      fetchDocuments();
    }
  }, [instructorCourses]);

  const fetchInstructorCourses = async () => {
    if (!user) return;
    
    try {
      // Filter courses where the user is the instructor
      const myCourses = courses.filter(course => 
        course.instructor_id === user.id || 
        course.expert_id === user.id || 
        course.created_by === user.id
      );
      
      // Only show published courses
      const publishedCourses = myCourses.filter(course => 
        course.status === 'published' || !course.status // assume published if no status
      );
      
      setInstructorCourses(publishedCourses);
      
      // Auto-select first course if only one
      if (publishedCourses.length === 1) {
        setSelectedCourse(publishedCourses[0].id.toString());
      }
    } catch (error) {
      console.error('Error filtering instructor courses:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Try to fetch course content that includes documents
      // We'll filter for documents from the course content
      if (instructorCourses.length === 0) return;
      
      const allDocuments = [];
      for (const course of instructorCourses) {
        try {
          const response = await api.get(`/academy/courses/${course.id}/content`);
          if (response.data.success) {
            const content = response.data.data?.content || [];
            const documents = content.filter(item => item.contentType === 'document' || item.type === 'document');
            const documentsWithCourse = documents.map(doc => ({
              ...doc,
              course_title: course.title,
              course_id: course.id
            }));
            allDocuments.push(...documentsWithCourse);
          }
        } catch (courseError) {
          console.log(`Could not fetch content for course ${course.id}:`, courseError.message);
        }
      }
      
      setUploadedDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Don't show error toast for this since it's not critical
    }
  };

  // Validate file type and size based on backend supported types
  const validateFile = (file) => {
    // Backend now supports documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (!validTypes.includes(file.type)) {
      showToast({
        type: 'error',
        message: `File type ${file.type} not supported. Please use PDF, Word, Excel, PowerPoint, text, or image files.`
      });
      return false;
    }

    // Max file size: 50MB for documents
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      showToast({
        type: 'error',
        message: `File size too large. Maximum allowed size is 50MB.`
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (files) => {
    const validFiles = Array.from(files).filter(validateFile);
    
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      // Auto-generate title from first file if title is empty
      if (!documentTitle && validFiles[0]) {
        const fileName = validFiles[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
        setDocumentTitle(fileName);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedCourse) {
      showToast({ type: 'error', message: 'Please select a course' });
      return;
    }

    if (selectedFiles.length === 0) {
      showToast({ type: 'error', message: 'Please select at least one file' });
      return;
    }

    if (!documentTitle.trim()) {
      showToast({ type: 'error', message: 'Please enter a document title' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        
        formData.append('file', file);
        formData.append('course_id', selectedCourse);
        // Use 'document' type now that backend supports it
        formData.append('type', 'document');
        formData.append('title', selectedFiles.length > 1 ? `${documentTitle} - ${file.name}` : documentTitle);
        // Note: Don't send description as it may not be expected by the API

        // Debug: Log FormData contents (like in working video/audio upload)
        console.log('📦 FormData contents:');
        for (let pair of formData.entries()) {
          console.log(`  ${pair[0]}:`, pair[1]);
        }
        
        console.log('🔍 Uploading document with data:', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          courseId: selectedCourse,
          title: selectedFiles.length > 1 ? `${documentTitle} - ${file.name}` : documentTitle,
          type: 'document'
        });

        const response = await api.post('/courses/upload-content', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              ((i * 100) + (progressEvent.loaded * 100) / progressEvent.total) / selectedFiles.length
            );
            setUploadProgress(progress);
          },
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Upload failed');
        }
      }

      showToast({ 
        type: 'success', 
        message: `Successfully uploaded ${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''}!` 
      });
      
      // Reset form
      setDocumentTitle('');
      setDocumentDescription('');
      setSelectedFiles([]);
      setSelectedCourse('');
      setUploadProgress(0);
      
      // Refresh documents
      fetchDocuments();

    } catch (error) {
      console.error('❌ Error uploading document:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers
      });
      
      let message = 'Failed to upload document';
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.status === 400) {
        message = 'Bad request - The server rejected the upload. This might mean document uploads are not supported yet.';
      } else if (error.response?.status === 413) {
        message = 'File too large. Maximum size is 50MB';
      } else if (error.response?.status === 415) {
        message = 'Unsupported file type. Please use a valid document format';
      }
      
      showToast({ type: 'error', message });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      // Try to delete using the content API
      const response = await api.delete(`/courses/content/${documentId}`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Document deleted successfully' });
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      const message = error.response?.data?.message || 'Failed to delete document';
      showToast({ type: 'error', message });
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="text-red-500" size={20} />;
      case 'doc':
      case 'docx':
        return <FileText className="text-blue-500" size={20} />;
      case 'xls':
      case 'xlsx':
        return <FileText className="text-green-500" size={20} />;
      case 'ppt':
      case 'pptx':
        return <FileText className="text-orange-500" size={20} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="text-purple-500" size={20} />;
      default:
        return <FileText className="text-gray-500" size={20} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Upload size={24} className="text-blue-600 mr-2" />
          Upload Course Documents
        </h3>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course *
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            >
              <option value="">Choose a course...</option>
              {instructorCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {instructorCourses.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                You need to have published courses to upload documents.
              </p>
            )}
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="Enter document title..."
              required
            />
          </div>

          {/* Document Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={documentDescription}
              onChange={(e) => setDocumentDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="Describe what this document covers..."
            />
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Files *
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="document-upload"
              />
              <label
                htmlFor="document-upload"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-block font-medium"
              >
                Choose Files
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, Images (JPEG, PNG, GIF, WebP) - Max 50MB each
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Selected Files:</h4>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.name)}
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Uploading documents...</span>
                <span className="text-sm text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={uploading || selectedFiles.length === 0 || !selectedCourse}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </button>
        </form>
      </div>

      {/* Uploaded Documents Library */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <BookOpen size={24} className="text-green-600 mr-2" />
            My Document Library
          </h3>
          <span className="text-sm text-gray-500">
            {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {uploadedDocuments.length > 0 ? (
          <div className="space-y-3">
            {uploadedDocuments.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(document.filename || document.title)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{document.title}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{document.course_title || 'Unknown Course'}</span>
                      <span>•</span>
                      <span>{formatFileSize(document.file_size || 0)}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{formatDate(document.created_at)}</span>
                      </div>
                    </div>
                    {document.description && (
                      <p className="text-sm text-gray-600 mt-1 truncate">{document.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {document.file_url && (
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded yet</h4>
            <p className="text-gray-500">Upload your first document to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadForm;
