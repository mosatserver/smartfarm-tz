import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Loader } from 'lucide-react';
import api from '../utils/axiosConfig';

const UploadForm = ({ userRole, onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price.trim() || !quantity.trim()) {
      alert('Please fill in all required fields: title, price, and quantity');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('quantity', quantity);
    formData.append('unit', unit);
    formData.append('image', image);

    // Optionally append location
    if (locationEnabled && lat && lng) {
      formData.append('lat', lat);
      formData.append('lng', lng);
    }

    try {
      setLoading(true);

      const response = await api.post('/marketplace/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setTitle('');
        setPrice('');
        setQuantity('');
        setUnit('kg');
        setImage(null);
        setLocationEnabled(false);
        setLat(null);
        setLng(null);
        setLocationStatus('');
        onSuccess();
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      setImage(e.target.files[0]);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Post {userRole === 'farmer' ? 'Crop' : 'Input'}</h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name of the crop/input"
            className="w-full p-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Price (TZS)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="0.01"
            placeholder="Price in Tanzanian Shillings"
            className="w-full p-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm"
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="0.1"
              placeholder="Amount available"
              className="w-full p-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="buckets">Buckets</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Image</label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="w-full p-3 text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={locationEnabled}
              onChange={toggleLocation}
              id="location"
              disabled={locationLoading}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="location" className="ml-2 flex items-center gap-2 text-sm text-gray-900">
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
            <div className={`text-xs p-2 rounded-md ${
              locationStatus.includes('✅') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : locationStatus.includes('📍')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {locationStatus}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </form>
  );
};

export default UploadForm;
