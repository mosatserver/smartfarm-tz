import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Webcam from 'react-webcam';
import {
  ArrowLeft,
  Upload,
  Camera,
  X,
  Loader,
  CheckCircle,
  AlertCircle,
  History,
  Globe,
  FileImage,
  Zap
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import axiosConfig from '../utils/axiosConfig';
import landing1 from '../images/landing1.jpg';
import landing2 from '../images/landing2.jpg';
import landing3 from '../images/landing3.jpg';
import landing4 from '../images/landing4.jpg';
import landing5 from '../images/landing5.jpg';

const DiseaseDiagnosisPage = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [plantIdentification, setPlantIdentification] = useState(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showCorrectName, setShowCorrectName] = useState(false);
  const [correctPlantName, setCorrectPlantName] = useState('');
  const [isTeaching, setIsTeaching] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const bgImages = [landing1, landing2, landing3, landing4, landing5];

  // Background slideshow effect - matching landing page
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % bgImages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [bgImages.length]);

  // Language switching
  const switchLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  // Fetch analysis history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosConfig.get('/crop-health/history');
      setAnalysisHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user && showHistory) {
      fetchHistory();
    }
  }, [fetchHistory, user, showHistory]);

  // File validation
  const validateFile = (file) => {
    // Support all common image formats
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/tif',
      'image/svg+xml',
      'image/avif',
      'image/heic',
      'image/heif'
    ];
    const maxSize = 10 * 1024 * 1024; // Increased to 10MB for better format support

    if (!validTypes.includes(file.type)) {
      showToast(t('invalid_file') || 'Please select a valid image file (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC)', 'error');
      return false;
    }

    if (file.size > maxSize) {
      showToast(t('file_too_large') || 'File size too large. Maximum 10MB allowed', 'error');
      return false;
    }

    return true;
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && validateFile(file)) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setAnalysisResult(null);
      setPlantIdentification(null);
      showToast(t('image_uploaded'), 'success');
    }
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        setAnalysisResult(null);
        setPlantIdentification(null);
        showToast(t('image_uploaded'), 'success');
      }
    }
  };

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setImagePreview(imageSrc);
      // Convert base64 to file
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          setSelectedImage(file);
        });
      setShowCamera(false);
      setAnalysisResult(null);
      setPlantIdentification(null);
      showToast(t('image_uploaded'), 'success');
    }
  }, [showToast, t]);

  // Analyze plant health
  const analyzeImage = async () => {
    console.log('🔍 Starting plant health analysis...');
    console.log('User:', user);
    console.log('Selected image:', selectedImage);
    
    if (!selectedImage) {
      console.log('❌ No image selected');
      showToast('Please select an image first', 'error');
      return;
    }

    if (!user) {
      console.log('❌ User not logged in');
      showToast('Please login to analyze plant health', 'error');
      return;
    }

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('lang', i18n.language);

    console.log('📤 Sending analysis request...');
    
    try {
      const response = await axiosConfig.post('/crop-health/analyze', formData, {
        timeout: 60000, // 60 seconds timeout for this specific request
      });

      console.log('✅ Analysis response:', response.data);
      setAnalysisResult(response.data);
      showToast('Analysis completed successfully!', 'success');
      if (showHistory) {
        fetchHistory(); // Refresh history
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        showToast('Please login to analyze plant health', 'error');
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.message || 'Invalid image file', 'error');
      } else {
        showToast('Analysis failed. Please try again.', 'error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Identify plant from image
  const identifyPlant = async () => {
    console.log('🌱 Starting plant identification...');
    console.log('User:', user);
    console.log('Selected image:', selectedImage);
    
    if (!selectedImage) {
      console.log('❌ No image selected');
      showToast('Please select an image first', 'error');
      return;
    }

    if (!user) {
      console.log('❌ User not logged in');
      showToast('Please login to identify plants', 'error');
      return;
    }

    setIsIdentifying(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('lang', i18n.language);

    console.log('📤 Sending identification request...');
    
    try {
      const response = await axiosConfig.post('/crop-health/identify', formData, {
        timeout: 30000, // 30 seconds timeout for identification
      });

      console.log('✅ Identification response:', response.data);
      setPlantIdentification(response.data);
      
      if (response.data.success) {
        showToast(`Plant identified: ${response.data.plant_name}!`, 'success');
      } else {
        showToast('Could not identify plant. Please provide the correct name.', 'warning');
      }
    } catch (error) {
      console.error('❌ Identification error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        showToast('Please login to identify plants', 'error');
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.message || 'Invalid image file', 'error');
      } else {
        showToast('Plant identification failed. Please try again.', 'error');
      }
    } finally {
      setIsIdentifying(false);
    }
  };

  // Teach plant
  const teachPlant = async () => {
    console.log('🧠 Starting plant learning...');
    console.log('User:', user);
    console.log('Correct plant name:', correctPlantName);
    console.log('Selected image:', selectedImage);  
  
    if (!correctPlantName.trim()) {
      console.log('❌ No plant name provided');
      showToast('Please provide a plant name', 'error');
      return;
    }

    setIsTeaching(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('plant_name', correctPlantName.trim());

    console.log('📤 Sending teaching request...');

    try {
      const response = await axiosConfig.post('/crop-health/teach', formData, {
        timeout: 30000, // 30 seconds timeout for teaching
      });

      console.log('✅ Teaching response:', response.data);
      showToast(response.data.message || 'Learning completed successfully!', 'success');
      setPlantIdentification(null);
      setCorrectPlantName('');
    } catch (error) {
      console.error('❌ Teaching error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      if (error.response?.status === 401) {
        showToast('Please login to teach plants', 'error');
      } else {
        showToast('Learning failed. Please try again.', 'error');
      }
    } finally {
      setIsTeaching(false);
    }
  };

  // Clear image and results
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setPlantIdentification(null);
    setShowFullAnalysis(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background slideshow - matching landing page exactly */}
      <div className="fixed inset-0 -z-50 overflow-hidden">
        {bgImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentBgIndex ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={img}
              alt={`Background ${index + 1}`}
              className="w-full h-full object-cover filter blur-sm brightness-50"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header - matching landing page style */}
        <header className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-lg shadow-lg sticky top-0 transition-all duration-300 hover:bg-white/20">
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors duration-200 mr-6"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">{t('back_to_home')}</span>
            </Link>
            <div className="h-6 w-px bg-white/30 mr-6"></div>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">{t('crop_health')}</h1>
          </div>
          
          {/* Navigation section */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher - modern style */}
            <div className="flex items-center space-x-2">
              <Globe size={16} className="text-white/80" />
              <select
                value={i18n.language}
                onChange={(e) => switchLanguage(e.target.value)}
                className="bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30 transition-all"
              >
                <option value="en" className="text-gray-800">{t('english')}</option>
                <option value="sw" className="text-gray-800">{t('swahili')}</option>
              </select>
            </div>
            
            {user && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30"
              >
                <History size={16} />
                <span className="font-medium">{t('view_history')}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content with backdrop blur overlay */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Header Section - matching landing page */}
          <section className="text-center mb-12 relative">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-3xl -z-10"></div>
            <div className="relative z-10 py-12">
              <div className="flex items-center justify-center mb-6">
                <Zap size={56} className="text-white mr-3 animate-pulse" />
                <h1 className="text-5xl font-bold text-white drop-shadow-xl">
                  {t('plant_health_diagnosis')}
                </h1>
              </div>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8 drop-shadow-md">
                {t('ai_powered_subtitle')}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image Upload Section - Glass morphism style */}
            <div className="lg:col-span-2">
              <div className="bg-white/15 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500">
                <h2 className="text-2xl font-semibold text-white mb-6 drop-shadow-md">
                  {t('upload_or_capture')}
                </h2>
              
              {!imagePreview ? (
                <div
                  className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-500 ${
                    dragActive
                      ? 'border-green-400/60 bg-green-500/10 backdrop-blur-lg'
                      : 'border-white/30 hover:border-white/60 bg-white/5 backdrop-blur-sm'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileImage size={80} className="mx-auto text-white/60 mb-6 animate-bounce" />
                  <p className="text-xl text-white/90 mb-4 font-semibold drop-shadow-md">{t('drag_drop_hint')}</p>
                  <p className="text-sm text-white/70 mb-8 drop-shadow-sm">{t('supported_formats')}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center space-x-2"
                    >
                      <Upload size={20} />
                      <span>{t('upload_from_device')}</span>
                    </button>
                    
                    <button
                      onClick={() => setShowCamera(true)}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center space-x-2"
                    >
                      <Camera size={20} />
                      <span>{t('take_photo')}</span>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/20">
                  <img
                    src={imagePreview}
                    alt="Selected plant"
                    className="w-full h-80 object-cover rounded-2xl shadow-xl"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-6 right-6 p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full hover:bg-red-600/90 transition-all shadow-lg hover:scale-105"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              
              
              {/* Plant Identification Section */}
              {imagePreview && !plantIdentification && (
                <div className="mt-6">
                  <button
                    onClick={identifyPlant}
                    disabled={isIdentifying}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300"
                  >
                    {isIdentifying ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        <span>Identifying Plant...</span>
                      </>
                    ) : (
                      <>
                        <FileImage size={20} />
                        <span>Identify Plant Type</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Plant Identification Result */}
              {plantIdentification && (
                <div className="mt-4 p-4 bg-white/15 backdrop-blur-md rounded-xl shadow-lg border border-white/20 hover:border-white/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {plantIdentification.success ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600" />
                      )}
                      <span className="text-sm font-medium text-white">{plantIdentification.success ? 'Plant Identified:' : 'Identification Failed'}</span>
                    </div>
                    <div className="text-xs text-green-400 font-medium">
                      {plantIdentification.confidence ? (plantIdentification.confidence * 100).toFixed(1) + '%' : ''}
                    </div>
                  </div>
                  <div className="mb-3">
                    {plantIdentification.success ? (
                      <span className="text-xl font-bold text-white drop-shadow-md">{plantIdentification.plant_name}</span>
                    ) : (
                      <div className="text-white">
                        <p>Could not identify the plant. Please provide the correct name:</p>
                        <input
                          type="text"
                          value={correctPlantName}
                          onChange={(e) => setCorrectPlantName(e.target.value)}
                          className="border border-white/30 bg-white/10 backdrop-blur-sm text-white rounded-lg px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-green-400 w-full placeholder-white/70"
                          placeholder="Enter plant name..."
                        />
                        <button
                          onClick={teachPlant}
                          disabled={isTeaching || !correctPlantName.trim()}
                          className="mt-3 w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300"
                        >
                          {isTeaching ? (
                            <Loader className="animate-spin" size={20} />
                          ) : (
                            <Zap size={20} />
                          )}
                          <span>Teach Plant</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {plantIdentification.success && plantIdentification.scientific_name && (
                    <p className="text-sm text-green-300 italic mt-1">
                      Scientific name: {plantIdentification.scientific_name}
                    </p>
                  )}
                  {plantIdentification.success && plantIdentification.common_names && plantIdentification.common_names.length > 0 && (
                    <p className="text-xs text-green-300 mt-1">
                      Also known as: {plantIdentification.common_names.join(', ')}
                    </p>
                  )}
                  
                  {/* Action buttons - only show if identification was successful */}
                  {plantIdentification.success && (
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-300 text-sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            <span>Analyzing Health...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            <span>Analyze Health</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setPlantIdentification(null)}
                        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300 text-sm"
                      >
                        Re-identify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* Results Section */}
            <div className="lg:col-span-1">
            {analysisResult ? (
              <div className="bg-white/15 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500">
                <div className="flex items-center space-x-3 mb-6">
                  <CheckCircle className="text-green-400" size={28} />
                  <h3 className="text-2xl font-bold text-white drop-shadow-md">
                    {t('analysis_complete')}
                  </h3>
                </div>
                
                <div className="space-y-6">
                  {/* Health Status */}
                  <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-white/90 text-lg">{t('health_status')}:</span>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm ${
                        analysisResult.is_healthy
                          ? 'bg-green-500/30 text-green-100 border border-green-400/50'
                          : 'bg-red-500/30 text-red-100 border border-red-400/50'
                      }`}>
                        {analysisResult.is_healthy ? t('healthy') : t('sick')}
                      </span>
                    </div>
                    
                    {!analysisResult.is_healthy && (
                      <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-400/30">
                        <p className="font-semibold text-red-200 mb-2">
                          {analysisResult.disease_type === 'disease' ? t('disease_detected') : t('deficiency_detected')}
                        </p>
                        <p className="text-white font-bold text-lg">
                          {analysisResult.disease_name}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Confidence Level */}
                  <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-white/90 text-lg">{t('confidence_level')}:</span>
                      <span className="font-bold text-blue-300 text-xl">
                        {(analysisResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-lg"
                        style={{ width: `${analysisResult.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Treatment */}
                  {analysisResult.treatment && (
                    <div className="p-6 bg-green-500/20 backdrop-blur-sm rounded-2xl border border-green-400/30">
                      <h4 className="font-bold text-green-200 mb-3 text-lg">
                        {t('suggested_treatment')}:
                      </h4>
                      <p className="text-white/90 leading-relaxed">
                        {analysisResult.treatment}
                      </p>
                    </div>
                  )}
                  
                  {/* Recommended Nutrients */}
                  {analysisResult.nutrients && (
                    <div className="p-6 bg-yellow-500/20 backdrop-blur-sm rounded-2xl border border-yellow-400/30">
                      <h4 className="font-bold text-yellow-200 mb-3 text-lg">
                        {t('recommended_nutrients')}:
                      </h4>
                      <p className="text-white/90 leading-relaxed">
                        {analysisResult.nutrients}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/15 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500">
                <div className="text-center">
                  <AlertCircle size={64} className="mx-auto mb-6 text-white/40 animate-pulse" />
                  <p className="text-xl mb-4 text-white/90 font-semibold">{t('upload_or_capture')}</p>
                  <p className="text-white/70">{t('ai_powered_subtitle')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Analysis History */}
        {showHistory && user && (
          <div className="mt-8 bg-white/15 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-500">
            <h3 className="text-2xl font-semibold text-white mb-6 drop-shadow-md">
              {t('analysis_history')}
            </h3>
            
            {analysisHistory.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                <History size={48} className="mx-auto mb-4 text-white/40" />
                <p>{t('no_history')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 font-medium text-white/90">{t('date')}</th>
                      <th className="text-left py-3 px-4 font-medium text-white/90">{t('crop_type')}</th>
                      <th className="text-left py-3 px-4 font-medium text-white/90">{t('diagnosis')}</th>
                      <th className="text-left py-3 px-4 font-medium text-white/90">{t('treatment')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisHistory.map((analysis, index) => (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/10 transition-all">
                        <td className="py-3 px-4 text-sm text-white/80">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-white/90">
                          {analysis.crop_type || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            analysis.is_healthy
                              ? 'bg-green-500/30 text-green-100 border border-green-400/50'
                              : 'bg-red-500/30 text-red-100 border border-red-400/50'
                          }`}>
                            {analysis.is_healthy ? t('healthy') : analysis.disease_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white/80">
                          {analysis.treatment ? analysis.treatment.substring(0, 50) + '...' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white/15 backdrop-blur-md rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-white/20 hover:border-white/40 transition-all duration-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white drop-shadow-lg">{t('take_photo')}</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-all duration-200 text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="relative">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
                onUserMediaError={() => {
                  showToast(t('camera_error'), 'error');
                  setShowCamera(false);
                }}
              />
            </div>
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300"
              >
                <Camera size={20} />
                <span>Capture</span>
              </button>
              <button
                onClick={() => setShowCamera(false)}
                className="flex-1 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseDiagnosisPage;
