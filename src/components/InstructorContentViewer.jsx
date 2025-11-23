import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle,
  Video,
  Headphones,
  Eye,
  Calendar,
  User,
  BookOpen,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import './CourseContentViewer.css';

const InstructorContentViewer = ({ course, onBack }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courseContent, setCourseContent] = useState([]);
  const [contentAnalytics, setContentAnalytics] = useState({});
  const [contentStats, setContentStats] = useState({
    totalItems: 0,
    totalDuration: 0,
    totalViews: 0,
    averageCompletion: 0
  });
  const [selectedContent, setSelectedContent] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeTab, setActiveTab] = useState('content'); // content, analytics, students

  // Helper to build absolute/relative URLs depending on env
  const buildUrl = (path) => {
    if (!path) return '';
    const prefix = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
    return `${prefix}${path}`;
  };

  // Fetch course content and analytics
  const fetchCourseContent = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/academy/courses/${course.id}/content`);
      if (response.data.success) {
        const contentData = response.data.data;
        const content = contentData?.content || [];
        setCourseContent(content);
        
        // Calculate stats
        const stats = {
          totalItems: content.length,
          totalDuration: content.reduce((total, item) => total + (item.duration || 0), 0),
          totalViews: content.reduce((total, item) => total + (item.viewCount || 0), 0),
          averageCompletion: content.length > 0 ? 
            content.reduce((total, item) => total + (item.completionRate || 0), 0) / content.length : 0
        };
        setContentStats(stats);
      }
    } catch (error) {
      console.error('Error fetching course content:', error);
      showToast({ 
        type: 'error', 
        message: 'Failed to load course content. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch content analytics
  const fetchContentAnalytics = async () => {
    try {
      const response = await api.get(`/academy/courses/${course.id}/analytics`);
      if (response.data.success) {
        setContentAnalytics(response.data.data || {});
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    if (course?.id) {
      fetchCourseContent();
      fetchContentAnalytics();
    }
  }, [course?.id]);

  // Content type icons
  const getContentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video size={20} className="text-red-500" />;
      case 'audio':
        return <Headphones size={20} className="text-purple-500" />;
      case 'document':
      case 'pdf':
        return <FileText size={20} className="text-blue-500" />;
      case 'live_session':
        return <PlayCircle size={20} className="text-green-500" />;
      default:
        return <BookOpen size={20} className="text-gray-500" />;
    }
  };

  // Content type labels
  const getContentTypeLabel = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return 'Video Lesson';
      case 'audio':
        return 'Audio Content';
      case 'document':
      case 'pdf':
        return 'Document';
      case 'live_session':
        return 'Live Session';
      default:
        return 'Content';
    }
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins % 60}m`;
    }
    return `${mins}m`;
  };

  // Handle content preview
  const handlePreviewContent = (content) => {
    if (['video', 'audio'].includes(content.contentType?.toLowerCase())) {
      setSelectedContent(content);
      setShowPlayer(true);
    } else if (['document', 'pdf'].includes(content.contentType?.toLowerCase())) {
      window.open(buildUrl(content.fileUrl), '_blank');
    }
  };

  const closePlayer = () => {
    setShowPlayer(false);
    setSelectedContent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Course Management</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Instructor Dashboard
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Info Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start space-x-6">
            <img
              src={course.thumbnail_url && course.thumbnail_url !== '/images/default-course.jpg' 
                ? buildUrl(course.thumbnail_url)
                : '/api/placeholder/300/200'
              } 
              alt={course.title}
              className="w-24 h-24 rounded-lg object-cover"
              onError={(e) => {
                e.target.src = '/api/placeholder/300/200';
              }}
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-lg opacity-90 mb-3">{course.description}</p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <BookOpen size={16} />
                  <span>{contentStats.totalItems} Items</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={16} />
                  <span>{formatDuration(contentStats.totalDuration)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye size={16} />
                  <span>{contentStats.totalViews} Total Views</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp size={16} />
                  <span>{Math.round(contentStats.averageCompletion)}% Avg Completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'content', label: 'Content Overview', icon: BookOpen },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'students', label: 'Student Progress', icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'content' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Content</h2>
                <p className="text-gray-600">Manage and preview your uploaded content</p>
              </div>
              <button
                onClick={() => {/* TODO: Add new content */}}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                <span>Add Content</span>
              </button>
            </div>

            {courseContent.length > 0 ? (
              <div className="space-y-4">
                {courseContent.map((content, index) => (
                  <div
                    key={content.id}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200"
                  >
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Content Number */}
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>

                        {/* Content Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                {getContentIcon(content.contentType)}
                                <span className="text-xs text-gray-500 font-medium">
                                  {getContentTypeLabel(content.contentType)}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {content.title}
                              </h3>
                              {content.description && (
                                <p className="text-gray-600 text-sm line-clamp-2">
                                  {content.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Duration & Actions */}
                            <div className="text-right">
                              {content.duration && (
                                <div className="text-sm text-gray-500 mb-2 flex items-center">
                                  <Clock size={14} className="mr-1" />
                                  {formatDuration(content.duration)}
                                </div>
                              )}
                              {content.uploadedAt && (
                                <div className="text-xs text-gray-400 flex items-center">
                                  <Calendar size={12} className="mr-1" />
                                  {new Date(content.uploadedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Analytics Row */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              {content.fileSize && (
                                <span>{(content.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                              )}
                              <div className="flex items-center space-x-1">
                                <Eye size={14} />
                                <span>{content.viewCount || 0} views</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Activity size={14} />
                                <span>{content.completionRate || 0}% completion</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users size={14} />
                                <span>{content.activeStudents || 0} active students</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => handlePreviewContent(content)}
                                className="text-blue-600 hover:text-blue-800 text-sm p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Preview"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                className="text-gray-600 hover:text-gray-800 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              {content.fileUrl && (
                                <button 
                                  onClick={() => window.open(buildUrl(content.fileUrl), '_blank')}
                                  className="text-green-600 hover:text-green-800 text-sm p-2 rounded-lg hover:bg-green-50 transition-colors"
                                  title="Download"
                                >
                                  <Download size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content uploaded yet</h3>
                <p className="text-gray-500 mb-4">
                  Start by uploading your first lesson or document for this course.
                </p>
                <button
                  onClick={() => {/* TODO: Add new content */}}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  <span>Upload Content</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Content Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Content</p>
                    <p className="text-2xl font-semibold text-gray-900">{contentStats.totalItems}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-semibold text-gray-900">{contentStats.totalViews}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatDuration(contentStats.totalDuration)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                    <p className="text-2xl font-semibold text-gray-900">{Math.round(contentStats.averageCompletion)}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Content Performance</h3>
              <p className="text-gray-500">Detailed analytics coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Progress</h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-500">Student progress tracking coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Media Preview Modal */}
      {showPlayer && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl max-h-[80vh] w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                {selectedContent.contentType?.toLowerCase() === 'audio' ? (
                  <Headphones size={24} className="text-purple-500" />
                ) : (
                  <Video size={24} className="text-red-500" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedContent.title}</h3>
                  <p className="text-sm text-gray-600">
                    {getContentTypeLabel(selectedContent.contentType)}
                  </p>
                </div>
              </div>
              <button
                onClick={closePlayer}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative">
              {selectedContent.contentType?.toLowerCase() === 'video' ? (
                <video
                  className="w-full h-auto max-h-[60vh]"
                  controls
                  src={buildUrl(selectedContent.fileUrl)}
                >
                  Your browser does not support the video element.
                </video>
              ) : (
                <div className="flex items-center justify-center h-48 bg-gradient-to-br from-purple-400 to-purple-600">
                  <audio
                    className="w-full"
                    controls
                    src={buildUrl(selectedContent.fileUrl)}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorContentViewer;
