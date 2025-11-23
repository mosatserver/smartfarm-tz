import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, MessageSquare, MapPin, DollarSign, User, Calendar, LogOut, ArrowLeft, Trash2, Package, Star, Heart, Eye, Filter, Search, Zap, Sparkles, Phone, Mail, Menu, X, ChevronDown, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';
import UploadForm from '../components/UploadForm';
import { useAuth } from '../contexts/AuthContext';
import paymentProvidersService from '../services/paymentProvidersService';

const MarketplacePage = () => {
  const [posts, setPosts] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [contactModal, setContactModal] = useState({ show: false, contact: null, loading: false });
  const [bargainModal, setBargainModal] = useState({ show: false, contact: null, loading: false, postId: null, originalPrice: null });
  const [purchaseModal, setPurchaseModal] = useState({ 
    show: false, 
    post: null, 
    step: 1, // 1: quantity, 2: payment provider
    quantity: 1,
    paymentProvider: '',
    loading: false
  });
  const [paymentProviders, setPaymentProviders] = useState([]);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated
  const isAuthenticated = user !== null;

  useEffect(() => {
    fetchPosts();
    loadPaymentProviders();
  }, []);

  const loadPaymentProviders = async () => {
    try {
      const providersData = await paymentProvidersService.getPaymentProviders();
      
      const allProviders = [
        ...(providersData.banks || []).map(p => ({ ...p, type: 'bank' })),
        ...(providersData.mobile_money || []).map(p => ({ ...p, type: 'mobile' })),
        ...(providersData.gateways || []).map(p => ({ ...p, type: 'gateway' }))
      ];
      
      setPaymentProviders(allProviders);
    } catch (error) {
      console.error('Failed to load payment providers:', error);
      // Set empty array as fallback to prevent undefined errors
      setPaymentProviders([]);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace');
      
      if (response.data.success) {
        console.log('Fetched posts:', response.data.posts);
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    fetchPosts();
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announcement.trim()) return;

    try {
      const response = await api.post('/marketplace/announce', { title: announcement });

      if (response.data.success) {
        setAnnouncement('');
        setShowAnnouncementForm(false);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error posting announcement:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await api.delete(`/marketplace/${postId}`);
      
      if (response.data.success) {
        // Remove the post from the local state
        setPosts(posts.filter(post => post.id !== postId));
        console.log('✅ Post deleted successfully');
      }
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      alert('Failed to delete post. Please try again.');
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
    return new Intl.NumberFormat('sw-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(price);
  };

  const handleContactClick = async (postId) => {
    try {
      setContactModal({ show: true, contact: null, loading: true });
      const response = await api.get(`/marketplace/${postId}/contact`);
      
      if (response.data.success) {
        setContactModal({ show: true, contact: response.data.contact, loading: false });
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
      setContactModal({ show: false, contact: null, loading: false });
      alert('Failed to fetch contact details. Please try again.');
    }
  };

  const handleBargainClick = async (postId) => {
    try {
      const post = posts.find(p => p.id === postId);
      setBargainModal({ show: true, contact: null, loading: true, postId, originalPrice: post?.price });
      const response = await api.get(`/marketplace/${postId}/contact`);
      
      if (response.data.success) {
        setBargainModal({ show: true, contact: response.data.contact, loading: false, postId, originalPrice: post?.price });
      }
    } catch (error) {
      console.error('Error fetching contact details for bargain:', error);
      setBargainModal({ show: false, contact: null, loading: false, postId: null, originalPrice: null });
      alert('Failed to fetch contact details. Please try again.');
    }
  };

  const handleStartChatBargain = () => {
    const post = posts.find(p => p.id === bargainModal.postId);
    if (!post) return;

    // Prepare the bargaining message with product details
    const bargainMessage = `Hi! I'm interested in bargaining for this product:\n\n📦 Product: ${post.title}\n💰 Current Price: TZS ${post.price?.toLocaleString('en-US')}\n📍 Location: ${post.location_address || 'Not specified'}\n\nPlease let's bargain on this product. I would like to discuss a better price. Thank you!`;
    
    // Store the bargaining context in localStorage for the chat page to pick up
    const bargainContext = {
      productId: post.id,
      productTitle: post.title,
      productPrice: post.price,
      productImage: post.image_url,
      sellerId: post.user_id,
      sellerContact: bargainModal.contact,
      message: bargainMessage,
      timestamp: Date.now()
    };
    
    localStorage.setItem('chatBargainContext', JSON.stringify(bargainContext));
    
    // Close the modal
    setBargainModal({ show: false, contact: null, loading: false, postId: null, originalPrice: null });
    
    // Navigate to chat page
    navigate('/chat');
  };

  const handleBuyClick = (postId) => {
    const post = posts.find(p => p.id === postId);
    setPurchaseModal({
      show: true,
      post,
      step: 1,
      quantity: 1,
      paymentProvider: '',
      loading: false
    });
  };

  const handleQuantitySubmit = () => {
    setPurchaseModal(prev => ({ ...prev, step: 2 }));
  };

  const handlePaymentMethodSelect = (method) => {
    setPurchaseModal(prev => ({ ...prev, paymentMethod: method, step: 3 }));
  };

  const handlePaymentProviderSelect = (provider) => {
    setPurchaseModal(prev => ({ ...prev, paymentProvider: provider }));
  };

  const handlePurchaseSubmit = async () => {
    try {
      setPurchaseModal(prev => ({ ...prev, loading: true }));
      
      // Find the selected provider to determine its type
      const selectedProvider = paymentProviders.find(p => p.id === purchaseModal.paymentProvider);
      
      const purchaseData = {
        productId: purchaseModal.post.id,
        quantity: purchaseModal.quantity,
        paymentMethod: selectedProvider?.type || 'unknown',
        paymentProvider: purchaseModal.paymentProvider,
        totalAmount: purchaseModal.post.price * purchaseModal.quantity
      };

      const response = await api.post('/marketplace/purchase', purchaseData);
      
      if (response.data.success) {
        alert('Purchase successful! You will receive payment instructions shortly.');
        setPurchaseModal({ 
          show: false, 
          post: null, 
          step: 1, 
          quantity: 1,
          paymentProvider: '',
          loading: false
        });
      } else {
        alert('Purchase failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error processing purchase:', error);
      alert('Failed to process purchase. Please try again.');
    } finally {
      setPurchaseModal(prev => ({ ...prev, loading: false }));
    }
  };

  const resetPurchaseModal = () => {
    setPurchaseModal({ 
      show: false, 
      post: null, 
      step: 1, 
      quantity: 1,
      paymentProvider: '',
      loading: false
    });
  };

  const handleLikeClick = async (postId, isCurrentlyLiked) => {
    try {
      const endpoint = isCurrentlyLiked ? 'unlike' : 'like';
      const response = await api.post(`/marketplace/${postId}/${endpoint}`);
      
      if (response.data.success) {
        // Update the posts state to reflect the like change
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

  const categories = [
    { name: 'Vegetables', emoji: '🥬', color: 'from-green-500 to-emerald-600' },
    { name: 'Fruits', emoji: '🍎', color: 'from-red-500 to-pink-600' },
    { name: 'Fresh Nuts', emoji: '🥜', color: 'from-yellow-600 to-orange-600' },
    { name: 'Juices', emoji: '🥤', color: 'from-orange-500 to-red-500' },
    { name: 'Eggs', emoji: '🥚', color: 'from-yellow-500 to-amber-600' },
    { name: 'Healthy', emoji: '💚', color: 'from-green-600 to-teal-600' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredPosts = posts.filter(post => {
    if (selectedCategory === 'all') return true;
    return post.post_type === selectedCategory;
  });

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Header with Frosted Glass Effect */}
      <header className="backdrop-blur-md bg-white/70 border-b border-white/20 sticky top-0 z-40">
        {/* Navigation Bar */}
        <nav className="px-4 md:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo with Neumorphism */}
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-white to-gray-100 rounded-2xl p-3 shadow-[8px_8px_16px_#d1d9e6,-8px_-8px_16px_#ffffff] border border-white/50">
                <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  SmartFarm
                </Link>
              </div>
            </div>

            {/* Navigation Menu with Neumorphism */}
            <div className="hidden lg:flex items-center space-x-2">
              {[
                { name: 'Home', path: '/', active: false },
                { name: 'Products', path: '/marketplace', active: true },
                { name: 'Cart', path: '/cart', active: false }
              ].map((item) => (
                <Link 
                  key={item.name}
                  to={item.path} 
                  className={`px-4 py-2 rounded-xl transition-all duration-300 font-medium text-sm md:text-base ${
                    item.active 
                      ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'
                      : 'bg-white/60 text-gray-800 hover:bg-white/90 shadow-[2px_2px_4px_rgba(0,0,0,0.12),-2px_-2px_4px_rgba(255,255,255,0.9)] hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right Side Controls with Neumorphism */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 md:space-x-3 bg-white/70 backdrop-blur-sm rounded-2xl px-3 md:px-4 py-2 shadow-[4px_4px_8px_rgba(0,0,0,0.12),-4px_-4px_8px_rgba(255,255,255,0.9)]">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-inner">
                    <User className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-700 font-medium hidden sm:block">{user.firstName}</span>
                  <button 
                    onClick={logout} 
                    className="text-xs md:text-sm bg-gradient-to-r from-red-500 to-pink-600 text-white px-2 md:px-3 py-1 rounded-lg shadow-[2px_2px_4px_rgba(0,0,0,0.2)] hover:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)] transition-all font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/" className="flex items-center space-x-1 md:space-x-2 bg-white/70 backdrop-blur-sm rounded-2xl px-3 md:px-4 py-2 text-gray-800 hover:bg-white/90 shadow-[4px_4px_8px_rgba(0,0,0,0.12),-4px_-4px_8px_rgba(255,255,255,0.9)] transition-all">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm font-medium hidden sm:block">Login</span>
                </Link>
              )}
              <div className="w-9 h-9 md:w-10 md:h-10 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[4px_4px_8px_rgba(0,0,0,0.12),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] transition-all cursor-pointer">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content with Gradient Background */}
      <main className="min-h-screen">
        {/* Collection Header with Neumorphism */}
        <section className="py-8 md:py-12 relative">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 md:p-6 lg:p-8 shadow-[20px_20px_40px_rgba(0,0,0,0.12),-20px_-20px_40px_rgba(255,255,255,0.9)] border border-white/40"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 lg:mb-8">
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-700 to-purple-700 bg-clip-text text-transparent mb-2">
                    2025 Collection
                  </h1>
                  <p className="text-gray-700 text-base md:text-lg font-medium">Discover fresh, organic products from local farmers</p>
                </div>
                
                <div className="flex items-center justify-center lg:justify-end space-x-3 lg:space-x-4">
                  {/* Add Product Buttons with Neumorphism */}
                  {user && (user.userType === 'farmer' || user.userType === 'farm inputs seller') && (
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowUploadForm(true)}
                      className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-semibold text-sm md:text-base shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.25)] transition-all duration-300"
                    >
                      <Upload className="w-5 h-5 inline mr-2" />
                      Add Product
                    </motion.button>
                  )}
                  {user && user.userType === 'buyer' && (
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAnnouncementForm(true)}
                      className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-semibold text-sm md:text-base shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.25)] transition-all duration-300"
                    >
                      <MessageSquare className="w-5 h-5 inline mr-2" />
                      Post Request
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-md placeholder-gray-600 text-gray-900 font-medium"
                  />
                </div>
              </div>
              <div className="text-sm text-gray-800 font-semibold">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredPosts.length)} of {filteredPosts.length} Items
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {/* Add Post Buttons */}
                {user && (user.userType === 'farmer' || user.userType === 'farm inputs seller') && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium"
                  >
                    <Upload size={14} />
                    <span className="hidden sm:inline">Add Product</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                )}
                
                {user && user.userType === 'buyer' && (
                  <button
                    onClick={() => setShowAnnouncementForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-medium"
                  >
                    <MessageSquare size={14} />
                    <span className="hidden sm:inline">Post Request</span>
                    <span className="sm:hidden">Request</span>
                  </button>
                )}
                
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border-2 border-gray-400 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-md font-semibold text-gray-900"
                >
                  <option value="default">Default Sorting</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : paginatedPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
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
                    className="bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden group border border-white/30 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.8)] hover:shadow-[16px_16px_32px_rgba(0,0,0,0.15),-16px_-16px_32px_rgba(255,255,255,0.9)] transition-all duration-500"
                  >
                    {/* Product Image */}
                    <div className="relative h-48 overflow-hidden">
                      {post.image_url ? (
                        <img
                          src={`http://localhost:5000${post.image_url}`}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' /%3E%3C/svg%3E";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-4xl text-gray-400">🌱</span>
                        </div>
                      )}
                      
                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                          post.post_type === 'crop' ? 'bg-green-500' :
                          post.post_type === 'input' ? 'bg-blue-500' : 'bg-purple-500'
                        }`}>
                          {post.post_type === 'crop' ? 'Veg' : 
                           post.post_type === 'input' ? 'Input' : 'Req'}
                        </span>
                      </div>
                      
                      {/* Delete Button */}
                      {user && user.id === post.user_id && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Delete post"
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
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 text-base leading-tight">
                        {post.title}
                      </h3>
                      
                      {/* Price */}
                      {post.price && (
                        <div className="flex items-center space-x-1 mb-2">
                          <span 
                            className="text-xl font-bold text-green-700"
                            style={{
                              // Edge-specific overrides for prices
                              color: navigator.userAgent.includes('Edg') ? '#047857' : undefined,
                              fontWeight: navigator.userAgent.includes('Edg') ? '900' : undefined,
                              textShadow: navigator.userAgent.includes('Edg') ? '0 1px 3px rgba(255, 255, 255, 0.9)' : undefined
                            }}
                          >
                            TZS {post.price.toLocaleString('en-US')}
                          </span>
                          {post.quantity && (
                            <span className="text-sm text-gray-700 font-medium">/ {post.unit || 'kg'}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Location and Date */}
                      <div className="text-sm text-gray-700 mb-3 space-y-1.5 font-medium">
                        {post.location_address && (
                          <div className="flex items-center space-x-2">
                            <MapPin size={12} className="text-blue-600" />
                            <span className="truncate">{post.location_address}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <Calendar size={12} className="text-green-600" />
                          <span>{formatDate(post.created_at).split(',')[0]}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center space-x-3 mt-4">
                        <button 
                          onClick={() => handleContactClick(post.id)}
                          className="w-12 h-12 bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 rounded-full transition-all duration-300 flex items-center justify-center shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] group border-2 border-blue-200"
                          title="Contact Seller"
                        >
                          <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleBargainClick(post.id)}
                          className="w-12 h-12 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 hover:text-yellow-800 rounded-full transition-all duration-300 flex items-center justify-center shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] group border-2 border-yellow-200"
                          title="Bargain Price"
                        >
                          <DollarSign size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleBuyClick(post.id)}
                          className="w-12 h-12 bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800 rounded-full transition-all duration-300 flex items-center justify-center shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1)] group border-2 border-green-200"
                          title="Buy Now"
                        >
                          <ShoppingCart size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                      
                      {/* Likes Count */}
                      {post.likes_count > 0 && (
                        <div className="flex items-center justify-center mt-3 text-sm text-gray-700 font-medium">
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
                  <Package size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Be the first to add a product to our marketplace!</p>
                {user && (user.userType === 'farmer' || user.userType === 'farm inputs seller') && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Add Your First Product
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
                          ? 'bg-green-600 text-white'
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

        {/* Footer with Neumorphism */}
        <footer className="relative mt-16 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white overflow-hidden">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-blue-900/10 to-purple-900/20"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
          
          <div className="relative backdrop-blur-sm py-16">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* SmartFarm Brand Section */}
                <div className="lg:col-span-1">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]"
                  >
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]">
                        <span className="text-xl">🌾</span>
                      </div>
                      <div>
                        <div className="font-bold text-2xl bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                          SmartFarm
                        </div>
                        <div className="text-sm text-green-300 font-medium">Tanzania</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed mb-4">
                      Connecting Tanzanian farmers with buyers through innovative technology. 
                      Building sustainable agricultural communities for a better tomorrow.
                    </p>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Platform Features */}
                <div>
                  <h4 className="font-bold text-lg mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Platform Features
                  </h4>
                  <ul className="space-y-3">
                    {[
                      { name: 'Marketplace', desc: 'Buy & Sell Products' },
                      { name: 'Smart Analytics', desc: 'Market Insights' },
                      { name: 'Community', desc: 'Farmer Network' },
                      { name: 'Weather Info', desc: 'Real-time Updates' },
                      { name: 'Price Tracking', desc: 'Market Trends' },
                      { name: 'Mobile App', desc: 'On-the-go Access' }
                    ].map((item, index) => (
                      <motion.li 
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group"
                      >
                        <Link 
                          to={`/${item.name.toLowerCase().replace(' ', '-')}`} 
                          className="flex items-center space-x-3 text-sm text-gray-300 hover:text-white transition-all duration-300 p-2 rounded-xl hover:bg-white/5"
                        >
                          <div className="w-1.5 h-1.5 bg-gradient-to-r from-green-400 to-blue-500 rounded-full group-hover:scale-125 transition-transform"></div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.desc}</div>
                          </div>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                
                {/* Support & Resources */}
                <div>
                  <h4 className="font-bold text-lg mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Support & Resources
                  </h4>
                  <ul className="space-y-3">
                    {[
                      { name: 'Help Center', desc: 'Get Assistance' },
                      { name: 'Farmer Support', desc: '24/7 Helpline' },
                      { name: 'Training Programs', desc: 'Skill Development' },
                      { name: 'Documentation', desc: 'User Guides' },
                      { name: 'Community Forum', desc: 'Discussion' },
                      { name: 'Success Stories', desc: 'Testimonials' }
                    ].map((item, index) => (
                      <motion.li 
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group"
                      >
                        <Link 
                          to={`/${item.name.toLowerCase().replace(' ', '-')}`} 
                          className="flex items-center space-x-3 text-sm text-gray-300 hover:text-white transition-all duration-300 p-2 rounded-xl hover:bg-white/5"
                        >
                          <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full group-hover:scale-125 transition-transform"></div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-400">{item.desc}</div>
                          </div>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                
                {/* Contact & Connect */}
                <div>
                  <h4 className="font-bold text-lg mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Connect With Us
                  </h4>
                  
                  {/* Contact Info */}
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 mb-6 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.02)]">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                          <MapPin size={14} className="text-green-400" />
                        </div>
                        <span>Dar es Salaam, Tanzania</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                          <Phone size={14} className="text-blue-400" />
                        </div>
                        <span>+255 123 456 789</span>
                      </div>
                      <div className="flex items-center space-x-3 text-gray-300">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                          <Mail size={14} className="text-purple-400" />
                        </div>
                        <span>info@smartfarm.co.tz</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mobile Apps */}
                  <div className="space-y-3">
                    <h5 className="font-semibold text-sm text-gray-300 mb-3">Download Our App</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 hover:bg-white/15 transition-all duration-300 text-center shadow-[2px_2px_4px_rgba(0,0,0,0.3)]"
                      >
                        <div className="text-lg mb-1">📱</div>
                        <div className="text-xs text-gray-300">Play Store</div>
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 hover:bg-white/15 transition-all duration-300 text-center shadow-[2px_2px_4px_rgba(0,0,0,0.3)]"
                      >
                        <div className="text-lg mb-1">🍎</div>
                        <div className="text-xs text-gray-300">App Store</div>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom Section */}
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="border-t border-white/10 mt-12 pt-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                  <div className="text-sm text-gray-400">
                    © 2025 SmartFarm Tanzania. Empowering Agricultural Communities.
                  </div>
                  <div className="flex items-center space-x-6">
                    <Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                      Terms of Service
                    </Link>
                    <Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                      Privacy Policy
                    </Link>
                    <Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors hover:underline">
                      Cookie Policy
                    </Link>
                  </div>
                </div>
                
                {/* Mission Statement */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-400 italic">
                    "Building bridges between farmers and markets, fostering sustainable agriculture across Tanzania."
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </footer>
      </main>

    {/* Modals */}
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
            initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateX: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 25px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            <UploadForm
              userRole={user?.userType}
              onSuccess={handleUploadSuccess}
              onCancel={() => setShowUploadForm(false)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showAnnouncementForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAnnouncementForm(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 25px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            <motion.h3 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent"
            >
              📢 Post Announcement
            </motion.h3>
            <form onSubmit={handleAnnouncementSubmit}>
              <motion.textarea
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="What are you looking for? (e.g., Looking for maize at competitive prices)"
                className="w-full p-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 mb-6 h-32 resize-none text-white placeholder-white/60 shadow-inner transition-all duration-300"
                required
              />
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-6 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20"
                >
                  ✨ Post Announcement
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setShowAnnouncementForm(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-xl transition-all duration-300 font-semibold backdrop-blur-md border border-white/20"
                >
                  Cancel
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

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
            initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-teal-200 to-green-200 bg-clip-text text-transparent">
              📞 Contact Details
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
                        <div className="font-medium">{contactModal.contact.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                        <Phone size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-300">Phone</div>
                        <div className="font-medium">{contactModal.contact.mobile_number}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(`tel:${contactModal.contact.mobile_number}`, '_self')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-2"
                  >
                    <Phone size={16} />
                    <span>Call Now</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(`mailto:${contactModal.contact.email}`, '_self')}
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

    <AnimatePresence>
      {bargainModal.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setBargainModal({ show: false, contact: null, loading: false, postId: null, originalPrice: null })}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
              💰 Bargain & Contact
            </h3>
            {bargainModal.loading ? (
              <div className="text-white flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="ml-3">Loading...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Original Price Display */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Current Price</div>
                    <div className="text-2xl font-bold text-green-400">
                      TZS {bargainModal.originalPrice?.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Seller Contact Info */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-sm text-gray-300 mb-3">Seller Contact</div>
                  <div className="space-y-3 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400/30 to-blue-500/30 rounded-lg flex items-center justify-center">
                        <Mail size={16} className="text-green-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-300">Email</div>
                        <div className="font-medium text-sm">{bargainModal.contact.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-lg flex items-center justify-center">
                        <Phone size={16} className="text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-300">Phone</div>
                        <div className="font-medium text-sm">{bargainModal.contact.mobile_number}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Chat Bargain Button - Primary Action */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartChatBargain}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white py-4 px-4 rounded-xl transition-all duration-300 font-bold text-base shadow-xl backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-3 relative overflow-hidden"
                  >
                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-red-600/20 animate-pulse"></div>
                    <div className="relative flex items-center space-x-3">
                      <MessageSquare size={20} className="animate-bounce" />
                      <span>Start to Bargain on Chat 💬</span>
                      <span className="text-lg animate-pulse">🚀</span>
                    </div>
                  </motion.button>
                  
                  {/* Alternative Contact Methods */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(`tel:${bargainModal.contact.mobile_number}`, '_self')}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-2"
                    >
                      <Phone size={16} />
                      <span>Call</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const subject = encodeURIComponent('Price Negotiation Request');
                        const body = encodeURIComponent(`Hi! I'm interested in your product listed for TZS ${bargainModal.originalPrice?.toLocaleString('en-US')}. Could we discuss the price? Thank you!`);
                        window.open(`mailto:${bargainModal.contact.email}?subject=${subject}&body=${body}`, '_self');
                      }}
                      className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 flex items-center justify-center space-x-2"
                    >
                      <DollarSign size={16} />
                      <span>Email</span>
                    </motion.button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-400 italic">
                    💡 Start a chat conversation for real-time bargaining, or use traditional contact methods!
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {purchaseModal.show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={resetPurchaseModal}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="backdrop-blur-2xl bg-white/10 rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step 1: Quantity Selection */}
            {purchaseModal.step === 1 && (
              <div>
                <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-green-200 to-blue-200 bg-clip-text text-transparent">
                  🛒 Purchase Product
                </h3>
                
                {/* Product Info */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-6">
                  <h4 className="text-white font-semibold mb-2">{purchaseModal.post?.title}</h4>
                  <div className="text-green-400 font-bold text-lg">
                    TZS {purchaseModal.post?.price?.toLocaleString('en-US')} / {purchaseModal.post?.unit || 'kg'}
                  </div>
                  {purchaseModal.post?.quantity && (
                    <div className="text-gray-300 text-sm mt-1">
                      Available: {purchaseModal.post.quantity} {purchaseModal.post?.unit || 'kg'}
                    </div>
                  )}
                </div>

                {/* Quantity Input */}
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">
                    Select Quantity
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setPurchaseModal(prev => ({ 
                        ...prev, 
                        quantity: Math.max(1, prev.quantity - 1) 
                      }))}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={purchaseModal.post?.quantity || 999}
                      value={purchaseModal.quantity}
                      onChange={(e) => setPurchaseModal(prev => ({ 
                        ...prev, 
                        quantity: Math.max(1, parseInt(e.target.value) || 1) 
                      }))}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center font-semibold focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50"
                    />
                    <button
                      onClick={() => setPurchaseModal(prev => ({ 
                        ...prev, 
                        quantity: Math.min(prev.post?.quantity || 999, prev.quantity + 1) 
                      }))}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 mb-6">
                  <div className="text-center">
                    <div className="text-gray-300 text-sm">Total Amount</div>
                    <div className="text-2xl font-bold text-green-400">
                      TZS {((purchaseModal.post?.price || 0) * purchaseModal.quantity).toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetPurchaseModal}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold backdrop-blur-md border border-white/20"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleQuantitySubmit}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20"
                  >
                    Continue
                  </motion.button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Provider Selection */}
            {purchaseModal.step === 2 && (
              <div>
                <h3 className="text-2xl font-bold mb-6 text-white bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">
                  💳 Select Payment Provider
                </h3>
                
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {paymentProviders.length > 0 ? (
                    paymentProviders.map((provider) => {
                      // Get provider icon with proper logo support
                      const getProviderIcon = (provider) => {
                        // Use logoAlt if available, otherwise fall back to pattern-based path
                        const logoPath = provider.logoAlt || `/api/images/logos/${provider.id}-logo.svg`;
                        
                        return (
                          <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/80 border-2 border-white/50 shadow-lg flex items-center justify-center">
                            <img
                              src={logoPath}
                              alt={provider.name}
                              className="w-14 h-14 object-contain"
                              onError={(e) => {
                                // Fallback to emoji icon
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-3xl" style={{ display: 'none' }}>
                              {provider.logo || (
                                provider.type === 'bank' ? '🏦' :
                                provider.type === 'mobile' ? '📱' :
                                provider.type === 'gateway' ? '💳' : '💰'
                              )}
                            </div>
                          </div>
                        );
                      };

                      const getProviderBgColor = (type, isSelected) => {
                        if (isSelected) {
                          switch (type) {
                            case 'bank': return 'bg-blue-500/30 border-blue-400/50';
                            case 'mobile': return 'bg-green-500/30 border-green-400/50';
                            case 'gateway': return 'bg-purple-500/30 border-purple-400/50';
                            default: return 'bg-gray-500/30 border-gray-400/50';
                          }
                        }
                        return 'bg-white/10 hover:bg-white/20 border-white/20';
                      };

                      return (
                        <motion.button
                          key={provider.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handlePaymentProviderSelect(provider.id)}
                          className={`w-full p-3 rounded-xl transition-all duration-300 border flex items-center space-x-3 text-white ${
                            getProviderBgColor(provider.type, purchaseModal.paymentProvider === provider.id)
                          }`}
                        >
                          {getProviderIcon(provider)}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{provider.name}</div>
                            {provider.description && (
                              <div className="text-xs text-gray-300 mt-1 line-clamp-1">
                                {provider.description}
                              </div>
                            )}
                          </div>
                          {provider.type === 'gateway' && (
                            <span className="text-xs bg-purple-500/30 px-2 py-1 rounded-full">
                              Gateway
                            </span>
                          )}
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="text-white text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
                      <p>Loading payment providers...</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPurchaseModal(prev => ({ ...prev, step: 1 }))}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl transition-all duration-300 font-semibold backdrop-blur-md border border-white/20"
                  >
                    ← Back
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePurchaseSubmit}
                    disabled={!purchaseModal.paymentProvider || purchaseModal.loading}
                    className={`flex-1 py-3 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm border border-white/20 ${
                      !purchaseModal.paymentProvider || purchaseModal.loading
                        ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white'
                    }`}
                  >
                    {purchaseModal.loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Complete Purchase'
                    )}
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

export default MarketplacePage;
