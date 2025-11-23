import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Eye, 
  Upload, 
  Trash2, 
  Plus, 
  Clock, 
  Users, 
  BookOpen,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  PlayCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import CourseForm from './CourseForm';
import InstructorContentViewer from './InstructorContentViewer';

const CourseManagement = () => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [publishingCourse, setPublishingCourse] = useState(null);
  const [categories, setCategories] = useState([]);
  const [viewingContent, setViewingContent] = useState(null);

  // Fetch expert's courses
  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses/my-courses');
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      showToast({ type: 'error', message: 'Failed to load your courses' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
    // Set some default categories (you might want to fetch these from an API)
    setCategories(['Agriculture', 'Livestock', 'Crop Management', 'Technology', 'Business', 'Sustainability']);
  }, []);

  // Publish course
  const handlePublishCourse = async (courseId) => {
    setPublishingCourse(courseId);
    try {
      const response = await api.patch(`/courses/${courseId}/publish`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Course published successfully!' });
        fetchMyCourses(); // Refresh list
      }
    } catch (error) {
      console.error('Error publishing course:', error);
      const message = error.response?.data?.message || 'Failed to publish course';
      showToast({ type: 'error', message });
    } finally {
      setPublishingCourse(null);
    }
  };

  // Unpublish course
  const handleUnpublishCourse = async (courseId) => {
    setPublishingCourse(courseId);
    try {
      const response = await api.patch(`/courses/${courseId}/unpublish`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Course moved to draft successfully!' });
        fetchMyCourses(); // Refresh list
      }
    } catch (error) {
      console.error('Error unpublishing course:', error);
      const message = error.response?.data?.message || 'Failed to unpublish course';
      showToast({ type: 'error', message });
    } finally {
      setPublishingCourse(null);
    }
  };

  // Handle edit success
  const handleEditSuccess = (updatedCourse) => {
    showToast({ type: 'success', message: 'Course updated successfully!' });
    setSelectedCourse(null);
    fetchMyCourses(); // Refresh the courses list
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setSelectedCourse(null);
  };

  // Handle view content
  const handleViewContent = (course) => {
    setViewingContent(course);
  };

  // Handle content view back
  const handleContentViewBack = () => {
    setViewingContent(null);
  };

  // If viewing content, show the InstructorContentViewer
  if (viewingContent) {
    return (
      <InstructorContentViewer
        course={viewingContent}
        onBack={handleContentViewBack}
      />
    );
  }

  // If editing, show the CourseForm with proper visibility and smooth transition
  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 animate-fadeIn">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb for better navigation */}
          <div className="mb-6">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <button
                    onClick={handleEditCancel}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    My Courses
                  </button>
                </li>
                <li className="text-gray-400">/</li>
                <li className="text-gray-900 font-medium">
                  {selectedCourse ? 'Edit Course' : 'New Course'}
                </li>
              </ol>
            </nav>
          </div>
          
          {/* Course Form with fade-in animation */}
          <div className="animate-slideUp">
            <CourseForm
              course={selectedCourse}
              categories={categories}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      </div>
    );
  }

  // Course card component
  const CourseCard = ({ course }) => {
    const isDraft = course.status === 'draft';
    const isPublished = course.status === 'published';
    
    return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        {/* Course Image */}
        <div className="relative h-48 bg-gray-200">
          {course.thumbnail_url && course.thumbnail_url !== '/images/default-course.jpg' ? (
            <img 
              src={`${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}${course.thumbnail_url}`}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <ImageIcon size={48} className="text-gray-400" />
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-4 left-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              isDraft 
                ? 'bg-yellow-100 text-yellow-800' 
                : isPublished 
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isDraft && <Clock size={12} className="inline mr-1" />}
              {isPublished && <CheckCircle size={12} className="inline mr-1" />}
              {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Course Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm text-blue-600 font-medium">{course.category_name}</span>
            <span className="text-sm text-gray-500">{course.level}</span>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <BookOpen size={14} />
                <span>{course.lessons_count} lessons</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users size={14} />
                <span>{course.enrolled_count} enrolled</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>{course.duration_weeks} weeks</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {isDraft && (
              <>
                <button
                  onClick={() => handlePublishCourse(course.id)}
                  disabled={publishingCourse === course.id}
                  className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    publishingCourse === course.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {publishingCourse === course.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Publish</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    console.log('🎯 Edit button clicked for course:', course);
                    setSelectedCourse(course);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors border border-blue-300 rounded-lg"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
              </>
            )}
            
            {/* View Content Button - Available for both draft and published */}
            <button
              onClick={() => handleViewContent(course)}
              className="flex items-center space-x-1 px-3 py-2 text-purple-600 hover:text-purple-800 transition-colors border border-purple-300 rounded-lg"
            >
              <PlayCircle size={16} />
              <span>View Content</span>
            </button>
            
            {isPublished && (
              <>
                <button
                  onClick={() => {
                    console.log('🎯 Edit button clicked for published course:', course);
                    setSelectedCourse(course);
                  }}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleUnpublishCourse(course.id)}
                  disabled={publishingCourse === course.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    publishingCourse === course.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'text-yellow-600 hover:text-yellow-800 border border-yellow-300'
                  }`}
                >
                  {publishingCourse === course.id ? '...' : 'Unpublish'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading your courses...</span>
      </div>
    );
  }

  // Separate courses by status
  const draftCourses = courses.filter(course => course.status === 'draft');
  const publishedCourses = courses.filter(course => course.status === 'published');

  return (
    <div className="space-y-8">
      {/* Draft Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Draft Courses ({draftCourses.length})</h2>
            <p className="text-gray-600">Courses ready to be edited and published</p>
          </div>
        </div>

        {draftCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {draftCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No draft courses</h3>
            <p className="text-gray-500">Create a new course to get started</p>
          </div>
        )}
      </div>

      {/* Published Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Published Courses ({publishedCourses.length})</h2>
            <p className="text-gray-600">Live courses available to students</p>
          </div>
        </div>

        {publishedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No published courses</h3>
            <p className="text-gray-500">Publish your draft courses to make them available to students</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseManagement;
