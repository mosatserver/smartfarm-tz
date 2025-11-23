import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MessageSquare, MapPin, DollarSign, User, Calendar, 
  Phone, Mail, Package, Clock, Search, Filter, Heart, 
  Trash2, Plus, Route, Star, Eye, ArrowLeft, AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import TransportUploadForm from '../components/TransportUploadForm';
import { useAuth } from '../contexts/AuthContext';

const TransportPage = () => {
  const [posts, setPosts] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactModal, setContactModal] = useState({ show: false, contact: null, loading: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = user !== null;

  useEffect(() => {
    fetchTransportPosts();
  }, []);

  const fetchTransportPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transport');
      
      if (response.data.success) {
        console.log('Fetched transport posts:', response.data.posts);
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching transport posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchTransportPosts();
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this transport service?')) {
      return;
    }

    try {
      const response = await api.delete(`/transport/${postId}`);
      
      if (response.data.success) {
        setPosts(posts.filter(post => post.id !== postId));
        console.log('✅ Transport post deleted successfully');
      }
    } catch (error) {
      console.error('❌ Error deleting transport post:', error);
      alert('Failed to delete transport post. Please try again.');
    }
  };

  const handleLikeClick = async (postId, isCurrentlyLiked) => {
    try {
      const endpoint = isCurrentlyLiked ? 'unlike' : 'like';
      const response = await api.post(`/transport/${postId}/${endpoint}`);
      
      if (response.data.success) {
        setPosts(prevPosts => 
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                is_liked: isCurrentlyLiked ? 0 : 1,
                likes_count: isCurrentlyLiked ? post.likes_count - 1 : post.likes_count + 1
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like. Please try again.');
    }
  };

  const handleContactClick = async (postId) => {
    try {
      setContactModal({ show: true, contact: null, loading: true });
      const response = await api.get(`/transport/${postId}/contact`);
      
      if (response.data.success) {
        setContactModal({ show: true, contact: response.data.contact, loading: false });
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
      setContactModal({ show: false, contact: null, loading: false });
      alert('Failed to fetch contact details. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US').format(price);
  };

  const getVehicleEmoji = (vehicleType) => {
    const emojiMap = {
      truck: '🚛',
      van: '🚐', 
      pickup: '🛻',
      motorcycle: '🏍️',
      bicycle: '🚲',
      other: '🚗'
    };
    return emojiMap[vehicleType] || '🚗';
  };

  // Filter and search posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.coverage_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.location_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVehicleType = selectedVehicleType === 'all' || post.vehicle_type === selectedVehicleType;
    
    return matchesSearch && matchesVehicleType;
  });

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  const vehicleTypes = [
    { value: 'all', label: 'All Vehicles', emoji: '🚚' },
    { value: 'truck', label: 'Trucks', emoji: '🚛' },
    { value: 'van', label: 'Vans', emoji: '🚐' },
    { value: 'pickup', label: 'Pickups', emoji: '🛻' },
    { value: 'motorcycle', label: 'Motorcycles', emoji: '🏍️' },
    { value: 'bicycle', label: 'Bicycles', emoji: '🚲' },
    { value: 'other', label: 'Other', emoji: '🚗' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/70 border-b border-white/20 sticky top-0 z-40">
        <nav className="px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back to Home</span>
              </Link>
              <div className="bg-gradient-to-br from-white to-gray-100 rounded-2xl p-3 shadow-lg border border-white/50">
                <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                  SmartFarm
                </Link>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="hidden lg:flex items-center space-x-2">
              {[
                { name: 'Products', path: '/marketplace', active: false },
                { name: 'Transport', path: '/transport', active: true },
                { name: 'Chat', path: '/chat', active: false }
              ].map((item) => (
                <Link 
                  key={item.name}
                  to={item.path} 
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium text-sm md:text-base ${
                    item.active 
                      ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white shadow-lg'
                      : 'bg-white/60 text-gray-800 hover:bg-white/90 shadow-md hover:shadow-lg hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* User Controls */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 md:space-x-3 bg-white/70 backdrop-blur-sm rounded-2xl px-3 md:px-4 py-2 shadow-lg">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-700 font-medium hidden sm:block">{user.firstName}</span>
                  <button 
                    onClick={logout} 
                    className="text-xs md:text-sm bg-gradient-to-r from-red-500 to-pink-600 text-white px-2 md:px-3 py-1 rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/" className="flex items-center space-x-1 md:space-x-2 bg-white/70 backdrop-blur-sm rounded-2xl px-3 md:px-4 py-2 text-gray-800 hover:bg-white/90 shadow-lg transition-all">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium hidden sm:block">Login</span>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-8 md:py-12 relative">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 md:p-6 lg:p-8 shadow-2xl border border-white/40"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 lg:mb-8">
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-purple-700 bg-clip-text text-transparent mb-2">
                    🚛 Transport Services
                  </h1>
                  <p className="text-gray-700 text-base md:text-lg font-medium">Find reliable transport for your farm produce across Tanzania</p>
                </div>
                
                <div className="flex items-center justify-center lg:justify-end">
                  {user ? (
                    user.userType === 'transporter' ? (
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowUploadForm(true)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Transport Service</span>
                      </motion.button>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-2 flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-800">Only transporters can add services</span>
                      </div>
                    )
                  ) : (
                    <Link to="/" className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2">
                      <Plus className="w-5 h-5" />
                      <span>Login to Add Service</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Search and Filters */}
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30">
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by location, coverage area, or service..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                    />
                  </div>
                </div>
                
                {/* Vehicle Type Filter */}
                <div className="lg:w-64">
                  <select
                    value={selectedVehicleType}
                    onChange={(e) => setSelectedVehicleType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 font-medium">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPosts.length)} of {filteredPosts.length} services
                </div>
                {user && user.userType === 'transporter' && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium lg:hidden"
                  >
                    <Plus size={16} />
                    <span>Add Service</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Transport Services Grid */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : paginatedPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.6, type: "spring" }}
                    whileHover={{ 
                      y: -8, 
                      scale: 1.02,
                      transition: { duration: 0.3 }
                    }}
                    className="bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden group border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500"
                  >
                    {/* Transport Image */}
                    <div className="relative h-48 overflow-hidden">
                      {post.image_url ? (
                        <img
                          src={`http://localhost:5000${post.image_url}`}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' /%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <span className="text-6xl">{getVehicleEmoji(post.vehicle_type)}</span>
                        </div>
                      )}
                      
                      {/* Vehicle Type Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-blue-500/80 backdrop-blur-sm">
                          {getVehicleEmoji(post.vehicle_type)} {post.vehicle_type.charAt(0).toUpperCase() + post.vehicle_type.slice(1)}
                        </span>
                      </div>
                      
                      {/* Delete Button (for owner) */}
                      {user && user.id === post.user_id && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Delete service"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      {/* Like Button */}
                      <button
                        onClick={() => handleLikeClick(post.id, post.is_liked)}
                        className={`absolute top-2 right-10 p-1.5 rounded-full transition-all ${
                          post.is_liked 
                            ? 'bg-red-500 text-white' 
                            : 'bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500'
                        }`}
                      >
                        <Heart size={14} className={post.is_liked ? 'fill-current' : ''} />
                      </button>

                      {/* Status Badge */}
                      <div className="absolute bottom-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          post.status === 'active' ? 'bg-green-500/80 text-white' :
                          post.status === 'busy' ? 'bg-yellow-500/80 text-white' :
                          'bg-gray-500/80 text-white'
                        }`}>
                          {post.status === 'active' ? '✅ Available' : 
                           post.status === 'busy' ? '⏳ Busy' : '❌ Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Transport Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-base leading-tight">
                        {post.title}
                      </h3>
                      
                      {post.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {post.description}
                        </p>
                      )}

                      {/* Capacity */}
                      {post.capacity && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Package size={14} className="text-blue-600" />
                          <span className="text-sm text-gray-700 font-medium">{post.capacity}</span>
                        </div>
                      )}
                      
                      {/* Pricing */}
                      <div className="mb-3 space-y-1">
                        {post.price_per_km && (
                          <div className="flex items-center space-x-1">
                            <Route size={14} className="text-green-600" />
                            <span className="text-sm font-semibold text-green-700">
                              TZS {formatPrice(post.price_per_km)}/km
                            </span>
                          </div>
                        )}
                        {post.price_per_trip && (
                          <div className="flex items-center space-x-1">
                            <DollarSign size={14} className="text-blue-600" />
                            <span className="text-sm font-semibold text-blue-700">
                              TZS {formatPrice(post.price_per_trip)}/trip
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Coverage Area */}
                      {post.coverage_area && (
                        <div className="flex items-center space-x-2 mb-3">
                          <MapPin size={12} className="text-purple-600" />
                          <span className="text-xs text-gray-600 truncate">{post.coverage_area}</span>
                        </div>
                      )}

                      {/* Availability */}
                      {post.available_days && (
                        <div className="flex items-center space-x-2 mb-3">
                          <Clock size={12} className="text-orange-600" />
                          <span className="text-xs text-gray-600">{post.available_days}</span>
                        </div>
                      )}

                      {/* Contact Button */}
                      <div className="flex justify-center mt-4">
                        <button 
                          onClick={() => handleContactClick(post.id)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-medium shadow-lg flex items-center justify-center space-x-2"
                        >
                          <MessageSquare size={16} />
                          <span>Contact Transporter</span>
                        </button>
                      </div>
                      
                      {/* Likes Count */}
                      {post.likes_count > 0 && (
                        <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
                          <Heart size={12} className="mr-1.5 text-red-500" />
                          <span>{post.likes_count} likes</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Truck size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transport services found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || selectedVehicleType !== 'all' 
                    ? 'Try adjusting your search filters'
                    : 'Be the first to add a transport service!'}
                </p>
                {user && user.userType === 'transporter' && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Add Your Transport Service
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Upload Form Modal */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowUploadForm(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <TransportUploadForm
                onSuccess={handleUploadSuccess}
                onCancel={() => setShowUploadForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Modal */}
      <AnimatePresence>
        {contactModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setContactModal({ show: false, contact: null, loading: false })}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                📞 Contact Transporter
              </h3>
              {contactModal.loading ? (
                <div className="text-white flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="ml-3">Loading...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="space-y-3 text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400/30 to-blue-500/30 rounded-lg flex items-center justify-center">
                          <Mail size={16} className="text-green-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-300">Email</div>
                          <div className="font-medium">{contactModal.contact?.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                          <Phone size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-300">Phone</div>
                          <div className="font-medium">{contactModal.contact?.mobile_number}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(`tel:${contactModal.contact?.mobile_number}`, '_self')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-2"
                    >
                      <Phone size={16} />
                      <span>Call Now</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(`mailto:${contactModal.contact?.email}`, '_self')}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-2"
                    >
                      <Mail size={16} />
                      <span>Email</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransportPage;
