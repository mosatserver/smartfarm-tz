import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';
import './CourseContentViewer.css';

const CourseContentViewer = ({ course, onBack, user }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [courseContent, setCourseContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [contentStats, setContentStats] = useState({
    totalItems: 0,
    completedItems: 0,
    totalDuration: 0,
    progressPercentage: 0
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const mediaRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hasAutoCompletedRef = useRef(false);

  // Helper to build absolute/relative URLs depending on env
  const buildUrl = (path) => {
    if (!path) return '';
    const prefix = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
    return `${prefix}${path}`;
  };

  // Fetch course content and materials
  const fetchCourseContent = async () => {
    setLoading(true);
    try {
      // Fetch course contents (lessons, videos, documents, etc.)
      const response = await api.get(`/academy/courses/${course.id}/content`);
      if (response.data.success) {
        // Handle the correct structure from backend (content is nested inside data)
        const contentData = response.data.data;
        const content = contentData?.content || [];
        setCourseContent(content);
        
        // Calculate stats (backend returns duration in seconds, convert to minutes)
        const stats = {
          totalItems: content.length,
          completedItems: content.filter(item => item.completed || userProgress[item.id]?.completed).length,
          totalDuration: content.reduce((total, item) => total + Math.round((item.duration || 0) / 60), 0),
          progressPercentage: content.length > 0 ? 
            Math.round((content.filter(item => item.completed || userProgress[item.id]?.completed).length / content.length) * 100) : 0
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

  // Fetch user progress for this course
  const fetchUserProgress = async () => {
    try {
      // Use the global progress endpoint instead of the course-specific one
      const response = await api.get(`/academy/progress`);
      if (response.data.success) {
        setUserProgress(response.data.data || {});
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  // Mark content as completed
  const markContentCompleted = async (contentId) => {
    try {
      const response = await api.post(`/academy/courses/${course.id}/content/${contentId}/complete`);
      if (response.data.success) {
        setUserProgress(prev => ({
          ...prev,
          [contentId]: { completed: true, completedAt: new Date().toISOString() }
        }));
        showToast({ type: 'success', message: 'Content marked as completed!' });
        fetchUserProgress(); // Refresh progress
      }
    } catch (error) {
      console.error('Error marking content as completed:', error);
      showToast({ type: 'error', message: 'Failed to update progress' });
    }
  };

  useEffect(() => {
    if (course?.id) {
      fetchCourseContent();
      fetchUserProgress();
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

  // Media player controls
  const playMedia = () => {
    if (mediaRef.current) {
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const pauseMedia = () => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseMedia();
    } else {
      playMedia();
    }
  }, [isPlaying]);


  // Keep element volume in sync with state (covers mute button etc.)
  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.volume = volume;
    }
  }, [volume, showPlayer]);

  // Track fullscreen changes to reflect actual state
  useEffect(() => {
    const onFsChange = () => {
      const fsElement = document.fullscreenElement;
      setIsFullscreen(!!fsElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard controls for media player (simplified approach)
  useEffect(() => {
    if (!showPlayer) return;

    const handleKeyPress = (e) => {
      if (!mediaRef.current) return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (isPlaying) {
            mediaRef.current.pause();
          } else {
            mediaRef.current.play();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          mediaRef.current.currentTime = Math.min(mediaRef.current.duration || 0, mediaRef.current.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          const newVolUp = Math.min(1, volume + 0.1);
          setVolume(newVolUp);
          mediaRef.current.volume = newVolUp;
          break;
        case 'ArrowDown':
          e.preventDefault();
          const newVolDown = Math.max(0, volume - 0.1);
          setVolume(newVolDown);
          mediaRef.current.volume = newVolDown;
          break;
        case 'Escape':
          e.preventDefault();
          mediaRef.current.pause();
          setShowPlayer(false);
          setCurrentlyPlaying(null);
          setCurrentTime(0);
          setDuration(0);
          setIsLoading(false);
          setHasError(false);
          hasAutoCompletedRef.current = false;
          break;
        case 'f':
          if (currentlyPlaying?.contentType?.toLowerCase() === 'video') {
            e.preventDefault();
            if (!isFullscreen && playerContainerRef.current?.requestFullscreen) {
              playerContainerRef.current.requestFullscreen();
            } else if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showPlayer, isPlaying, volume, currentlyPlaying, isFullscreen]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const ct = mediaRef.current.currentTime;
      const dur = mediaRef.current.duration || 0;
      setCurrentTime(ct);

      // Auto-mark complete at 90% watched/listened, only once per item
      if (
        dur > 0 &&
        currentlyPlaying?.id &&
        !hasAutoCompletedRef.current &&
        (ct / dur) >= 0.9 &&
        !userProgress[currentlyPlaying.id]?.completed
      ) {
        hasAutoCompletedRef.current = true;
        markContentCompleted(currentlyPlaying.id);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setIsLoading(false);
      setHasError(false);
      // Ensure element volume matches state on load
      mediaRef.current.volume = volume;
      // Autoplay when metadata loads for smoother start
      mediaRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    setIsPlaying(false);
    showToast({ type: 'error', message: 'Failed to load media file' });
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (mediaRef.current) {
      mediaRef.current.currentTime = seekTime;
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && playerContainerRef.current) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Get next/previous content for playlist navigation
  const getPlaylistNavigation = () => {
    if (!currentlyPlaying || !courseContent.length) return { prev: null, next: null };
    
    const mediaContent = courseContent.filter(item => 
      ['video', 'audio'].includes(item.contentType?.toLowerCase())
    );
    
    const currentIndex = mediaContent.findIndex(item => item.id === currentlyPlaying.id);
    
    return {
      prev: currentIndex > 0 ? mediaContent[currentIndex - 1] : null,
      next: currentIndex < mediaContent.length - 1 ? mediaContent[currentIndex + 1] : null
    };
  };

  const playNextContent = () => {
    const { next } = getPlaylistNavigation();
    if (next) {
      handleContentClick(next);
    }
  };

  const playPrevContent = () => {
    const { prev } = getPlaylistNavigation();
    if (prev) {
      handleContentClick(prev);
    }
  };

  const closePlayer = () => {
    pauseMedia();
    setShowPlayer(false);
    setCurrentlyPlaying(null);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(false);
    setHasError(false);
    hasAutoCompletedRef.current = false;
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setCurrentDocument(null);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle content click
  const handleContentClick = (content) => {
    setSelectedContent(content);
    
    // For different content types, handle differently (use contentType from backend)
    switch (content.contentType?.toLowerCase()) {
      case 'video':
      case 'audio':
        // Play inline media
        if (content.fileUrl) {
          setCurrentlyPlaying(content);
          setShowPlayer(true);
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          setIsLoading(true);
          setHasError(false);
          hasAutoCompletedRef.current = false;
        }
        break;
      case 'document':
      case 'pdf':
        // Show document inline
        if (content.fileUrl) {
          setCurrentDocument(content);
          setShowDocumentViewer(true);
        }
        break;
      case 'live_session':
        // Handle live session
        if (content.meeting_url) {
          window.open(content.meeting_url, '_blank');
        } else {
          showToast({ type: 'info', message: 'Live session link will be available when the session starts' });
        }
        break;
      default:
        showToast({ type: 'info', message: 'Content will open shortly' });
    }
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
              <span>Back to My Courses</span>
            </button>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Progress: {contentStats.progressPercentage}% Complete
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${contentStats.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Info Header */}
      <div className="bg-gradient-to-br from-green-600 to-blue-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start space-x-6">
            <img
              src={course.thumbnail_url && course.thumbnail_url !== '/images/default-course.jpg' 
                ? `${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}${course.thumbnail_url}`
                : course.image || '/api/placeholder/300/200'
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
                  <User size={16} />
                  <span>{course.instructor}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen size={16} />
                  <span>{contentStats.totalItems} Items</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={16} />
                  <span>{Math.round(contentStats.totalDuration / 60)}h {contentStats.totalDuration % 60}m</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle size={16} />
                  <span>{contentStats.completedItems}/{contentStats.totalItems} Completed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Content</h2>
          <p className="text-gray-600">Click on any item to view or access the content</p>
        </div>

        {courseContent.length > 0 ? (
          <div className="space-y-4">
            {courseContent.map((content, index) => {
              const isCompleted = content.completed || userProgress[content.id]?.completed;
              return (
                <div
                  key={content.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => handleContentClick(content)}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Content Number */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? <CheckCircle size={16} /> : index + 1}
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
                                {Math.round(content.duration / 60)}m
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

                        {/* Content Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="flex items-center space-x-4">
                            {content.fileSize && (
                              <span className="text-xs text-gray-500">
                                {(content.fileSize / (1024 * 1024)).toFixed(1)} MB
                              </span>
                            )}
                            {content.viewCount && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Eye size={12} />
                                <span>{content.viewCount} views</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {content.fileUrl && (
                              <button 
                                className="text-blue-600 hover:text-blue-800 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (content.fileUrl) {
                                    window.open(buildUrl(content.fileUrl), '_blank');
                                  }
                                }}
                                title="Download"
                              >
                                <Download size={16} />
                              </button>
                            )}
                            
                            {!isCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markContentCompleted(content.id);
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Mark Complete
                              </button>
                            )}
                            
                            {isCompleted && (
                              <span className="text-green-600 text-sm font-medium flex items-center">
                                <CheckCircle size={16} className="mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content available</h3>
            <p className="text-gray-500">
              The instructor hasn't uploaded any content for this course yet.
            </p>
          </div>
        )}
      </div>

      {/* Inline Media Player Modal */}
      {showPlayer && currentlyPlaying && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div 
            ref={playerContainerRef}
            className={`bg-white rounded-lg shadow-2xl ${isFullscreen ? 'w-full h-full' : 'max-w-4xl max-h-[80vh] w-full mx-4'}`}
          >
            {/* Player Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                {currentlyPlaying.contentType?.toLowerCase() === 'audio' ? (
                  <Headphones size={24} className="text-purple-500" />
                ) : (
                  <Video size={24} className="text-red-500" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{currentlyPlaying.title}</h3>
                  <p className="text-sm text-gray-600">
                    {getContentTypeLabel(currentlyPlaying.contentType)}
                  </p>
                </div>
              </div>
                <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                  title="Keyboard Shortcuts"
                >
                  <HelpCircle size={20} />
                  {showKeyboardHelp && (
                    <div className="absolute top-full right-0 mt-2 bg-gray-800 text-white text-xs rounded-lg p-3 w-64 z-50">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Space/K:</span>
                          <span>Play/Pause</span>
                        </div>
                        <div className="flex justify-between">
                          <span>← →:</span>
                          <span>Seek ±10s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>↑ ↓:</span>
                          <span>Volume ±10%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>F:</span>
                          <span>Fullscreen (Video)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Esc:</span>
                          <span>Close Player</span>
                        </div>
                        <div className="flex justify-between">
                          <span>N:</span>
                          <span>Next Item</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P:</span>
                          <span>Previous Item</span>
                        </div>
                      </div>
                    </div>
                  )}
                </button>
                {currentlyPlaying.contentType?.toLowerCase() === 'video' && (
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Fullscreen (F)"
                  >
                    <Maximize size={20} />
                  </button>
                )}
                <button
                  onClick={closePlayer}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Close (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Media Element */}
            <div className="relative">
              {isLoading && (
                <div className="media-loading">
                  Loading...
                </div>
              )}
              {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                  <div className="text-center">
                    <p className="mb-2">Failed to load media</p>
                    <button 
                      onClick={() => {
                        if (mediaRef.current) {
                          mediaRef.current.load();
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
              {currentlyPlaying.contentType?.toLowerCase() === 'video' ? (
                <video
                  ref={mediaRef}
                  className="w-full h-auto max-h-[60vh]"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onLoadStart={handleLoadStart}
                  onError={handleError}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (currentlyPlaying?.id && !userProgress[currentlyPlaying.id]?.completed) {
                      markContentCompleted(currentlyPlaying.id);
                    }
                    // Auto-play next item if available
                    const { next } = getPlaylistNavigation();
                    if (next) {
                      setTimeout(() => playNextContent(), 1000);
                    }
                  }}
                  controls={false}
                  autoPlay
                >
                  <source src={buildUrl(currentlyPlaying.fileUrl)} />
                  Your browser does not support the video element.
                </video>
              ) : (
                <div className={`flex items-center justify-center h-48 audio-visualizer ${isPlaying ? 'playing' : ''}`}>
                  <audio
                    ref={mediaRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadStart={handleLoadStart}
                    onError={handleError}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (currentlyPlaying?.id && !userProgress[currentlyPlaying.id]?.completed) {
                        markContentCompleted(currentlyPlaying.id);
                      }
                      // Auto-play next item if available
                      const { next } = getPlaylistNavigation();
                      if (next) {
                        setTimeout(() => playNextContent(), 1000);
                      }
                    }}
                    autoPlay
                  >
                    <source src={buildUrl(currentlyPlaying.fileUrl)} />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="text-center relative z-10">
                    <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                      <Headphones size={48} className="text-white" />
                    </div>
                    <p className="text-white font-medium">Audio Content</p>
                  </div>
                </div>
              )}
            </div>

            {/* Media Controls */}
            <div className="p-4 bg-gray-50 rounded-b-lg">
              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    backgroundSize: `${duration ? (currentTime / duration) * 100 : 0}% 100%`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlayPause}
                    className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const newVol = volume === 0 ? 1 : 0;
                        setVolume(newVol);
                        if (mediaRef.current) mediaRef.current.volume = newVol;
                      }}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Media Info */}
                <div className="text-sm text-gray-600">
                  {currentlyPlaying.fileSize && (
                    <span>{(currentlyPlaying.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Document Viewer Modal */}
      {showDocumentViewer && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
            {/* Document Viewer Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <FileText size={24} className="text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{currentDocument.title}</h3>
                  <p className="text-sm text-gray-600">
                    {getContentTypeLabel(currentDocument.contentType)} • {(currentDocument.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {currentDocument.fileUrl && (
                  <button
                    onClick={() => window.open(buildUrl(currentDocument.fileUrl), '_blank')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Open in New Tab"
                  >
                    <Download size={20} />
                  </button>
                )}
                <button
                  onClick={closeDocumentViewer}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 p-4 overflow-hidden">
              <div className="h-full w-full border rounded-lg overflow-hidden bg-gray-50">
                {currentDocument.fileName?.toLowerCase().endsWith('.pdf') || currentDocument.contentType?.toLowerCase() === 'pdf' ? (
                  // PDF Viewer using iframe
                  <iframe
                    src={buildUrl(currentDocument.fileUrl)}
                    className="w-full h-full"
                    title={currentDocument.title}
                    frameBorder="0"
                  />
                ) : (
                  // Other document types - show preview or download option
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <FileText size={64} className="text-blue-500 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {currentDocument.title}
                    </h4>
                    <p className="text-gray-600 mb-4">
                      This document type cannot be previewed inline.
                    </p>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => window.open(buildUrl(currentDocument.fileUrl), '_blank')}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={16} />
                        <span>Open in New Tab</span>
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = buildUrl(currentDocument.fileUrl);
                          link.download = currentDocument.fileName || currentDocument.title;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Download size={16} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Actions Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Type: {getContentTypeLabel(currentDocument.contentType)}</span>
                  <span>•</span>
                  <span>Size: {(currentDocument.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                  {currentDocument.uploadedAt && (
                    <>
                      <span>•</span>
                      <span>Uploaded: {new Date(currentDocument.uploadedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {!userProgress[currentDocument.id]?.completed && (
                    <button
                      onClick={() => {
                        markContentCompleted(currentDocument.id);
                        showToast({ type: 'success', message: 'Document marked as completed!' });
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  {userProgress[currentDocument.id]?.completed && (
                    <span className="text-green-600 text-sm font-medium flex items-center">
                      <CheckCircle size={16} className="mr-1" />
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseContentViewer;
