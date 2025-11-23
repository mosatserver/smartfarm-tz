import React, { useState, useEffect } from 'react';
import { useToast } from './contexts/ToastContext';
import logo from './images/logo.jpg';
import landing1 from './images/landing1.jpg';
import landing2 from './images/landing2.jpg';
import landing3 from './images/landing3.jpg';
import landing4 from './images/landing4.jpg';
import landing5 from './images/landing5.jpg';

export default function LandingPage() {
  const { showToast } = useToast();
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userType: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const bgImages = [landing1, landing2, landing3, landing4, landing5];
  const fullText = "Empowering Tanzanian Farmers with Smart Agriculture";

  const toggleLogoModal = () => {
    setIsLogoModalOpen(!isLogoModalOpen);
  };

  // ONLY THIS FUNCTION ADDED
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Signup modal functions
  const toggleSignupModal = () => {
    setIsSignupModalOpen(!isSignupModalOpen);
    setShowLogin(false);
    setFormErrors({});
    setSignupData({
      firstName: '',
      lastName: '',
      email: '',
      userType: '',
      mobileNumber: '',
      password: '',
      confirmPassword: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!signupData.firstName.trim()) errors.firstName = 'First name is required';
    if (!signupData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!signupData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!signupData.userType) errors.userType = 'Please select a user type';
    if (!signupData.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile number is required';
    } else if (!/^[+]?[0-9]{10,15}$/.test(signupData.mobileNumber.replace(/\s/g, ''))) {
      errors.mobileNumber = 'Please enter a valid mobile number';
    }
    if (!signupData.password) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(signupData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    if (!signupData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: signupData.firstName,
            lastName: signupData.lastName,
            email: signupData.email,
            userType: signupData.userType,
            mobileNumber: signupData.mobileNumber,
            password: signupData.password,
            confirmPassword: signupData.confirmPassword
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Extract token and user data from server response
          const token = data.data?.token;
          const userData = {
            userId: data.data?.userId,
            firstName: data.data?.firstName,
            lastName: data.data?.lastName,
            email: data.data?.email,
            userType: data.data?.userType
          };
          
          if (token) {
            // Store token and user data in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            showToast({ type: 'success', message: 'Account created successfully! Welcome to SmartFarm TZ!' });
            toggleSignupModal();
          } else {
            showToast({ type: 'error', message: 'Registration successful but no token received.' });
          }
        } else {
          // Handle validation errors
          if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map(error => error.msg).join('\n');
            showToast({ type: 'error', message: `Registration failed: ${errorMessages}` });
          } else {
            showToast({ type: 'error', message: data.message || 'Registration failed. Please try again.' });
          }
        }
      } catch (error) {
        console.error('Registration error:', error);
showToast({ type: 'error', message: 'Network error. Please check your connection and try again.' });
      }
    }
  };

  const switchToLogin = () => {
    setShowLogin(true);
  };

  const openLoginModal = () => {
    setIsSignupModalOpen(true);
    setShowLogin(true);
    setFormErrors({});
    setSignupData({
      firstName: '',
      lastName: '',
      email: '',
      userType: '',
      mobileNumber: '',
      password: '',
      confirmPassword: ''
    });
    setLoginData({
      email: '',
      password: ''
    });
  };

  const handleLoginInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const errors = {};
    if (!loginData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!loginData.password) {
      errors.password = 'Password is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      console.log('Sending login request:', {
        email: loginData.email,
        password: '***' // Don't log password
      });

      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password
        }),
      });

      console.log('Response details:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries([...response.headers])
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response:', textResponse);
        showToast({ type: 'error', message: 'Server returned invalid response format' });
        return;
      }

      const data = await response.json();
      console.log('Parsed response data:', data);
      console.log('Full login response:', { 
        status: response.status, 
        ok: response.ok, 
        data,
        hasToken: !!(data.token || data.access_token || data.authToken),
        hasUser: !!(data.user || data.userData)
      });

      // Check for successful response - handle server's data structure
      if (response.ok) {
        // The server returns: { success: true, data: { token, userId, firstName, ... } }
        const token = data.data?.token || data.token || data.access_token || data.authToken || data.accessToken;
        const user = data.data || data.user || data.userData || data;
        
        console.log('Extracted data:', { 
          token: !!token, 
          tokenValue: token ? token.substring(0, 20) + '...' : 'None found',
          user: !!user, 
          userKeys: Object.keys(user || {}),
          dataStructure: {
            hasSuccess: !!data.success,
            hasData: !!data.data,
            dataKeys: data.data ? Object.keys(data.data) : 'No data object'
          }
        });
        
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          showToast({ type: 'success', message: `Welcome back, ${user?.firstName || user?.name || user?.email || 'User'}! You have successfully logged in.` });
          toggleSignupModal();
          return; // Exit successfully
        } else {
          console.warn('No token found in successful response. Available fields:', Object.keys(data));
          showToast({ type: 'error', message: 'Login successful but no authentication token received.' });
          return;
        }
      }
      
      // Handle error responses
      console.log('Login failed - analyzing error response:', data);
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessages = data.errors.map(error => error.msg || error.message || error).join('\n');
        showToast({ type: 'error', message: `Login failed: ${errorMessages}` });
      } else if (data.error || data.message) {
        showToast({ type: 'error', message: data.error || data.message });
      } else {
        showToast({ type: 'error', message: 'Login failed. Please check your credentials and try again.' });
      }
      
    } catch (error) {
      console.error('Login error (catch block):', error);
      if (error.name === 'SyntaxError') {
        showToast({ type: 'error', message: 'Server returned invalid response. Please try again.' });
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showToast({ type: 'error', message: 'Cannot connect to server. Please check if the server is running.' });
      } else {
        showToast({ type: 'error', message: 'Network error. Please check your connection and try again.' });
      }
    }
  };

  // Background slideshow effect with enhanced transition
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % bgImages.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [bgImages.length]);

  // Enhanced typewriter effect with completion state
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 30);

      return () => clearTimeout(timeout);
    } else {
      setIsTypingComplete(true);
    }
  }, [currentIndex, fullText]);

  // Reset animation when text changes
  useEffect(() => {
    setCurrentIndex(0);
    setDisplayText('');
    setIsTypingComplete(false);
  }, [fullText]);

  return (
    <div className="min-h-screen text-gray-800 relative overflow-hidden">
      {/* Logo Modal - EXACTLY THE SAME */}
      {isLogoModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg transition-all duration-300"
          onClick={toggleLogoModal}
        >
          <div className="relative max-w-2xl p-4" onClick={e => e.stopPropagation()}>
            <img 
              src={logo} 
              alt="SmartFarm Logo" 
              className="max-h-[90vh] max-w-full rounded-xl shadow-2xl transform transition-transform duration-300 hover:scale-105"
            />
            <button 
              className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-xl hover:bg-gray-100 transition-colors duration-200"
              onClick={toggleLogoModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Background Slideshow - EXACTLY THE SAME */}
      <div className="fixed inset-0 -z-50 overflow-hidden">
        {bgImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out ${index === currentBgIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
            style={{ 
              backgroundImage: `url(${image})`,
              filter: 'blur(4px) brightness(0.9)'
            }}
          ></div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30"></div>
      </div>

      {/* Content Container - EXACTLY THE SAME STRUCTURE */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header - ONLY MODIFIED TO ADD HAMBURGER */}
        <header className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-lg shadow-lg sticky top-0 transition-all duration-300 hover:bg-white/20">
          <div className="flex items-center">
            <button 
              onClick={toggleLogoModal} 
              className="focus:outline-none transform transition-transform duration-300 hover:scale-110"
            >
              <img 
                src={logo} 
                alt="SmartFarm Logo" 
                className="h-12 w-12 rounded-full object-cover mr-3 border-2 border-white/80 shadow-lg"
              />
            </button>
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">SmartFarm TZ</h1>
          </div>

          {/* Desktop Navigation - EXACTLY THE SAME */}
          <nav className="hidden md:flex space-x-6 text-sm font-medium">
            <a href="/" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/weather" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Weather
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/marketplace" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Marketplace
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/academy" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Academy
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/disease-diagnosis" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              CropHealth
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/chat" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Chat
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="/transport" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Transport
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#" className="text-white/90 hover:text-white transition-colors duration-200 relative group">
              Loan
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
            <button 
              onClick={openLoginModal}
              className="px-3 py-1 bg-green-600/90 rounded-lg text-white hover:bg-green-700 transition-colors duration-200"
            >
              Login
            </button>
          </nav>

          {/* ONLY THIS HAMBURGER BUTTON ADDED */}
          <button 
            className="md:hidden text-white focus:outline-none"
            onClick={toggleMobileMenu}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* ONLY THIS MOBILE MENU ADDED (40% width) */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div 
              className="absolute inset-0 bg-black/30"
              onClick={toggleMobileMenu}
            ></div>
            <div className="absolute right-0 top-0 h-full w-2/5 bg-green-800/95 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col p-4 space-y-4">
                <a href="/" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Home
                </a>
                <a href="/weather" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Weather
                </a>
                <a href="/marketplace" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Marketplace
                </a>
                <a href="/academy" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Academy
                </a>
                <a href="/disease-diagnosis" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Crop Health
                </a>
                <a href="/chat" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Chat
                </a>
                <a href="/transport" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Transport
                </a>
                <a href="#" className="text-white py-2 px-3 rounded-lg hover:bg-white/10" onClick={toggleMobileMenu}>
                  Loan
                </a>
                <button 
                  onClick={() => {
                    toggleMobileMenu();
                    openLoginModal();
                  }}
                  className="mt-4 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full text-center"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern Signup Modal */}
        {isSignupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="relative bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <button 
                onClick={toggleSignupModal}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {!showLogin ? (
                /* Signup Form */
                <div className="p-6 sm:p-8 md:p-10">
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-green-100 rounded-full">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Join SmartFarm TZ</h2>
                    <p className="text-gray-600 text-sm md:text-base">Create your account and start your smart farming journey</p>
                  </div>

                  <form onSubmit={handleSignup} className="space-y-5">
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          value={signupData.firstName}
                          onChange={handleInputChange}
                          placeholder="First Name"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                            formErrors.firstName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                          }`}
                        />
                        {formErrors.firstName && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.firstName}</p>}
                      </div>
                      <div>
                        <input
                          type="text"
                          name="lastName"
                          value={signupData.lastName}
                          onChange={handleInputChange}
                          placeholder="Last Name"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                            formErrors.lastName ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                          }`}
                        />
                        {formErrors.lastName && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.lastName}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <input
                        type="email"
                        name="email"
                        value={signupData.email}
                        onChange={handleInputChange}
                        placeholder="Email Address"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                          formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                        }`}
                      />
                      {formErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.email}</p>}
                    </div>

                    {/* User Type */}
                    <div>
                      <select
                        name="userType"
                        value={signupData.userType}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                          formErrors.userType ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                        }`}
                      >
                        <option value="" disabled>Select Your Role</option>
                        <option value="farmer">🌾 Farmer</option>
                        <option value="buyer">🛒 Buyer</option>
                        <option value="transporter">🚛 Transporter</option>
                        <option value="farm inputs seller">🏪 Farm Inputs Seller</option>
                        <option value="expert">🎓 Expert/Instructor</option>
                      </select>
                      {formErrors.userType && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.userType}</p>}
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={signupData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder="Mobile Number (+255...)"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                          formErrors.mobileNumber ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                        }`}
                      />
                      {formErrors.mobileNumber && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.mobileNumber}</p>}
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <input
                          type="password"
                          name="password"
                          value={signupData.password}
                          onChange={handleInputChange}
                          placeholder="Password"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                            formErrors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                          }`}
                        />
                        {formErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.password}</p>}
                      </div>
                      <div>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={signupData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm Password"
                          className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                            formErrors.confirmPassword ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-400'
                          }`}
                        />
                        {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.confirmPassword}</p>}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300"
                    >
                      Create Account
                    </button>
                  </form>

                  {/* Login Link */}
                  <div className="text-center mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-600 text-sm">
                      Already have an account?{' '}
                      <button
                        onClick={switchToLogin}
                        className="text-green-600 hover:text-green-700 font-medium hover:underline transition-colors duration-200"
                      >
                        Sign In Here
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                /* Login Form */
                <div className="p-6 sm:p-8 md:p-10">
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
                    <p className="text-gray-600 text-sm md:text-base">Sign in to your SmartFarm TZ account</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <input
                        type="email"
                        name="email"
                        value={loginData.email}
                        onChange={handleLoginInputChange}
                        placeholder="Email Address"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                          formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                        }`}
                      />
                      {formErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <input
                        type="password"
                        name="password"
                        value={loginData.password}
                        onChange={handleLoginInputChange}
                        placeholder="Password"
                        className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white focus:outline-none transition-all duration-300 ${
                          formErrors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'
                        }`}
                      />
                      {formErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.password}</p>}
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                      Sign In
                    </button>
                  </form>

                  {/* Back to Signup */}
                  <div className="text-center mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-600 text-sm">
                      Don't have an account?{' '}
                      <button
                        onClick={() => setShowLogin(false)}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors duration-200"
                      >
                        Sign Up Here
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ALL OTHER SECTIONS REMAIN EXACTLY THE SAME */}
        <section className="flex-grow flex items-center justify-center text-center py-16 px-4 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm -z-10"></div>
          <div className="relative z-10 max-w-4xl">
            <button 
              onClick={toggleLogoModal} 
              className="focus:outline-none mb-8 transform transition-transform duration-500 hover:scale-110"
            >
              <img 
                src={logo} 
                alt="SmartFarm Logo" 
                className="h-40 w-40 rounded-full object-cover mx-auto border-4 border-white/80 shadow-2xl"
              />
            </button>
            <div className="mb-8 min-h-[120px] flex items-center justify-center">
              <h2 className="text-4xl md:text-6xl font-bold text-white drop-shadow-xl">
                {displayText}
                <span className={`inline-block w-1 h-12 ml-1 bg-white ${isTypingComplete ? 'animate-pulse' : 'opacity-0'}`}></span>
              </h2>
            </div>
            <p className="mb-10 text-xl text-white/90 max-w-2xl mx-auto animate-fade-in delay-1000">
              Join us to revolutionize farming with technology.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={toggleSignupModal}
                className="px-8 py-4 bg-green-600/90 text-white font-semibold rounded-xl shadow-lg hover:bg-green-700 transition-all duration-300 transform hover:-translate-y-1"
              >
                Get Started
              </button>
              <button className="px-8 py-4 bg-white/20 text-white font-semibold rounded-xl shadow-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1">
                Learn More
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-8 py-16 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm -z-10"></div>
          {[
            { title: 'Smart Weather Alerts', icon: 'sun', delay: 100 },
            { title: 'Agri Academy', icon: 'book', delay: 200 },
            { title: 'Farm Marketplace', icon: 'shopping-cart', delay: 300 },
            { title: 'Crop Diagnostics', icon: 'alert-triangle', delay: 400 },
            { title: 'Live Support', icon: 'message-circle', delay: 500 },
            { title: 'AI Planning', icon: 'cpu', delay: 600 },
            { title: 'Success Stories', icon: 'user', delay: 700 },
            { title: 'Rewards Program', icon: 'star', delay: 800 },
          ].map(({ title, icon, delay }) => (
            <div 
              key={title}
              className={`p-8 bg-white/15 backdrop-blur-md rounded-3xl shadow-lg hover:shadow-xl transition-all duration-500 border border-white/20 hover:border-white/40 transform hover:-translate-y-2 animate-fade-in-up`}
              style={{ animationDelay: `${delay}ms` }}
            >
              <div className="text-4xl mb-6 text-white flex justify-center">
                <i className={`lucide-${icon}`}></i>
              </div>
              <h3 className="text-xl font-semibold text-white text-center">{title}</h3>
            </div>
          ))}
        </section>

        <section className="px-6 py-24 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm -z-10"></div>
          <div className="relative z-10 max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-16 text-white">What Farmers Say</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  quote: "SmartFarm TZ has transformed how I plan and grow my crops. The weather alerts saved my harvest last season!",
                  author: "Juma, Farmer in Dodoma",
                  role: "Maize Farmer"
                },
                {
                  quote: "The marketplace connected me directly with buyers. I got 30% better prices than through middlemen!",
                  author: "Neema, Farmer in Arusha",
                  role: "Vegetable Grower"
                }
              ].map((testimonial, index) => (
                <div 
                  key={index}
                  className="bg-white/15 backdrop-blur-md p-8 rounded-3xl shadow-lg border border-white/20 transform transition-all duration-500 hover:scale-[1.02]"
                >
                  <p className="italic text-white/90 text-lg mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mr-4">
                      <span className="text-white text-xl">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{testimonial.author}</p>
                      <p className="text-white/70 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-green-800/70 backdrop-blur-lg text-white border-t border-white/20">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div>
                <div className="flex items-center mb-4">
                  <img 
                    src={logo} 
                    alt="SmartFarm Logo" 
                    className="h-12 w-12 rounded-full object-cover mr-3 border-2 border-white/80"
                  />
                  <h4 className="text-xl font-bold">SmartFarm TZ</h4>
                </div>
                <p className="text-white/80">Cultivating a brighter future for Tanzanian agriculture through technology and innovation.</p>
              </div>
              <div>
                <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
                <ul className="space-y-2">
                  {['About Us', 'Services', 'Marketplace', 'Academy'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-white/80 hover:text-white transition-colors duration-200">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-lg font-semibold mb-4">Resources</h5>
                <ul className="space-y-2">
                  {['Blog', 'FAQs', 'Weather Data', 'Crop Calendar'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-white/80 hover:text-white transition-colors duration-200">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-lg font-semibold mb-4">Contact Us</h5>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <i className="lucide-phone mr-2"></i>
                    <span className="text-white/80">+255 123 456 789</span>
                  </li>
                  <li className="flex items-center">
                    <i className="lucide-mail mr-2"></i>
                    <span className="text-white/80">info@smartfarmtz.com</span>
                  </li>
                </ul>
                <div className="flex space-x-4 mt-4">
                  {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                    <a key={social} href="#" className="text-white/80 hover:text-white transition-colors duration-200">
                      <i className={`lucide-${social}`}></i>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p>© 2025 SmartFarm TZ. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-white/80 hover:text-white transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors duration-200">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}