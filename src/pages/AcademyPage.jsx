import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  PlayCircle, 
  FileText, 
  Users, 
  Clock, 
  Star, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Download, 
  Video, 
  MessageCircle, 
  Bell,
  ChevronRight,
  Award,
  TrendingUp,
  BarChart3,
  Bookmark,
  Settings,
  Plus,
  X,
  ArrowUp
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import CourseManagement from '../components/CourseManagement';
import CourseForm from '../components/CourseForm';
import CourseContentViewer from '../components/CourseContentViewer';
import DocumentUploadForm from '../components/DocumentUploadForm';

const AcademyPage = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState(['all']);
  const [liveSessions, setLiveSessions] = useState([]);
  const [userProgress, setUserProgress] = useState({
    coursesCompleted: 0,
    totalHoursLearned: 0,
    certificates: 0,
    currentStreak: 0
  });
  
  // Course creation form state
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: '',
    duration_weeks: 8,
    level: 'beginner',
    price: 'Free',
    tags: [],
    prerequisites: '',
    learning_objectives: []
  });
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // Live session management state
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration_minutes: 60,
    max_participants: 50,
    meeting_url: ''
  });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [expertSessions, setExpertSessions] = useState([]);
  
  // Course-based session management
  const [selectedCourseForSession, setSelectedCourseForSession] = useState(null);
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [courseSessions, setCourseSessions] = useState([]);
  const [sessionManagementView, setSessionManagementView] = useState('courses'); // 'courses' | 'session-options' | 'schedule' | 'upload'
  const [sessionType, setSessionType] = useState(''); // 'live-now' | 'schedule' | 'upload-video' | 'upload-audio'
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Course content viewer state
  const [viewingCourse, setViewingCourse] = useState(null);
  const [showCourseContent, setShowCourseContent] = useState(false);

  // Document viewer modal state
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentToView, setDocumentToView] = useState(null); // { id, title, content, author, date }
  const [documentScrollPosition, setDocumentScrollPosition] = useState(0);

  // Helper function to check if user is an expert
  const isExpert = () => {
    return user && user.userType === 'expert';
  };

  // Helper function to check if user is a student (all other user types)
  const isStudent = () => {
    return user && user.userType !== 'expert';
  };

  // Fetch instructor's courses for session management
  const fetchInstructorCourses = async () => {
    if (!isExpert() || !user) return;
    
    try {
      const response = await api.get('/courses/instructor/my-courses');
      if (response.data.success) {
        setInstructorCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching instructor courses:', error);
      // Fallback: filter from all courses
      const myCourses = courses.filter(course => course.instructor_id === user.id);
      setInstructorCourses(myCourses);
    }
  };

  // Fetch sessions for a specific course
  const fetchCourseSessions = async (courseId) => {
    try {
      const response = await api.get(`/courses/${courseId}/sessions`);
      if (response.data.success) {
        setCourseSessions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching course sessions:', error);
      showToast({ type: 'error', message: 'Failed to load course sessions' });
    }
  };

  // Handle session type selection
  const handleSessionTypeSelect = (type) => {
    setSessionType(type);
    if (type === 'live-now') {
      handleStartLiveNow();
    } else {
      setSessionManagementView('schedule');
    }
  };

  // Start live session immediately
  const handleStartLiveNow = async () => {
    if (!selectedCourseForSession) return;
    
    try {
      const sessionData = {
        course_id: selectedCourseForSession.id,
        title: `Live Session: ${selectedCourseForSession.title}`,
        description: `Interactive live session for ${selectedCourseForSession.title}`,
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        duration_minutes: 60,
        max_participants: 100,
        start_immediately: true
      };

      const response = await api.post('/live-sessions', sessionData);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Live session started! Students are being notified.' });
        
        // Start the session immediately
        await handleStartLiveSession(response.data.data.id);
        
        // Reset view
        setSessionManagementView('courses');
        setSelectedCourseForSession(null);
      }
    } catch (error) {
      console.error('Error starting live session:', error);
      const message = error.response?.data?.message || 'Failed to start live session';
      showToast({ type: 'error', message });
    }
  };

  // Handle file upload for video/audio content
  const handleFileUpload = async (file, type) => {
    if (!selectedCourseForSession || !file) {
      console.error('❌ Missing required data for upload:', { 
        selectedCourse: !!selectedCourseForSession, 
        file: !!file 
      });
      showToast({ type: 'error', message: 'Missing course or file for upload' });
      return;
    }
    
    console.log(`🚀 Starting ${type} upload:`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      courseId: selectedCourseForSession.id,
      courseName: selectedCourseForSession.title
    });
    
    // Validate file type on frontend
    const validAudioTypes = [
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac', 
      'audio/ogg', 'audio/vorbis', 'audio/webm'
    ];
    const validVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'];
    
    if (type === 'audio' && !validAudioTypes.includes(file.type)) {
      console.error('❌ Invalid audio file type:', file.type);
      showToast({ 
        type: 'error', 
        message: `Invalid audio file type: ${file.type}. Supported: MP3, WAV, M4A, AAC, OGG` 
      });
      return;
    }
    
    if (type === 'video' && !validVideoTypes.includes(file.type)) {
      console.error('❌ Invalid video file type:', file.type);
      showToast({ 
        type: 'error', 
        message: `Invalid video file type: ${file.type}. Supported: MP4, AVI, MOV, WMV` 
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', selectedCourseForSession.id);
    formData.append('type', type);
    formData.append('title', `${type === 'video' ? 'Video' : 'Audio'} Content: ${file.name}`);
    
    // Log FormData contents
    console.log('📦 FormData contents:');
    for (let pair of formData.entries()) {
      console.log(`  ${pair[0]}:`, pair[1]);
    }
    
    try {
      setUploadProgress(0);
      console.log('📡 Sending upload request...');
      
      const response = await api.post('/courses/upload-content', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📊 Upload progress: ${progress}%`);
          setUploadProgress(progress);
        },
      });
      
      console.log('✅ Upload response:', response.data);
      
      if (response.data.success) {
        showToast({ type: 'success', message: `${type} content uploaded successfully!` });
        setSessionManagementView('courses');
        setSelectedCourseForSession(null);
        setUploadFile(null);
        setUploadProgress(0);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading content:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let message = `Failed to upload ${type} content`;
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.status === 413) {
        message = `File too large. Maximum size is ${type === 'video' ? '500MB' : '100MB'}`;
      } else if (error.response?.status === 415) {
        message = `Unsupported file type. Please use a valid ${type} format`;
      }
      
      showToast({ type: 'error', message });
      setUploadProgress(0);
    }
  };

  // Handle scheduled session creation
  const handleScheduleSession = async (sessionData) => {
    if (!selectedCourseForSession) return;
    
    try {
      const response = await api.post('/live-sessions', {
        ...sessionData,
        course_id: selectedCourseForSession.id
      });
      
      if (response.data.success) {
        showToast({ type: 'success', message: 'Session scheduled successfully!' });
        setSessionManagementView('courses');
        setSelectedCourseForSession(null);
        fetchLiveSessions(); // Refresh sessions
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      const message = error.response?.data?.message || 'Failed to schedule session';
      showToast({ type: 'error', message });
    }
  };

  // API Functions
  const fetchCategories = async () => {
    try {
      const response = await api.get('/academy/categories');
      if (response.data.success) {
        const categoryNames = ['all', ...response.data.data.map(cat => cat.name)];
        setCategories(categoryNames);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast({ type: 'error', message: 'Failed to load categories' });
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    
    // Define params outside try block so it's accessible in catch block
    const params = {
      search: searchQuery,
      category: selectedCategory !== 'all' ? selectedCategory : '',
      limit: 50
    };
    
    try {
      // Use academy endpoint which includes enrollment status
      const response = await api.get('/academy/courses', { params });
      
      // Debug logging to see the response structure
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Courses API Response:', response.data);
      }
      
      if (response.data.success) {
        // The API returns courses in response.data.data.courses
        let coursesData = response.data.data.courses || response.data.data || [];
        
        // If it's still not an array, make it one
        if (!Array.isArray(coursesData)) {
          console.warn('⚠️ Courses data is not an array:', coursesData);
          coursesData = coursesData ? [coursesData] : [];
        }
        
        const formattedCourses = coursesData.map(course => {
          // Debug logging to see the course structure
          if (process.env.NODE_ENV === 'development') {
            console.log('📚 Course data:', course);
          }
          
          return {
            ...course,
            image: course.thumbnail_url || '/api/placeholder/300/200',
            duration: `${course.duration_weeks || 1} weeks`,
            lessons: course.total_lessons || 0,
            level: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Beginner',
            instructor: course.instructor_name || course.expert_name || course.instructor || 'Expert',
            category: course.category_name || course.category || 'General',
            enrolled: course.enrollment_count || course.total_enrollments || 0,
            rating: parseFloat(course.rating) || 4.5,
            tags: Array.isArray(course.tags) ? course.tags : (course.tags ? [course.tags] : []),
            // Ensure instructor_id is properly mapped - try multiple possible field names
            instructor_id: course.instructor_id || course.expert_id || course.created_by
          };
        });
        
        console.log('✅ Formatted courses:', formattedCourses);
        setCourses(formattedCourses);
      } else {
        console.error('❌ API response indicates failure:', response.data);
        showToast({ type: 'error', message: response.data.message || 'Failed to load courses' });
        setCourses([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      console.error('Response data:', error.response?.data);
      
      // Check if it's a CORS or network error
      const isCorsError = error.code === 'ERR_NETWORK' || error.message.includes('CORS') || error.message.includes('Network Error');
      
      if (isCorsError) {
        console.log('🚨 CORS/Network error detected - Backend may not be running');
        setCourses([]); // Set empty array
        showToast({ 
          type: 'error', 
          message: 'Cannot connect to server. Please check if the backend is running on http://localhost:5000' 
        });
        return;
      }
      
      // Try to fallback to the old endpoint if academy endpoint fails (non-CORS errors)
      try {
        console.log('🔄 Trying fallback endpoint: /courses');
        const fallbackResponse = await api.get('/courses', { params });
        
        if (fallbackResponse.data.success && Array.isArray(fallbackResponse.data.data)) {
          const formattedCourses = fallbackResponse.data.data.map(course => ({
            ...course,
            image: course.thumbnail_url || '/api/placeholder/300/200',
            duration: `${course.duration_weeks || 1} weeks`,
            lessons: course.total_lessons || 0,
            level: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Beginner',
            instructor: course.expert_name || course.instructor || 'Expert',
            category: course.category_name || course.category || 'General',
            enrolled: course.total_enrollments || 0,
            rating: course.rating || 4.5,
            tags: Array.isArray(course.tags) ? course.tags : (course.tags ? [course.tags] : []),
            instructor_id: course.instructor_id || course.expert_id || course.created_by
          }));
          
          console.log('✅ Fallback courses loaded:', formattedCourses);
          setCourses(formattedCourses);
          showToast({ type: 'warning', message: 'Courses loaded from backup endpoint' });
        } else {
          throw new Error('Fallback also failed');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        const isFallbackCorsError = fallbackError.code === 'ERR_NETWORK' || fallbackError.message.includes('CORS') || fallbackError.message.includes('Network Error');
        
        setCourses([]); // Set empty array as final fallback
        
        if (isFallbackCorsError) {
          showToast({ 
            type: 'error', 
            message: 'Backend server is not running. Please start the server on http://localhost:5000' 
          });
        } else {
          showToast({ type: 'error', message: 'Failed to load courses. Please try again later.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    if (!user) return;
    
    try {
      // Use the correct academy endpoint for enrolled courses
      const response = await api.get('/academy/my-courses');
      if (response.data.success) {
        console.log('✅ Fetched enrolled courses:', response.data.data);
        // The academy endpoint returns the full course data, not just IDs
        const enrolledIds = response.data.data.map(course => course.id);
        setEnrolledCourses(enrolledIds);
        console.log('✅ Enrolled course IDs:', enrolledIds);
      }
    } catch (error) {
      console.error('❌ Error fetching enrolled courses:', error);
      showToast({ type: 'error', message: 'Failed to load enrolled courses' });
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const response = await api.get('/live-sessions');
      if (response.data.success) {
        setLiveSessions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
      showToast({ type: 'error', message: 'Failed to load live sessions' });
    }
  };

  const fetchUserProgress = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/academy/progress');
      if (response.data.success) {
        setUserProgress(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchCourses();
    fetchLiveSessions();
  }, []);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
      fetchUserProgress();
    }
  }, [user]);

  useEffect(() => {
    fetchCourses();
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (activeTab === 'manage-sessions' && isExpert() && user) {
      fetchInstructorCourses();
    }
  }, [activeTab, user]);

  const filteredCourses = courses.filter(course => {
    // Safe string operations with null checks
    const title = course.title || '';
    const instructor = course.instructor || '';
    const description = course.description || '';
    const category = course.category || '';
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEnrollCourse = async (courseId) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please login to enroll in courses' });
      return;
    }

    // Prevent experts from enrolling in courses
    if (isExpert()) {
      showToast({ 
        type: 'error', 
        message: 'As an expert, you can create and manage courses but cannot enroll as a student. Switch to a student account to enroll in courses.' 
      });
      return;
    }
    
    if (enrolledCourses.includes(courseId)) {
      showToast({ type: 'info', message: 'You are already enrolled in this course' });
      return;
    }

    try {
      // Use the correct academy enrollment endpoint
      const response = await api.post(`/academy/courses/${courseId}/enroll`);
      if (response.data.success) {
        setEnrolledCourses([...enrolledCourses, courseId]);
        showToast({ type: 'success', message: 'Successfully enrolled in course!' });
        // Refresh user progress and enrolled courses
        fetchUserProgress();
        fetchEnrolledCourses(); // Refresh the enrolled courses list
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      const message = error.response?.data?.message || 'Failed to enroll in course';
      showToast({ type: 'error', message });
    }
  };

  const handleJoinLiveSession = async (sessionId) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please login to join live sessions' });
      return;
    }

    // Prevent experts from joining live sessions as students
    if (isExpert()) {
      showToast({ 
        type: 'error', 
        message: 'As an expert, you can host and manage live sessions but cannot join as a student. Switch to a student account to join live sessions.' 
      });
      return;
    }
    
    try {
      const response = await api.post(`/live-sessions/${sessionId}/join`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Successfully joined live session!' });
        // Open meeting URL if provided
        if (response.data.meetingUrl) {
          window.open(response.data.meetingUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Join session error:', error);
      const message = error.response?.data?.message || 'Failed to join live session';
      showToast({ type: 'error', message });
    }
  };

  // Course creation handler
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!isExpert()) {
      showToast({ type: 'error', message: 'Only experts can create courses' });
      return;
    }

    if (!courseForm.title || !courseForm.description || !courseForm.category) {
      showToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setIsCreatingCourse(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsCreatingCourse(false);
      showToast({ type: 'error', message: 'Request timed out. Please check your connection and try again.' });
    }, 30000); // 30 second timeout
    
    try {
      // Log the data being sent for debugging
      console.log('🚀 Creating course with data:', JSON.stringify(courseForm, null, 2));
      
      // Prepare the course data ensuring proper data types
      const courseData = {
        ...courseForm,
        duration_weeks: parseInt(courseForm.duration_weeks) || 8,
        tags: Array.isArray(courseForm.tags) ? courseForm.tags : [],
        learning_objectives: Array.isArray(courseForm.learning_objectives) ? courseForm.learning_objectives : [],
        prerequisites: courseForm.prerequisites || ''
      };
      
      console.log('📤 Sending course data:', JSON.stringify(courseData, null, 2));
      
      // Add timeout to axios request
      const response = await api.post('/courses', courseData, {
        timeout: 30000 // 30 second request timeout
      });
      
      clearTimeout(timeoutId); // Clear timeout if request succeeds
      
      console.log('✅ Course creation response:', response.data);
      
      if (response.data && response.data.success) {
        showToast({ type: 'success', message: 'Course created successfully!' });
        // Reset form
        setCourseForm({
          title: '',
          description: '',
          category: '',
          duration_weeks: 8,
          level: 'beginner',
          price: 'Free',
          tags: [],
          prerequisites: '',
          learning_objectives: []
        });
        // Refresh courses list
        fetchCourses();
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout on error
      
      console.error('Course creation error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let message = 'Failed to create course';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        message = 'Request timed out. Please check your connection and try again.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message).join(', ');
        message = `Validation failed: ${errorMessages}`;
      } else if (error.response?.status === 401) {
        message = 'Please login to create courses';
      } else if (error.response?.status === 403) {
        message = 'You do not have permission to create courses. Please ensure you have expert privileges.';
      } else if (error.response?.status === 500) {
        message = 'Server error occurred. Please try again later.';
      } else if (!error.response) {
        message = 'Network error. Please check your connection and try again.';
      }
      
      showToast({ type: 'error', message });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  // Form field update handler
  const updateCourseForm = (field, value) => {
    setCourseForm(prev => ({ ...prev, [field]: value }));
  };

  // Session management handlers
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!isExpert()) {
      showToast({ type: 'error', message: 'Only experts can create live sessions' });
      return;
    }

    if (!sessionForm.title || !sessionForm.description || !sessionForm.date || !sessionForm.time) {
      showToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setIsCreatingSession(true);
    try {
      const sessionData = {
        ...sessionForm,
        scheduled_date: sessionForm.date,
        scheduled_time: sessionForm.time,
        duration_minutes: parseInt(sessionForm.duration_minutes) || 60,
        max_participants: parseInt(sessionForm.max_participants) || 50
      };

      const response = await api.post('/live-sessions', sessionData);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Live session scheduled successfully!' });
        // Reset form
        setSessionForm({
          title: '',
          description: '',
          date: '',
          time: '',
          duration_minutes: 60,
          max_participants: 50,
          meeting_url: ''
        });
        setShowSessionForm(false);
        // Refresh sessions list
        fetchLiveSessions();
      }
    } catch (error) {
      console.error('Session creation error:', error);
      const message = error.response?.data?.message || 'Failed to create live session';
      showToast({ type: 'error', message });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const updateSessionForm = (field, value) => {
    setSessionForm(prev => ({ ...prev, [field]: value }));
  };

  // Live session handlers for instructors
  const handleStartLiveSession = async (sessionId) => {
    if (!isExpert()) {
      showToast({ type: 'error', message: 'Only instructors can start live sessions' });
      return;
    }

    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        'Are you ready to start the live session? This will notify all enrolled students and registered participants.'
      );
      
      if (!confirmed) return;

      showToast({ type: 'info', message: 'Starting live session...' });
      
      const response = await api.patch(`/live-sessions/${sessionId}/start`, {
        // You can add meeting_url if you have one from an external service
        // meeting_url: 'your-meeting-url'
      });
      
      if (response.data.success) {
        showToast({ 
          type: 'success', 
          message: `Live session started! ${response.data.participants_notified || 0} participants notified.` 
        });
        
        // Refresh the live sessions to update the UI
        fetchLiveSessions();
        
        // Open the meeting URL if available
        if (response.data.data?.meeting_url) {
          window.open(response.data.data.meeting_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Start live session error:', error);
      const message = error.response?.data?.message || 'Failed to start live session';
      showToast({ type: 'error', message });
    }
  };

  const handleManageSession = async (sessionId) => {
    // For now, just show a placeholder - you can implement session management later
    showToast({ 
      type: 'info', 
      message: 'Session management panel coming soon!' 
    });
  };

  const handleRegisterForSession = async (sessionId) => {
    if (!user) {
      showToast({ type: 'error', message: 'Please login to register for sessions' });
      return;
    }

    if (isExpert()) {
      showToast({ type: 'error', message: 'Instructors cannot register as participants in sessions' });
      return;
    }

    try {
      const response = await api.post(`/live-sessions/${sessionId}/join`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Successfully registered for live session!' });
        // Refresh sessions to update participant count
        fetchLiveSessions();
      }
    } catch (error) {
      console.error('Register for session error:', error);
      const message = error.response?.data?.message || 'Failed to register for session';
      showToast({ type: 'error', message });
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const response = await api.post(`/live-sessions/${sessionId}/start`);
      if (response.data.success) {
        showToast({ type: 'success', message: 'Live session started!' });
        if (response.data.meetingUrl) {
          window.open(response.data.meetingUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Start session error:', error);
      const message = error.response?.data?.message || 'Failed to start session';
      showToast({ type: 'error', message });
    }
  };

  // Handle continue learning - show course content
  const handleContinueLearning = (course) => {
    setViewingCourse(course);
    setShowCourseContent(true);
  };

  // Open document viewer - simple version
  const openDocumentViewer = (doc) => {
    console.log('🔍 openDocumentViewer called with:', doc);
    console.log('🔍 Before setting state:', { showDocumentViewer, documentToView });
    setDocumentToView(doc);
    setShowDocumentViewer(true);
    console.log('🔍 After setting state calls');
  };

  // Close document viewer - simple version
  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setDocumentToView(null);
  };

  // Handle back from course content viewer
  const handleBackFromCourseContent = () => {
    setShowCourseContent(false);
    setViewingCourse(null);
  };

  const CourseCard = ({ course }) => {
    // Debug logging for instructor comparison
    if (process.env.NODE_ENV === 'development' && user) {
      console.log(`Course: ${course.title}`);
      console.log(`Course instructor_id: ${course.instructor_id}`);
      console.log(`User ID: ${user.id}`);
      console.log(`User type: ${user.userType}`);
      console.log(`Is instructor match: ${course.instructor_id === user.id}`);
    }
    
    return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
        <div className="relative">
          <img
          src={course.thumbnail_url && course.thumbnail_url !== '/images/default-course.jpg' 
            ? `${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}${course.thumbnail_url}`
            : course.image || '/api/placeholder/300/200'
          } 
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = '/api/placeholder/300/200';
          }}
        />
        <div className="absolute top-4 left-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            course.price === 'Free' || course.price === 0 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
          }`}>
            {course.price === 0 ? 'Free' : course.price}
          </span>
        </div>
        <div className="absolute top-4 right-4">
          <button className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
            <Bookmark size={16} className="text-gray-600" />
          </button>
        </div>
        </div>
        
        <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-blue-600 font-medium">{course.category}</span>
          <span className="text-sm text-gray-500">{course.level}</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
        
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <User size={14} />
            <span>{course.instructor}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <PlayCircle size={14} />
              <span>{course.lessons} lessons</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>{course.duration}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-sm font-medium">{course.rating}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-4">
          {course.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
              {tag}
            </span>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{course.enrolled.toLocaleString()} enrolled</span>
          {/* Only show enrollment button if user is not the instructor and not already enrolled */}
          {user && course.instructor_id !== user.id && (
            <button
              onClick={() => handleEnrollCourse(course.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                enrolledCourses.includes(course.id)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {enrolledCourses.includes(course.id) ? 'Enrolled' : 'Enroll Now'}
            </button>
          )}
          {/* Show "Your Course" label for instructors */}
          {user && course.instructor_id === user.id && (
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
              Your Course
            </span>
          )}
          {/* Show login prompt for non-logged users */}
          {!user && (
            <button
              onClick={() => showToast({ type: 'info', message: 'Please login to enroll in courses' })}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Login to Enroll
            </button>
          )}
        </div>
      </div>
    </div>
    );
  };

  const LiveSessionCard = ({ session }) => {
    const isInstructor = user && session.instructor.toLowerCase().includes(user.firstName?.toLowerCase());
    const canStart = isInstructor && session.status === 'scheduled';
    const isLive = session.status === 'active' || session.status === 'live';
    const isUpcoming = session.status === 'scheduled';
    
    return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">{session.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isLive ? 'bg-red-100 text-red-700 animate-pulse' :
                  isUpcoming ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {isLive ? '🔴 LIVE' : isUpcoming ? '📅 Scheduled' : session.status}
                </span>
              </div>
              
              <p className="text-gray-600 mb-2">by {session.instructor}</p>
              {session.courseTitle && (
                <p className="text-sm text-blue-600 mb-2">📚 {session.courseTitle}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{session.date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{session.time} ({session.duration})</span>
                </div>
              </div>
              
              {session.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{session.description}</p>
              )}
            </div>
            
            <div className="text-right ml-4">
              <div className="text-sm text-gray-500 mb-2">
                {session.participants || 0}/{session.maxParticipants} joined
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isLive ? 'bg-red-500' : 'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(((session.participants || 0) / session.maxParticipants) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Instructor Controls */}
            {isInstructor ? (
              <>
                {canStart && (
                  <button
                    onClick={() => handleStartLiveSession(session.id)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Video size={16} />
                    Start Live Session
                  </button>
                )}
                {isLive && (
                  <button
                    onClick={() => window.open(session.meetingUrl, '_blank')}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Video size={16} />
                    Join Your Session
                  </button>
                )}
                <button
                  onClick={() => handleManageSession(session.id)}
                  className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings size={16} />
                </button>
              </>
            ) : (
              /* Student Controls */
              <>
                {isLive ? (
                  <button
                    onClick={() => handleJoinLiveSession(session.id)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Video size={16} />
                    Join Live Session
                  </button>
                ) : isUpcoming ? (
                  <button
                    onClick={() => handleRegisterForSession(session.id)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Register to Join
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-gray-300 text-gray-500 py-2 px-4 rounded-lg cursor-not-allowed"
                  >
                    Session Ended
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Live indicator for active sessions */}
          {isLive && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <span className="font-medium">Session is currently live!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Show course content viewer if viewing a course
  if (showCourseContent && viewingCourse) {
    return (
      <CourseContentViewer 
        course={viewingCourse}
        onBack={handleBackFromCourseContent}
        user={user}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-green-600">SmartFarm Academy</h1>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-600 hover:text-gray-800">
                  <Bell size={20} />
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.firstName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <BookOpen size={64} className="mx-auto mb-4 opacity-90" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              SmartFarm Academy
            </h1>
            <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
              Empowering farmers with cutting-edge agricultural knowledge through expert-led courses, 
              live sessions, and comprehensive learning resources.
            </p>
            
            {user && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold">{userProgress.coursesCompleted}</div>
                  <div className="text-sm opacity-80">Courses Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userProgress.totalHoursLearned}</div>
                  <div className="text-sm opacity-80">Hours Learned</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userProgress.certificates}</div>
                  <div className="text-sm opacity-80">Certificates</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{userProgress.currentStreak}</div>
                  <div className="text-sm opacity-80">Day Streak</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="flex space-x-8 px-6 py-4 border-b">
            {/* Common tabs for all users */}
            {[
              { key: 'courses', label: 'All Courses', icon: BookOpen },
              ...(isStudent() ? [{ key: 'enrolled', label: 'My Courses', icon: User }] : []),
              ...(isExpert() ? [{ key: 'my-courses', label: 'My Courses', icon: Settings }] : []),
              { key: 'live', label: 'Live Sessions', icon: Video },
              ...(isStudent() ? [{ key: 'progress', label: 'Progress', icon: TrendingUp }] : [])
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
            
            {/* Expert-only tabs */}
            {isExpert() && [
              { key: 'create-course', label: 'Create Course', icon: Plus },
              { key: 'manage-sessions', label: 'Manage Sessions', icon: Users },
              { key: 'documents', label: 'Upload Documents', icon: Download }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
          
          {/* Role indicator */}
          {user && (
            <div className="px-6 py-2 bg-gray-50 border-t text-sm text-gray-600">
              <span className="font-medium">Role: </span>
              <span className={`px-2 py-1 rounded-md text-xs ${
                isExpert() 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isExpert() ? '👨‍🏫 Expert' : '🎓 Student'} ({user.userType})
              </span>
              {isExpert() && (
                <span className="ml-2 text-xs text-gray-500">
                  You can create courses, manage sessions, and upload documents
                </span>
              )}
            </div>
          )}
        </div>

        {/* Search and Filter */}
        {(activeTab === 'courses' || activeTab === 'enrolled') && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses, instructors, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="academy-search w-full pl-10 pr-4 py-2 rounded-lg"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="academy-select px-4 py-2 rounded-lg"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'my-courses' && isExpert() && (
          <CourseManagement />
        )}

        {/* TEST: Document Viewer Button - Remove this later */}
        {activeTab === 'courses' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 mb-2">Debug Info: showDocumentViewer = {showDocumentViewer.toString()}, documentToView = {documentToView ? 'exists' : 'null'}</p>
            <button
              onClick={() => {
                console.log('🚀 Test button clicked!');
                openDocumentViewer({
                  id: 'test-doc-1',
                  title: 'Test Document - Farming Techniques',
                  content: `
                    <h2>Introduction to Modern Farming</h2>
                    <p>This is a test document to verify the document viewer is working properly.</p>
                    <h3>Key Topics:</h3>
                    <ul>
                      <li>Soil management</li>
                      <li>Crop rotation</li>
                      <li>Sustainable practices</li>
                    </ul>
                    <blockquote>
                      <p>"The best time to plant a tree was 20 years ago. The second best time is now." - Chinese Proverb</p>
                    </blockquote>
                    <p>This document demonstrates how the viewer handles different HTML elements and formatting.</p>
                  `,
                  author: 'Dr. Jane Smith',
                  date: 'January 15, 2024'
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🧪 Test Document Viewer
            </button>
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Courses ({filteredCourses.length})
              </h2>
              <div className="text-sm text-gray-500">
                Showing {filteredCourses.length} of {courses.length} courses
              </div>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-300"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                        <div className="h-8 bg-gray-300 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
                
                {filteredCourses.length === 0 && (
                  <div className="text-center py-16">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'enrolled' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Enrolled Courses</h2>
              <p className="text-gray-600">Continue your learning journey</p>
            </div>
            
            {enrolledCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses
                  .filter(course => enrolledCourses.includes(course.id))
                  .map(course => (
                    <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                      <CourseCard course={course} />
                      <div className="p-4 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-medium text-green-600">65%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button 
                            onClick={() => handleContinueLearning(course)}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-green-700 transition-colors"
                          >
                            Continue Learning
                          </button>
                          <button className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled courses</h3>
                <p className="text-gray-500 mb-4">Start learning by enrolling in a course</p>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Browse Courses
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Sessions</h2>
              <p className="text-gray-600">Join real-time learning sessions with expert instructors</p>
            </div>
            
            <div className="space-y-6">
              {liveSessions.map(session => (
                <LiveSessionCard key={session.id} session={session} />
              ))}
            </div>
            
            {liveSessions.length === 0 && (
              <div className="text-center py-16">
                <Video size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming live sessions</h3>
                <p className="text-gray-500">Check back later for scheduled sessions</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning Progress</h2>
              <p className="text-gray-600">Track your educational journey and achievements</p>
            </div>
            
            {user ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Progress Cards */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Courses Completed</h3>
                    <Award className="text-yellow-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">{userProgress.coursesCompleted}</div>
                  <p className="text-gray-600 text-sm">Total courses finished</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Learning Hours</h3>
                    <Clock className="text-blue-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">{userProgress.totalHoursLearned}</div>
                  <p className="text-gray-600 text-sm">Hours of learning content</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Current Streak</h3>
                    <TrendingUp className="text-orange-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">{userProgress.currentStreak}</div>
                  <p className="text-gray-600 text-sm">Consecutive learning days</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Login to track progress</h3>
                <p className="text-gray-500">Sign in to see your learning statistics and achievements</p>
              </div>
            )}
          </div>
        )}

        {/* Expert-only sections */}
        {activeTab === 'create-course' && isExpert() && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Course</h2>
              <p className="text-gray-600">Design and publish educational content for students</p>
            </div>
            
            <CourseForm 
              categories={categories}
              onSuccess={(course) => {
                showToast({ type: 'success', message: 'Course created successfully!' });
                fetchCourses(); // Refresh courses
                setActiveTab('my-courses'); // Switch to my courses tab
              }}
            />
          </div>
        )}

        {activeTab === 'manage-sessions' && isExpert() && (
          <div>
            {/* Course Selection View */}
            {sessionManagementView === 'courses' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Sessions</h2>
                  <p className="text-gray-600">Select a course to create sessions, upload content, or start live teaching</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    console.log('=== DEBUGGING SESSION MANAGEMENT FILTER ===');
                    console.log('Debug - User object:', user);
                    console.log('Debug - User ID:', user?.id, 'Type:', typeof user?.id);
                    console.log('Debug - User type:', user?.userType);
                    console.log('Debug - isExpert():', isExpert());
                    console.log('Debug - Total courses:', courses.length);
                    
                    if (courses.length > 0) {
                      console.log('Debug - Sample course structure:', courses[0]);
                    }
                    
                    // First try using the dedicated instructor courses API
                    if (instructorCourses && instructorCourses.length > 0) {
                      console.log('Using instructor courses from dedicated API:', instructorCourses);
                      // Filter for published courses only
                      const publishedInstructorCourses = instructorCourses.filter(course => 
                        course.status === 'published'
                      );
                      console.log('Published instructor courses:', publishedInstructorCourses.length);
                      return publishedInstructorCourses;
                    }
                    
                    // Fallback: Flexible filtering that handles multiple possible field names and type mismatches
                    const instructorCoursesFiltered = courses.filter(course => {
                      if (!user?.id) return false;
                      
                      // Only show published courses in session management
                      // If status is not set, assume it's published for backward compatibility
                      if (course.status && course.status !== 'published') {
                        console.log(`Excluding draft course: ${course.title} (status: ${course.status})`);
                        return false;
                      }
                      
                      const userId = String(user.id); // Convert to string for comparison
                      const userIdNum = Number(user.id); // Also try numeric comparison
                      
                      // Try multiple possible instructor identification fields
                      const possibleIds = [
                        course.instructor_id,
                        course.expert_id,
                        course.created_by,
                        course.user_id,
                        course.author_id
                      ].filter(Boolean);
                      
                      // Check both string and numeric matches
                      const matches = possibleIds.some(id => {
                        return String(id) === userId || Number(id) === userIdNum || id === user.id;
                      });
                      
                      console.log(`Course "${course.title}":`, {
                        instructor_id: course.instructor_id,
                        expert_id: course.expert_id,
                        created_by: course.created_by,
                        user_id: course.user_id,
                        author_id: course.author_id,
                        possibleIds,
                        userId,
                        userIdNum,
                        actualUserId: user.id,
                        status: course.status,
                        matches
                      });
                      
                      return matches;
                    });
                    
                    console.log('Debug - Instructor courses found:', instructorCoursesFiltered.length);
                    console.log('Debug - Filtered instructor courses:', instructorCoursesFiltered);
                    console.log('=== END DEBUG ===');
                    return instructorCoursesFiltered;
                  })().map(course => (
                    <div key={course.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                         onClick={() => {
                           setSelectedCourseForSession(course);
                           setSessionManagementView('session-options');
                         }}>
                      <div className="relative">
                        <img
                          src={course.thumbnail_url && course.thumbnail_url !== '/images/default-course.jpg' 
                            ? `${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}${course.thumbnail_url}`
                            : course.image || '/api/placeholder/300/200'
                          } 
                          alt={course.title}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/300/200';
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                            Your Course
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <span>{course.enrolled} students</span>
                          <span>{course.duration}</span>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <ChevronRight size={20} className="text-green-600" />
                          <span className="text-green-600 font-medium ml-1">Manage Sessions</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {(() => {
                    // Use the exact same filtering logic as the course display above
                    // First try using the dedicated instructor courses API
                    if (instructorCourses && instructorCourses.length > 0) {
                      // Filter for published courses only
                      const publishedInstructorCourses = instructorCourses.filter(course => 
                        course.status === 'published'
                      );
                      return publishedInstructorCourses.length === 0;
                    }
                    
                    // Fallback: Flexible filtering that handles multiple possible field names and type mismatches
                    const instructorCoursesFiltered = courses.filter(course => {
                      if (!user?.id) return false;
                      
                      // Only show published courses in session management
                      if (course.status !== 'published') {
                        return false;
                      }
                      
                      const userId = String(user.id); // Convert to string for comparison
                      const userIdNum = Number(user.id); // Also try numeric comparison
                      
                      // Try multiple possible instructor identification fields
                      const possibleIds = [
                        course.instructor_id,
                        course.expert_id,
                        course.created_by,
                        course.user_id,
                        course.author_id
                      ].filter(Boolean);
                      
                      // Check both string and numeric matches
                      const matches = possibleIds.some(id => {
                        return String(id) === userId || Number(id) === userIdNum || id === user.id;
                      });
                      
                      return matches;
                    });
                    
                    return instructorCoursesFiltered.length === 0;
                  })() && (
                  <div className="text-center py-16">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No published courses found</h3>
                    <p className="text-gray-500">You need to have published courses to manage sessions</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Session Options View */}
            {sessionManagementView === 'session-options' && selectedCourseForSession && (
              <div>
                <div className="mb-6">
                  <button 
                    onClick={() => {
                      setSessionManagementView('courses');
                      setSelectedCourseForSession(null);
                    }}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
                  >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Courses
                  </button>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCourseForSession.title}</h2>
                  <p className="text-gray-600">Choose how you want to create educational content for your students</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Host Live Now */}
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 cursor-pointer group"
                       onClick={() => handleSessionTypeSelect('live-now')}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                        <Video size={32} className="text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Host Live Now</h3>
                      <p className="text-gray-600 text-sm mb-4">Start an immediate live session for your students</p>
                      <div className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                        🔴 Go Live Instantly
                      </div>
                    </div>
                  </div>
                  
                  {/* Schedule for Later */}
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 cursor-pointer group"
                       onClick={() => handleSessionTypeSelect('schedule')}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                        <Calendar size={32} className="text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Schedule for Later</h3>
                      <p className="text-gray-600 text-sm mb-4">Plan and schedule a live session for a specific date and time</p>
                      <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        📅 Plan Ahead
                      </div>
                    </div>
                  </div>
                  
                  {/* Upload Video */}
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 cursor-pointer group"
                       onClick={() => setSessionManagementView('upload')}>                 
                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                        <PlayCircle size={32} className="text-purple-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Video</h3>
                      <p className="text-gray-600 text-sm mb-4">Upload pre-recorded video content for students to watch anytime</p>
                      <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                        🎥 Video Content
                      </div>
                    </div>
                  </div>
                  
                  {/* Upload Audio */}
                  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 cursor-pointer group"
                       onClick={() => setSessionManagementView('upload')}>                 
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                        <MessageCircle size={32} className="text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Audio</h3>
                      <p className="text-gray-600 text-sm mb-4">Share audio lectures or podcasts for on-the-go learning</p>
                      <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                        🎵 Audio Content
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Schedule Session View */}
            {sessionManagementView === 'schedule' && selectedCourseForSession && (
              <div>
                <div className="mb-6">
                  <button 
                    onClick={() => setSessionManagementView('session-options')}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
                  >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Options
                  </button>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Live Session</h2>
                  <p className="text-gray-600">Plan a live session for: <span className="font-medium text-gray-900">{selectedCourseForSession.title}</span></p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const sessionData = {
                      title: formData.get('title'),
                      description: formData.get('description'),
                      scheduled_date: formData.get('date'),
                      scheduled_time: formData.get('time'),
                      duration_minutes: parseInt(formData.get('duration_minutes')),
                      max_participants: parseInt(formData.get('max_participants')),
                      meeting_url: formData.get('meeting_url')
                    };
                    handleScheduleSession(sessionData);
                  }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
                      <input 
                        name="title"
                        type="text"
                        defaultValue={`Live Session: ${selectedCourseForSession.title}`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter session title..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input 
                        name="date"
                        type="date"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                      <input 
                        name="time"
                        type="time"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <select 
                        name="duration_minutes"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                      <input 
                        name="max_participants"
                        type="number"
                        defaultValue={100}
                        min="1"
                        max="500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meeting URL (optional)</label>
                      <input 
                        name="meeting_url"
                        type="url"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea 
                        name="description"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Describe what this session will cover..."
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2 flex space-x-3">
                      <button 
                        type="button"
                        onClick={() => setSessionManagementView('session-options')}
                        className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Schedule Session
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Upload Content View */}
            {sessionManagementView === 'upload' && selectedCourseForSession && (
              <div>
                <div className="mb-6">
                  <button 
                    onClick={() => setSessionManagementView('session-options')}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
                  >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Options
                  </button>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Content</h2>
                  <p className="text-gray-600">Upload video or audio content for: <span className="font-medium text-gray-900">{selectedCourseForSession.title}</span></p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Video Upload */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <PlayCircle size={24} className="text-purple-600 mr-2" />
                      Upload Video
                    </h3>
                    
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center mb-4">
                      <PlayCircle size={48} className="mx-auto text-purple-400 mb-4" />
                      <p className="text-gray-600 mb-4">Drag and drop video files here, or click to browse</p>
                      <input 
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setUploadFile(file);
                            handleFileUpload(file, 'video');
                          }
                        }}
                        className="hidden"
                        id="video-upload"
                      />
                      <label 
                        htmlFor="video-upload"
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer inline-block"
                      >
                        Choose Video File
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Supported: MP4, AVI, MOV (Max: 500MB)</p>
                    </div>
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Audio Upload */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <MessageCircle size={24} className="text-green-600 mr-2" />
                      Upload Audio
                    </h3>
                    
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center mb-4">
                      <MessageCircle size={48} className="mx-auto text-green-400 mb-4" />
                      <p className="text-gray-600 mb-4">Drag and drop audio files here, or click to browse</p>
                      <input 
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setUploadFile(file);
                            handleFileUpload(file, 'audio');
                          }
                        }}
                        className="hidden"
                        id="audio-upload"
                      />
                      <label 
                        htmlFor="audio-upload"
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors cursor-pointer inline-block"
                      >
                        Choose Audio File
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Supported: MP3, WAV, M4A (Max: 100MB)</p>
                    </div>
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && isExpert() && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Course Documents</h2>
              <p className="text-gray-600">Share educational materials and resources with students</p>
            </div>
            
            <DocumentUploadForm user={user} courses={courses} />
          </div>
        )}
      </div>

      {/* Simple Document Viewer Modal */}
      {console.log('🔍 Render check:', { showDocumentViewer, documentToView: !!documentToView })}
      {showDocumentViewer && documentToView && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {documentToView.title || 'Document'}
                  </h2>
                </div>
                <button
                  onClick={closeDocumentViewer}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Content */}
              <div className="overflow-auto max-h-[calc(90vh-120px)] p-6">
                <div className="prose prose-green max-w-none">
                  {documentToView.content ? (
                    <div dangerouslySetInnerHTML={{ __html: documentToView.content }} />
                  ) : (
                    <div className="text-center py-12">
                      <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500 mb-4">No content available to display.</p>
                      {documentToView.url && (
                        <a 
                          href={documentToView.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Download size={16} />
                          Open Externally
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-500">
                  {documentToView.author && <span>By {documentToView.author}</span>}
                  {documentToView.author && documentToView.date && <span> • </span>}
                  {documentToView.date && <span>{documentToView.date}</span>}
                </div>
                <button
                  onClick={closeDocumentViewer}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademyPage;
