import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Plus, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import api from '../api';

const CourseForm = ({ course = null, onSuccess, onCancel, categories = [] }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(course?.thumbnail_url || null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Debug: Log the course data being passed
  console.log('🔍 CourseForm - Course data received:', course);
  console.log('🔍 CourseForm - Course tags:', course?.tags);
  console.log('🔍 CourseForm - Course learning_objectives:', course?.learning_objectives);

  // Form state
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category_name || '',
    level: course?.level || 'beginner',
    duration_weeks: course?.duration_weeks || 8,
    price: course?.price === 0 ? 'Free' : (course?.price || 'Free'),
    tags: Array.isArray(course?.tags) ? course.tags.join(', ') : (course?.tags || ''),
    prerequisites: course?.requirements || '',
    learning_objectives: Array.isArray(course?.learning_objectives) 
      ? course.learning_objectives.join('\n') 
      : (course?.learning_objectives || '')
  });

  // Update form data when course prop changes
  useEffect(() => {
    if (course) {
      console.log('🔄 CourseForm - Updating form data with course:', course);
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category_name || '',
        level: course.level || 'beginner',
        duration_weeks: course.duration_weeks || 8,
        price: course.price === 0 ? 'Free' : (course.price || 'Free'),
        tags: Array.isArray(course.tags) ? course.tags.join(', ') : (course.tags || ''),
        prerequisites: course.requirements || '',
        learning_objectives: Array.isArray(course.learning_objectives) 
          ? course.learning_objectives.join('\n') 
          : (course.learning_objectives || '')
      });
      setImagePreview(course.thumbnail_url || null);
    }
  }, [course]);

  // Debug: Log the initialized form data
  console.log('🔍 CourseForm - Current form data:', formData);

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast({ type: 'error', message: 'Please select an image file' });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showToast({ type: 'error', message: 'Image size must be less than 5MB' });
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(course?.thumbnail_url || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started');
    console.log('📋 Current form data:', formData);
    
    if (!formData.title || !formData.description || !formData.category) {
      showToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      submitData.append('level', formData.level);
      submitData.append('duration_weeks', formData.duration_weeks);
      submitData.append('price', formData.price);
      submitData.append('prerequisites', formData.prerequisites);

      // Process tags - send as JSON string
      const tags = formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      submitData.append('tags', JSON.stringify(tags));

      // Process learning objectives - send as JSON string
      const objectives = formData.learning_objectives 
        ? formData.learning_objectives.split('\n').map(obj => obj.trim()).filter(obj => obj)
        : [];
      submitData.append('learning_objectives', JSON.stringify(objectives));

      // Add image if selected
      if (selectedFile) {
        submitData.append('thumbnail', selectedFile);
      }
      
      // Debug: Log what we're sending
      console.log('📤 Submitting data:', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        duration_weeks: formData.duration_weeks,
        price: formData.price,
        prerequisites: formData.prerequisites,
        tags,
        objectives,
        courseId: course?.id,
        hasFile: !!selectedFile
      });
      
      // Debug: Log FormData entries
      console.log('📦 FormData entries:');
      for (let pair of submitData.entries()) {
        console.log(`  ${pair[0]}: ${pair[1]}`);
      }

      let response;
      if (course) {
        // Update existing course
        response = await api.put(`/courses/${course.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Create new course
        response = await api.post('/courses', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (response.data && response.data.success) {
        showToast({ 
          type: 'success', 
          message: course ? 'Course updated successfully!' : 'Course created successfully!' 
        });
        
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Course form error:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);
      
      let message = course ? 'Failed to update course' : 'Failed to create course';
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message).join(', ');
        message = `Validation failed: ${errorMessages}`;
        console.error('Detailed validation errors:', error.response.data.errors);
      }
      
      showToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 relative z-10">
      {/* Header with clear visibility */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {course ? '✏️ Edit Course' : '🎓 Create New Course'}
            </h2>
            <p className="text-gray-600 text-lg">
              {course ? 'Update your course information and save changes' : 'Design and publish educational content for students'}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              type="button"
            >
              <span>← Back to Courses</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Course Thumbnail
          </label>
          
          <div className="space-y-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={imagePreview.startsWith('data:') ? imagePreview : `${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'}${imagePreview}`}
                  alt="Course thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Upload Area */}
            {!imagePreview && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
              >
                <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Course Thumbnail</h3>
                <p className="text-gray-600 mb-4">Click to select an image for your course</p>
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <Upload size={16} className="inline mr-2" />
                    Choose Image
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Supported: JPG, PNG, GIF • Max 5MB</p>
              </div>
            )}

            {/* Change Image Button */}
            {imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors border border-blue-300 rounded-lg"
              >
                <Upload size={16} />
                <span>Change Image</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Course Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Enter course title..."
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Describe your course..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              required
            >
              <option value="">Select category</option>
              {categories.filter(cat => cat !== 'all').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleChange('level', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (weeks)
            </label>
            <input
              type="number"
              value={formData.duration_weeks}
              onChange={(e) => handleChange('duration_weeks', parseInt(e.target.value) || 8)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              min="1"
              max="52"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price
            </label>
            <select
              value={formData.price}
              onChange={(e) => handleChange('price', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            >
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Enter tags separated by commas (e.g., farming, agriculture, organic)"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prerequisites
            </label>
            <textarea
              rows={2}
              value={formData.prerequisites}
              onChange={(e) => handleChange('prerequisites', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="Any prerequisites for this course..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learning Objectives
            </label>
            <textarea
              rows={4}
              value={formData.learning_objectives}
              onChange={(e) => handleChange('learning_objectives', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              placeholder="What will students learn? (One objective per line)"
            />
            <p className="text-xs text-gray-500 mt-1">Enter each learning objective on a new line</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{course ? 'Updating...' : 'Creating...'}</span>
              </div>
            ) : (
              course ? 'Update Course' : 'Create Course'
            )}
          </button>
        </div>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle size={16} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Course will be saved as draft</p>
              <p>Your course will be created as a draft. You can edit it and publish when ready.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;
