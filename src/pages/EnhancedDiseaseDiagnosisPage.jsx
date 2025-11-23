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
  Zap,
  TrendingUp,
  MapPin,
  Thermometer,
  Droplets,
  Cloud,
  DollarSign,
  Calendar,
  AlertTriangle,
  Info,
  Star,
  Send,
  Plus,
  Minus,
  BarChart3,
  Activity,
  Target,
  Users
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import axiosConfig from '../utils/axiosConfig';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import landing1 from '../images/landing1.jpg';
import landing2 from '../images/landing2.jpg';
import landing3 from '../images/landing3.jpg';
import landing4 from '../images/landing4.jpg';
import landing5 from '../images/landing5.jpg';
import '../styles/enhanced-diagnosis.css';

const EnhancedDiseaseDiagnosisPage = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  // Main state
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  
  // UI state
  const [showCamera, setShowCamera] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEnvironmentalForm, setShowEnvironmentalForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Enhanced data
  const [environmentalData, setEnvironmentalData] = useState({
    latitude: '',
    longitude: '',
    locationName: '',
    temperature: '',
    humidity: '',
    rainfall: '',
    soilPh: '',
    growthStage: '',
    season: ''
  });
  
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: '',
    accuracyRating: 0,
    helpfulnessRating: 0,
    easeOfUseRating: 0
  });
  
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [outbreakAlerts, setOutbreakAlerts] = useState([]);
  
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEnvironmentalData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Fetch enhanced statistics
  const fetchStatistics = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosConfig.get('/crop-health/statistics');
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, [user]);

  // Fetch outbreak alerts
  const fetchOutbreakAlerts = useCallback(async () => {
    if (!user || !environmentalData.latitude || !environmentalData.longitude) return;
    try {
      // Mock outbreak alerts for now since backend doesn't have this endpoint
      // const response = await axiosConfig.get('/crop-health/outbreak-alerts', {
      //   params: {
      //     latitude: environmentalData.latitude,
      //     longitude: environmentalData.longitude,
      //     radius: 50
      //   }
      // });
      // setOutbreakAlerts(response.data.outbreaks || []);
      setOutbreakAlerts([]); // No alerts for now
    } catch (error) {
      console.error('Error fetching outbreak alerts:', error);
    }
  }, [user, environmentalData.latitude, environmentalData.longitude]);

  // Fetch enhanced history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axiosConfig.get('/crop-health/history', {
        params: { limit: 20 }
      });
      setAnalysisHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStatistics();
      fetchHistory();
    }
  }, [fetchStatistics, fetchHistory, user]);

  useEffect(() => {
    if (environmentalData.latitude && environmentalData.longitude) {
      fetchOutbreakAlerts();
    }
  }, [fetchOutbreakAlerts]);

  // Language switching
  const switchLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

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
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC)', 'error');
      return false;
    }

    if (file.size > maxSize) {
      showToast('File size too large. Maximum 10MB allowed', 'error');
      return false;
    }

    return true;
  };

  // Handle file selection (single or multiple)
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(validateFile);
    
    if (validFiles.length === 0) return;

    if (isBatchMode) {
      if (validFiles.length > 5) {
        showToast('Maximum 5 images allowed for batch processing', 'error');
        return;
      }
      setSelectedImages(validFiles);
      
      // Create previews for all images
      const previews = [];
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push(e.target.result);
          if (previews.length === validFiles.length) {
            setImagePreview(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      // Single image mode
      const file = validFiles[0];
      setSelectedImages([file]);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview([e.target.result]);
      };
      reader.readAsDataURL(file);
    }
    
    setAnalysisResult(null);
    setBatchResults([]);
    showToast(`${validFiles.length} image(s) uploaded successfully`, 'success');
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(validateFile);
      
      if (validFiles.length === 0) return;

      // Simulate file input event
      const fakeEvent = {
        target: {
          files: validFiles
        }
      };
      handleFileSelect(fakeEvent);
    }
  };

  // Capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setImagePreview([imageSrc]);
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          setSelectedImages([file]);
        });
      setShowCamera(false);
      setAnalysisResult(null);
      setBatchResults([]);
      showToast('Image captured successfully', 'success');
    }
  }, [showToast]);

  // Enhanced analysis function
  const analyzeImages = async () => {
    if (selectedImages.length === 0) {
      showToast('Please select at least one image', 'error');
      return;
    }

    if (!user) {
      showToast('Please login to analyze plant health', 'error');
      return;
    }

    setIsAnalyzing(true);

    try {
      if (isBatchMode && selectedImages.length > 1) {
        // Batch analysis
        const formData = new FormData();
        selectedImages.forEach(image => {
          formData.append('images', image);
        });
        formData.append('lang', i18n.language);

        const response = await axiosConfig.post('/crop-health/analyze', formData, {
          timeout: 120000 // 2 minutes for batch processing
        });

        setBatchResults(response.data.results || []);
        showToast(`Batch analysis completed! Processed ${response.data.results?.length || 0} images`, 'success');
      } else {
        // Single enhanced analysis
        const formData = new FormData();
        formData.append('image', selectedImages[0]);
        formData.append('lang', i18n.language);
        
        // Add environmental data
        Object.keys(environmentalData).forEach(key => {
          if (environmentalData[key]) {
            formData.append(key, environmentalData[key]);
          }
        });

        const response = await axiosConfig.post('/crop-health/analyze', formData, {
          timeout: 90000 // 90 seconds for enhanced analysis
        });

        setAnalysisResult(response.data);
        showToast('Enhanced analysis completed successfully!', 'success');
      }

      // Refresh data
      if (showHistory) {
        fetchHistory();
      }
      fetchStatistics();
      
    } catch (error) {
      console.error('Analysis error:', error);
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

  // Submit feedback
  const submitFeedback = async () => {
    if (!analysisResult?.analysis_id) return;
    
    try {
      // Mock feedback submission for now since backend doesn't have this endpoint
      // await axiosConfig.post('/crop-health/feedback', {
      //   analysisId: analysisResult.analysis_id,
      //   feedbackType: 'diagnosis_accuracy',
      //   accuracyRating: feedback.accuracyRating,
      //   helpfulnessRating: feedback.helpfulnessRating,
      //   easeOfUseRating: feedback.easeOfUseRating,
      //   overallRating: feedback.rating,
      //   feedbackText: feedback.comment
      // });
      
      // Simulate successful feedback submission
      console.log('Feedback data:', {
        analysisId: analysisResult.analysis_id,
        feedbackType: 'diagnosis_accuracy',
        ratings: {
          accuracy: feedback.accuracyRating,
          helpfulness: feedback.helpfulnessRating,
          easeOfUse: feedback.easeOfUseRating,
          overall: feedback.rating
        },
        comment: feedback.comment
      });
      
      showToast('Feedback submitted successfully!', 'success');
      setShowFeedbackForm(false);
      setFeedback({ rating: 0, comment: '', accuracyRating: 0, helpfulnessRating: 0, easeOfUseRating: 0 });
    } catch (error) {
      showToast('Failed to submit feedback', 'error');
    }
  };

  // Clear images and results
  const clearImages = () => {
    setSelectedImages([]);
    setImagePreview([]);
    setAnalysisResult(null);
    setBatchResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove single image from batch
  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreview(newPreviews);
  };

  // Severity indicator component
  const SeverityIndicator = ({ level, score, affectedArea }) => {
    const severityConfig = {
      mild: { color: 'bg-green-500', textColor: 'text-green-800', bgColor: 'bg-green-100' },
      moderate: { color: 'bg-yellow-500', textColor: 'text-yellow-800', bgColor: 'bg-yellow-100' },
      severe: { color: 'bg-orange-500', textColor: 'text-orange-800', bgColor: 'bg-orange-100' },
      critical: { color: 'bg-red-500', textColor: 'text-red-800', bgColor: 'bg-red-100' }
    };

    const config = severityConfig[level] || severityConfig.mild;

    return (
      <div className={`p-4 rounded-lg ${config.bgColor} border border-gray-200`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}>
            {level.toUpperCase()} SEVERITY
          </span>
          <div className="flex items-center space-x-1">
            <Activity size={16} className={config.textColor} />
            <span className={`font-bold ${config.textColor}`}>{(score * 100).toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Confidence Score:</span>
            <span className="font-medium">{(score * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${config.color}`}
              style={{ width: `${score * 100}%` }}
            ></div>
          </div>
          
          {affectedArea && (
            <>
              <div className="flex justify-between text-sm">
                <span>Affected Area:</span>
                <span className="font-medium">{affectedArea.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${config.color} opacity-70`}
                  style={{ width: `${Math.min(affectedArea, 100)}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Treatment cost component
  const TreatmentCosts = ({ recommendations }) => {
    if (!recommendations?.primary) return null;

    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2 mb-3">
          <DollarSign size={20} className="text-blue-600" />
          <h4 className="font-semibold text-blue-800">Treatment Costs</h4>
        </div>
        
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h5 className="font-medium text-gray-800">{recommendations.primary.treatment_name}</h5>
                <p className="text-sm text-gray-600">{recommendations.primary.active_ingredient}</p>
              </div>
              <span className="text-lg font-bold text-green-600">
                TZS {recommendations.primary.estimated_cost_per_hectare?.toLocaleString() || 'N/A'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>Applications: {recommendations.primary.applications_recommended || 1}</div>
              <div>Type: {recommendations.primary.treatment_type}</div>
              <div>Availability: {recommendations.primary.availability}</div>
              <div>Rating: {recommendations.primary.effectiveness_rating}</div>
            </div>
          </div>
          
          {recommendations.alternatives?.length > 0 && (
            <div>
              <h6 className="text-sm font-medium text-gray-700 mb-2">Alternative Treatments:</h6>
              <div className="space-y-2">
                {recommendations.alternatives.map((alt, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="flex justify-between">
                      <span>{alt.treatment_name}</span>
                      <span className="font-medium">TZS {alt.estimated_cost_per_hectare?.toLocaleString() || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {recommendations.estimated_total_cost > 0 && (
            <div className="bg-green-100 p-3 rounded border-l-4 border-green-500">
              <div className="flex justify-between items-center">
                <span className="font-medium">Estimated Total Cost:</span>
                <span className="text-xl font-bold text-green-700">
                  TZS {recommendations.estimated_total_cost.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">Per hectare, including multiple applications</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Environmental context component
  const EnvironmentalContext = ({ context, riskFactors }) => {
    if (!context) return null;

    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2 mb-3">
          <Cloud size={20} className="text-green-600" />
          <h4 className="font-semibold text-green-800">Environmental Context</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {context.temperature && (
            <div className="flex items-center space-x-2">
              <Thermometer size={16} className="text-red-500" />
              <div>
                <div className="text-xs text-gray-600">Temperature</div>
                <div className="font-medium">{context.temperature.toFixed(1)}°C</div>
              </div>
            </div>
          )}
          
          {context.humidity && (
            <div className="flex items-center space-x-2">
              <Droplets size={16} className="text-blue-500" />
              <div>
                <div className="text-xs text-gray-600">Humidity</div>
                <div className="font-medium">{context.humidity.toFixed(1)}%</div>
              </div>
            </div>
          )}
          
          {context.rainfall && (
            <div className="flex items-center space-x-2">
              <Cloud size={16} className="text-blue-600" />
              <div>
                <div className="text-xs text-gray-600">Rainfall</div>
                <div className="font-medium">{context.rainfall.toFixed(1)}mm</div>
              </div>
            </div>
          )}
          
          {context.pressure && (
            <div className="flex items-center space-x-2">
              <BarChart3 size={16} className="text-purple-500" />
              <div>
                <div className="text-xs text-gray-600">Pressure</div>
                <div className="font-medium">{context.pressure.toFixed(0)} hPa</div>
              </div>
            </div>
          )}
        </div>
        
        {riskFactors?.length > 0 && (
          <div className="border-t pt-3">
            <h6 className="text-sm font-medium text-gray-700 mb-2">Environmental Risk Factors:</h6>
            <div className="space-y-1">
              {riskFactors.map((factor, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Star rating component
  const StarRating = ({ rating, setRating, readonly = false }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && setRating(star)}
            className={`${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400 transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Background slideshow - matching landing page exactly */}
      <div className="fixed inset-0 -z-50 overflow-hidden">
        {[landing1, landing2, landing3, landing4, landing5].map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === (Date.now() / 10000 | 0) % 5 === index ? 'opacity-100' : 'opacity-0'}`}
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
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b glass-card border-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>{t('back_to_home')}</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-green-600">Enhanced Crop Health Analysis</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <div className="flex items-center space-x-2">
                <Globe size={16} className="text-gray-500" />
                <select
                  value={i18n.language}
                  onChange={(e) => switchLanguage(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
              
              {/* Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsBatchMode(!isBatchMode)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    isBatchMode 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isBatchMode ? 'Batch Mode' : 'Single Mode'}
                </button>
              </div>
              
              {user && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    <History size={16} />
                    <span>History</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    <BarChart3 size={16} />
                    <span>Analytics</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Outbreak Alerts */}
        {outbreakAlerts.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="font-semibold text-red-800">Disease Outbreak Alerts</h3>
            </div>
            <div className="space-y-2">
              {outbreakAlerts.map((alert, index) => (
                <div key={index} className="bg-white p-3 rounded border-l-4 border-red-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-red-800">{alert.disease_name}</h4>
                      <p className="text-sm text-red-600">
                        {alert.crop_type} • {alert.location_name} • {alert.cases_count} cases
                      </p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      {alert.severity_level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Analysis Panel */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6 glass-card border-gradient mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {isBatchMode ? 'Batch Image Analysis' : 'Enhanced Plant Analysis'}
                </h2>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowEnvironmentalForm(!showEnvironmentalForm)}
                    className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    <MapPin size={16} className="inline mr-1" />
                    Environmental Data
                  </button>
                </div>
              </div>
              
              {/* Environmental Data Form */}
              {showEnvironmentalForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-medium text-gray-800 mb-4">Environmental Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        value={environmentalData.temperature}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, temperature: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="25.0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Humidity (%)</label>
                      <input
                        type="number"
                        value={environmentalData.humidity}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, humidity: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="65"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Rainfall (mm)</label>
                      <input
                        type="number"
                        value={environmentalData.rainfall}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, rainfall: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Soil pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={environmentalData.soilPh}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, soilPh: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="6.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Growth Stage</label>
                      <select
                        value={environmentalData.growthStage}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, growthStage: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Select stage</option>
                        <option value="seedling">Seedling</option>
                        <option value="vegetative">Vegetative</option>
                        <option value="flowering">Flowering</option>
                        <option value="fruiting">Fruiting</option>
                        <option value="mature">Mature</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Season</label>
                      <select
                        value={environmentalData.season}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, season: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Auto-detect</option>
                        <option value="dry">Dry Season</option>
                        <option value="wet">Wet Season</option>
                        <option value="transition">Transition</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location Name</label>
                      <input
                        type="text"
                        value={environmentalData.locationName}
                        onChange={(e) => setEnvironmentalData(prev => ({...prev, locationName: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Farm location or nearest town"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Image Upload Area */}
              {imagePreview.length === 0 ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors glass-card clay ${
                    dragActive
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileImage size={64} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-lg text-gray-600 mb-4">
                    {isBatchMode 
                      ? 'Drag & drop up to 5 images here or click to select'
                      : 'Drag & drop your plant image here or click to select'
                    }
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Supported formats: JPEG, PNG, WebP, GIF, BMP, TIFF, SVG, AVIF, HEIC • Max size: 10MB {isBatchMode && '• Up to 5 images'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors neumorph glow-green"
                    >
                      <Upload size={20} />
                      <span>{isBatchMode ? 'Select Images' : 'Upload Image'}</span>
                    </button>
                    
                    <button
                      onClick={() => setShowCamera(true)}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors neumorph glow-blue"
                    >
                      <Camera size={20} />
                      <span>Take Photo</span>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple={isBatchMode}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Previews */}
                  <div className={`grid gap-4 ${
                    isBatchMode ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'
                  }`}>
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Selected plant ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => isBatchMode ? removeImage(index) : clearImages()}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                        {isBatchMode && (
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                            Image {index + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Analysis Button */}
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={analyzeImages}
                      disabled={isAnalyzing}
                      className="flex items-center justify-center space-x-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors neumorph glow-green text-lg font-semibold"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader className="animate-spin" size={24} />
                          <span>{isBatchMode ? 'Analyzing Images...' : 'Analyzing Plant...'}</span>
                        </>
                      ) : (
                        <>
                          <Zap size={24} />
                          <span>{isBatchMode ? `Analyze ${selectedImages.length} Images` : 'Analyze Plant Health'}</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={clearImages}
                      className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Single Analysis Results */}
            {analysisResult && !isBatchMode && (
              <div className="bg-white rounded-xl shadow-lg p-6 glass-card clay mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="text-green-500" size={24} />
                    <h3 className="text-xl font-semibold text-gray-800">Analysis Complete</h3>
                  </div>
                  
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                  >
                    <Star size={16} />
                    <span>Rate Analysis</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Health Status and Severity */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg border ${
                      analysisResult.is_healthy 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Health Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          analysisResult.is_healthy
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {analysisResult.is_healthy ? 'Healthy' : analysisResult.disease_name}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Crop Type: <span className="font-medium">{analysisResult.crop_type}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Confidence: <span className="font-medium">{(analysisResult.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {analysisResult.severity && !analysisResult.is_healthy && (
                      <SeverityIndicator 
                        level={analysisResult.severity.level}
                        score={analysisResult.severity.score}
                        affectedArea={analysisResult.severity.affected_area_percentage}
                      />
                    )}
                  </div>
                  
                  {/* Treatment Recommendations */}
                  {analysisResult.treatment_recommendations && (
                    <TreatmentCosts recommendations={analysisResult.treatment_recommendations} />
                  )}
                </div>
                
                {/* Environmental Context */}
                {analysisResult.environmental_context && (
                  <div className="mt-6">
                    <EnvironmentalContext 
                      context={analysisResult.environmental_context}
                      riskFactors={analysisResult.severity?.environmental_risk_factors}
                    />
                  </div>
                )}
                
                {/* Treatment Details */}
                {analysisResult.treatment && !analysisResult.is_healthy && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Recommended Treatment:</h4>
                    <p className="text-blue-700 text-sm leading-relaxed">{analysisResult.treatment}</p>
                    
                    {analysisResult.severity?.days_to_treat && (
                      <div className="mt-3 flex items-center space-x-2 text-sm">
                        <Calendar size={16} className="text-blue-600" />
                        <span className="text-blue-700">
                          <strong>Urgent:</strong> Treat within {analysisResult.severity.days_to_treat} days
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Batch Results */}
            {batchResults.length > 0 && isBatchMode && (
              <div className="bg-white rounded-xl shadow-lg p-6 glass-card clay mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">Batch Analysis Results</h3>
                
                <div className="grid gap-4">
                  {batchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-800">{result.filename}</h4>
                          <p className="text-sm text-gray-600">
                            {result.crop_type} • Confidence: {(result.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          result.is_healthy
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.is_healthy ? 'Healthy' : result.disease_name}
                        </span>
                      </div>
                      
                      {!result.is_healthy && result.treatment && (
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          <strong>Treatment:</strong> {result.treatment.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Analytics and History */}
          <div className="xl:col-span-1">
            {/* Quick Stats */}
            {statistics && (
              <div className="bg-white rounded-xl shadow-lg p-6 glass-card clay mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Statistics</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{statistics.basic?.total_analyses || 0}</div>
                      <div className="text-xs text-gray-600">Total Analyses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {statistics.basic?.avg_confidence ? (statistics.basic.avg_confidence * 100).toFixed(0) + '%' : '0%'}
                      </div>
                      <div className="text-xs text-gray-600">Avg Confidence</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{statistics.basic?.healthy_count || 0}</div>
                      <div className="text-xs text-gray-600">Healthy Plants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{statistics.basic?.unhealthy_count || 0}</div>
                      <div className="text-xs text-gray-600">Diseased Plants</div>
                    </div>
                  </div>
                  
                  {statistics.environmental_correlations && (
                    <div className="border-t pt-4">
                      <div className="text-sm text-gray-700 mb-2">Environmental Averages:</div>
                      <div className="space-y-1 text-xs">
                        {statistics.environmental_correlations.avg_temperature && (
                          <div className="flex justify-between">
                            <span>Temperature:</span>
                            <span>{statistics.environmental_correlations.avg_temperature.toFixed(1)}°C</span>
                          </div>
                        )}
                        {statistics.environmental_correlations.avg_humidity && (
                          <div className="flex justify-between">
                            <span>Humidity:</span>
                            <span>{statistics.environmental_correlations.avg_humidity.toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent History */}
            {showHistory && analysisHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 glass-card clay">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Analyses</h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisHistory.slice(0, 10).map((analysis, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-gray-800">{analysis.crop_type || 'Unknown'}</div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          analysis.is_healthy
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {analysis.is_healthy ? 'Healthy' : analysis.disease_name?.split('___').pop() || 'Diseased'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                        {analysis.severity_level && (
                          <span className={`px-2 py-1 rounded ${
                            analysis.severity_level === 'critical' ? 'bg-red-100 text-red-700' :
                            analysis.severity_level === 'severe' ? 'bg-orange-100 text-orange-700' :
                            analysis.severity_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {analysis.severity_level}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 glass-card border-gradient">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Capture Plant Image</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="p-1 hover:bg-gray-100 rounded"
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
                  showToast('Camera access failed', 'error');
                  setShowCamera(false);
                }}
              />
            </div>
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Camera size={20} />
                <span>Capture</span>
              </button>
              <button
                onClick={() => setShowCamera(false)}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 glass-card border-gradient">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Rate This Analysis</h3>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                <StarRating 
                  rating={feedback.rating}
                  setRating={(rating) => setFeedback(prev => ({...prev, rating}))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Accuracy Rating</label>
                <StarRating 
                  rating={feedback.accuracyRating}
                  setRating={(rating) => setFeedback(prev => ({...prev, accuracyRating: rating}))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Helpfulness Rating</label>
                <StarRating 
                  rating={feedback.helpfulnessRating}
                  setRating={(rating) => setFeedback(prev => ({...prev, helpfulnessRating: rating}))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ease of Use Rating</label>
                <StarRating 
                  rating={feedback.easeOfUseRating}
                  setRating={(rating) => setFeedback(prev => ({...prev, easeOfUseRating: rating}))}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                <textarea
                  value={feedback.comment}
                  onChange={(e) => setFeedback(prev => ({...prev, comment: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Share your thoughts about this analysis..."
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6">
              <button
                onClick={submitFeedback}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Send size={20} />
                <span>Submit Feedback</span>
              </button>
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Analytics Dashboard Modal */}
      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
};

export default EnhancedDiseaseDiagnosisPage;
