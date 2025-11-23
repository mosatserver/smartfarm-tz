import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Truck, MapPin, DollarSign, Phone, Clock, Package, AlertCircle, Loader } from 'lucide-react';
import api from '../utils/axiosConfig';

const TransportUploadForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    vehicleType: 'truck',
    capacity: '',
    pricePerKm: '',
    pricePerTrip: '',
    coverageArea: '',
    contactPhone: '',
    availableDays: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const vehicleTypes = [
    { value: 'truck', label: 'Truck', emoji: '🚛' },
    { value: 'van', label: 'Van', emoji: '🚐' },
    { value: 'pickup', label: 'Pickup', emoji: '🛻' },
    { value: 'motorcycle', label: 'Motorcycle', emoji: '🏍️' },
    { value: 'bicycle', label: 'Bicycle', emoji: '🚲' },
    { value: 'other', label: 'Other', emoji: '🚗' }
  ];

  const availabilityOptions = [
    'Monday-Friday',
    'Weekends only',
    'Daily',
    'On demand',
    'Flexible schedule'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size should be less than 5MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const toggleLocation = async () => {
    if (!locationEnabled) {
      // Enable location - get current position
      if (!navigator.geolocation) {
        setLocationStatus('❌ Geolocation not supported by your browser');
        return;
      }

      setLocationLoading(true);
      setLocationStatus('📍 Getting your location...');

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        });

        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        setLocationEnabled(true);
        setLocationStatus(`✅ Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        console.log('✅ Location captured:', { latitude, longitude });
      } catch (error) {
        console.error('❌ Geolocation error:', error);
        let errorMessage = '❌ Failed to get location: ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied. Please allow location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Unknown error occurred.';
            break;
        }
        
        setLocationStatus(errorMessage);
      } finally {
        setLocationLoading(false);
      }
    } else {
      // Disable location
      setLocationEnabled(false);
      setLat(null);
      setLng(null);
      setLocationStatus('');
      console.log('📍 Location sharing disabled');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check authentication first
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      setError('You need to be logged in to upload transport services. Please login and try again.');
      return;
    }
    
    const userData = JSON.parse(user);
    if (userData.userType !== 'transporter') {
      setError('Only transporters can upload transport services. Please check your account type.');
      return;
    }
    
    // Basic validation
    if (!formData.title.trim()) {
      setError('Please enter a title for your transport service');
      return;
    }
    
    if (!formData.vehicleType) {
      setError('Please select a vehicle type');
      return;
    }

    if (!formData.pricePerKm && !formData.pricePerTrip) {
      setError('Please set either price per km or price per trip (or both)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🚀 Starting form submission...');
      
      const submitData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key]) {
          submitData.append('image', formData[key]);
          console.log('📷 Image added:', formData[key].name, formData[key].size + ' bytes');
        } else if (key !== 'image') {
          submitData.append(key, formData[key]);
          console.log('📝 Field added:', key, '=', formData[key]);
        }
      });

      // Optionally append location
      if (locationEnabled && lat && lng) {
        submitData.append('lat', lat);
        submitData.append('lng', lng);
        console.log('📍 Location added:', { lat, lng });
      }
      
      console.log('🌐 Making API request to /transport/upload...');
      const response = await api.post('/transport/upload', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('✅ API Response received:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.message || 'Failed to create transport post');
      }
    } catch (error) {
      console.error('Error uploading transport post:', error);
      console.error('📋 Full error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        data: error.response?.data,
        code: error.code
      });
      
      // Handle different types of errors
      if (error.response?.status === 401) {
        setError('You need to be logged in to upload transport services. Please log in and try again.');
      } else if (error.response?.status === 403) {
        const serverMessage = error.response?.data?.message || 'Only transporters can upload transport services. Please check your account type.';
        setError(`Access forbidden: ${serverMessage}`);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'ERR_NETWORK') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to upload transport post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/30 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Transport Service</h2>
              <p className="text-gray-600">Share your vehicle to help farmers transport their goods</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Reliable Transport for Farm Produce"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
                required
              >
                {vehicleTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.emoji} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your transport service, experience, and any special features..."
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-gray-900 bg-white"
            />
          </div>

          {/* Capacity and Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="inline w-4 h-4 mr-1" />
                Capacity
              </label>
              <input
                type="text"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="e.g., 5 tons, 20 bags, 500 kg"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="e.g., +255 123 456 789"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Price per KM (TZS)
              </label>
              <input
                type="number"
                name="pricePerKm"
                value={formData.pricePerKm}
                onChange={handleChange}
                placeholder="e.g., 1000"
                min="0"
                step="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Price per Trip (TZS)
              </label>
              <input
                type="number"
                name="pricePerTrip"
                value={formData.pricePerTrip}
                onChange={handleChange}
                placeholder="e.g., 50000"
                min="0"
                step="1000"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Coverage and Availability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Coverage Area
              </label>
              <input
                type="text"
                name="coverageArea"
                value={formData.coverageArea}
                onChange={handleChange}
                placeholder="e.g., Dar es Salaam - Mwanza"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Available Days
              </label>
              <select
                name="availableDays"
                value={formData.availableDays}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 bg-white"
              >
                <option value="">Select availability</option>
                {availabilityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Sharing */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                checked={locationEnabled}
                onChange={toggleLocation}
                id="location"
                disabled={locationLoading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="location" className="ml-3 flex items-center gap-2 text-sm font-medium text-blue-900">
                {locationLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Share my current location
                  </>
                )}
              </label>
            </div>
            
            {locationStatus && (
              <div className={`text-xs p-3 rounded-lg ${
                locationStatus.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : locationStatus.includes('📍')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {locationStatus}
              </div>
            )}
            
            <p className="text-xs text-blue-600 mt-2">
              💡 Sharing your location helps farmers find transporters near them and provides precise pickup information.
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Image
            </label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors overflow-hidden">
              {imagePreview ? (
                <div className="relative z-20">
                  <img
                    src={imagePreview}
                    alt="Vehicle preview"
                    className="max-w-full h-48 mx-auto rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, image: null }));
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative z-20 pointer-events-none">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Click to upload vehicle image</p>
                  <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              )}
              <input
                type="file"
                onChange={handleImageChange}
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4 pt-4">
            <motion.button
              type="button"
              onClick={onCancel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Truck className="w-5 h-5" />
                  <span>Add Transport Service</span>
                </div>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default TransportUploadForm;
