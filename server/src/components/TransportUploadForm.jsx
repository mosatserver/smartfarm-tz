import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const TransportUploadForm = ({ onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [pricePerTrip, setPricePerTrip] = useState('');
  const [coverageArea, setCoverageArea] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [availableDays, setAvailableDays] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const vehicleTypes = [
    { value: '', label: 'Select Vehicle Type' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' },
    { value: 'pickup', label: 'Pickup Truck' },
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !vehicleType) {
      alert('Please fill in the required fields (Title and Vehicle Type)');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('vehicleType', vehicleType);
    formData.append('capacity', capacity);
    formData.append('pricePerKm', pricePerKm);
    formData.append('pricePerTrip', pricePerTrip);
    formData.append('coverageArea', coverageArea);
    formData.append('contactPhone', contactPhone);
    formData.append('availableDays', availableDays);
    
    if (image) {
      formData.append('image', image);
    }

    // Append location if enabled
    if (locationEnabled && lat && lng) {
      formData.append('lat', lat);
      formData.append('lng', lng);
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to create transport posts');
        return;
      }

      setLoading(true);

      const response = await axios.post('http://localhost:5000/api/transport/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Reset form
        setTitle('');
        setDescription('');
        setVehicleType('');
        setCapacity('');
        setPricePerKm('');
        setPricePerTrip('');
        setCoverageArea('');
        setContactPhone('');
        setAvailableDays('');
        setImage(null);
        setLocationEnabled(false);
        setLat(null);
        setLng(null);
        
        alert('Transport post created successfully!');
        onSuccess();
      }
    } catch (error) {
      console.error('Error uploading transport post:', error);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
      } else if (error.response?.status === 403) {
        alert('Only transporters can create transport posts. Please check your account type.');
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Failed to create transport post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files.length > 0) {
      setImage(e.target.files[0]);
    }
  };

  const toggleLocation = () => {
    if (!locationEnabled) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLat(position.coords.latitude);
            setLng(position.coords.longitude);
            console.log('Location obtained:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
            alert('Could not get your location. Please enable location services.');
          }
        );
      } else {
        console.warn('Geolocation not supported');
        alert('Geolocation is not supported by your browser.');
      }
    }
    setLocationEnabled((prev) => !prev);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Create Transport Post</h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        
        {/* Title */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Reliable Truck Transport Service"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
            required
          />
        </div>

        {/* Vehicle Type */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
            required
          >
            {vehicleTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your transport service..."
            rows="3"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Capacity</label>
          <input
            type="text"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g., 5 tons, 20 bags, 10 passengers"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-md font-medium text-gray-700 mb-1">Price per KM (TZS)</label>
            <input
              type="number"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(e.target.value)}
              min="0"
              placeholder="e.g., 1000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-md font-medium text-gray-700 mb-1">Price per Trip (TZS)</label>
            <input
              type="number"
              value={pricePerTrip}
              onChange={(e) => setPricePerTrip(e.target.value)}
              min="0"
              placeholder="e.g., 50000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Coverage Area */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Coverage Area</label>
          <input
            type="text"
            value={coverageArea}
            onChange={(e) => setCoverageArea(e.target.value)}
            placeholder="e.g., Dar es Salaam to Mwanza"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Contact Phone */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Contact Phone</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="e.g., +255123456789"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Available Days */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Available Days</label>
          <input
            type="text"
            value={availableDays}
            onChange={(e) => setAvailableDays(e.target.value)}
            placeholder="e.g., Monday to Friday"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Vehicle Image</label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Location Toggle */}
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={locationEnabled}
            onChange={toggleLocation}
            id="transport-location"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="transport-location" className="ml-2 block text-sm text-gray-900">
            Share my current location
          </label>
          {locationEnabled && lat && lng && (
            <span className="ml-2 text-xs text-green-600">
              ✓ Location obtained
            </span>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Transport Post'}
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

export default TransportUploadForm;
