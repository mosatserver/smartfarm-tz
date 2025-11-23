import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const UploadForm = ({ userRole, onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !price.trim()) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('image', image);

    // Optionally append location
    if (locationEnabled && lat && lng) {
      formData.append('lat', lat);
      formData.append('lng', lng);
    }

    try {
      const token = localStorage.getItem('token');
      setLoading(true);

      const response = await axios.post('http://localhost:5000/api/marketplace/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setTitle('');
        setPrice('');
        setImage(null);
        onSuccess();
      }
    } catch (error) {
      console.error('Error uploading:', error);
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
          },
          (error) => console.error('Geolocation error:', error)
        );
      } else {
        console.warn('Geolocation not supported');
      }
    }
    setLocationEnabled((prev) => !prev);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Post {userRole === 'farmer' ? 'Crop' : 'Input'}</h3>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name of the crop/input"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Price (TZS)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            placeholder="Price in Tanzanian Shillings"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-md font-medium text-gray-700 mb-1">Image</label>
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="w-full"
            required
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={locationEnabled}
            onChange={toggleLocation}
            id="location"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="location" className="ml-2 block text-sm text-gray-900">
            Share my current location
          </label>
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

