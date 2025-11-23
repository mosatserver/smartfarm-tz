const NodeGeocoder = require('node-geocoder');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Rate limiting utility
const rateLimiter = {
  lastCall: 0,
  minInterval: 1000, // 1 second between calls
  
  async delay() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastCall = Date.now();
  }
};

// Initialize multiple geocoder configurations
const geocoders = {
  osm: NodeGeocoder({
    provider: 'openstreetmap',
    httpAdapter: 'https',
    formatter: null,
    extra: {
      apikey: null,
      formatter: null
    },
    httpHeaders: {
      'User-Agent': 'SmartFarmTZ/1.0 (contact@smartfarm-tz.com)'
    },
    timeout: 10000
  }),
  
  // LocationIQ as backup (if API key is available)
  locationiq: process.env.LOCATIONIQ_API_KEY ? NodeGeocoder({
    provider: 'locationiq',
    httpAdapter: 'https',
    apiKey: process.env.LOCATIONIQ_API_KEY,
    formatter: null
  }) : null,
  
  // MapBox as backup (if API key is available)
  mapbox: process.env.MAPBOX_API_KEY ? NodeGeocoder({
    provider: 'mapbox',
    httpAdapter: 'https',
    apiKey: process.env.MAPBOX_API_KEY,
    formatter: null
  }) : null
};

// Cache for reverse geocoding results
const geocodeCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Create cache key for coordinates
const getCacheKey = (lat, lng, precision = 3) => {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
};

// Get cached result if available and not expired
const getCachedResult = (lat, lng) => {
  const key = getCacheKey(lat, lng);
  const cached = geocodeCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('✅ Using cached geocoding result for:', key);
    return cached.data;
  }
  return null;
};

// Cache successful geocoding results
const setCachedResult = (lat, lng, data) => {
  const key = getCacheKey(lat, lng);
  geocodeCache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log('💾 Cached geocoding result for:', key);
};

/**
 * Get location from coordinates or IP address
 * @param {Object} req - Express request object
 * @returns {Object} Location data with address, lat, lng
 */
const geocodeLocation = async (req) => {
  try {
    const { lat, lng } = req.body;
    
    console.log('📍 Location request received:', { lat, lng });

    // PRIORITY 1: If GPS coordinates are provided, use reverse geocoding
    if (lat && lng) {
      console.log('✅ GPS coordinates provided, using reverse geocoding');
      try {
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        
        // Validate coordinates
        if (isNaN(parsedLat) || isNaN(parsedLng) || 
            parsedLat < -90 || parsedLat > 90 || 
            parsedLng < -180 || parsedLng > 180) {
          console.error('❌ Invalid GPS coordinates:', { lat, lng });
        } else {
          // Try multiple geocoding methods
          let address = null;
          
          // Method 1: Try OpenStreetMap Nominatim with proper headers and delay
          try {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for rate limiting
            const result = await geocoders.osm.reverse({ lat: parsedLat, lon: parsedLng });
            if (result && result.length > 0) {
              const location = result[0];
              // Build detailed address from available components
              const addressParts = [];
              
              if (location.streetName || location.house_number) {
                addressParts.push(`${location.house_number || ''} ${location.streetName || ''}`.trim());
              }
              if (location.neighbourhood || location.suburb) {
                addressParts.push(location.neighbourhood || location.suburb);
              }
              if (location.village || location.town || location.city) {
                addressParts.push(location.village || location.town || location.city);
              }
              if (location.state || location.region) {
                addressParts.push(location.state || location.region);
              }
              if (location.country) {
                addressParts.push(location.country);
              }
              
              address = addressParts.filter(part => part && part.trim()).join(', ') || 
                       location.formattedAddress || 
                       `${location.city || location.town || location.village || 'Unknown'}, ${location.country || 'Tanzania'}`;
              
              console.log('✅ OSM reverse geocoding successful:', address);
              console.log('📍 Full location data:', location);
            }
          } catch (osmError) {
            console.warn('⚠️ OSM reverse geocoding failed:', osmError.message);
          }
          
          // Method 2: Try BigDataCloud if OSM failed
          if (!address || address.includes('Unknown')) {
            try {
              const response = await axios.get(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${parsedLat}&longitude=${parsedLng}&localityLanguage=en`,
                { timeout: 5000 }
              );
              
              if (response.data) {
                const data = response.data;
                const addressParts = [];
                
                if (data.locality) addressParts.push(data.locality);
                else if (data.city) addressParts.push(data.city);
                else if (data.principalSubdivision) addressParts.push(data.principalSubdivision);
                
                if (data.countryName) addressParts.push(data.countryName);
                
                address = addressParts.join(', ') || 'Unknown Location';
                console.log('✅ BigDataCloud reverse geocoding successful:', address);
                console.log('📍 BigDataCloud data:', data);
              }
            } catch (bdcError) {
              console.warn('⚠️ BigDataCloud reverse geocoding failed:', bdcError.message);
            }
          }
          
          // Method 3: Try direct Nominatim API call if previous methods failed
          if (!address || address.includes('Unknown')) {
            try {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
              const nominatimResponse = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedLat}&lon=${parsedLng}&zoom=18&addressdetails=1`,
                {
                  timeout: 5000,
                  headers: {
                    'User-Agent': 'SmartFarmTZ/1.0 (smartfarm@example.com)'
                  }
                }
              );
              
              if (nominatimResponse.data && nominatimResponse.data.address) {
                const addr = nominatimResponse.data.address;
                const addressParts = [];
                
                // Build detailed address from Nominatim components
                if (addr.house_number && addr.road) {
                  addressParts.push(`${addr.house_number} ${addr.road}`);
                } else if (addr.road) {
                  addressParts.push(addr.road);
                }
                
                if (addr.neighbourhood || addr.suburb) {
                  addressParts.push(addr.neighbourhood || addr.suburb);
                }
                
                if (addr.village || addr.town || addr.city) {
                  addressParts.push(addr.village || addr.town || addr.city);
                }
                
                if (addr.state_district || addr.state) {
                  addressParts.push(addr.state_district || addr.state);
                }
                
                if (addr.country) {
                  addressParts.push(addr.country);
                }
                
                address = addressParts.filter(part => part && part.trim()).join(', ') || nominatimResponse.data.display_name;
                console.log('✅ Direct Nominatim API successful:', address);
                console.log('📍 Nominatim address details:', addr);
              }
            } catch (nominatimError) {
              console.warn('⚠️ Direct Nominatim API failed:', nominatimError.message);
            }
          }
          
          // Method 3: If all geocoding fails, create a descriptive address
          if (!address || address.includes('Unknown')) {
            // Determine general region based on coordinates (Tanzania regions)
            const region = getKnownLocationName(parsedLat, parsedLng);
            address = region ? `${region}, Tanzania` : `Location (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`;
            console.log('✅ Using regional fallback address:', address);
          }
          
          return {
            address: address,
            lat: parsedLat,
            lng: parsedLng
          };
        }
      } catch (reverseError) {
        console.error('❌ Reverse geocoding failed:', reverseError.message);
        // Still use the GPS coordinates even if reverse geocoding fails
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          return {
            address: `Location (${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)})`,
            lat: parsedLat,
            lng: parsedLng
          };
        }
      }
    }

    // PRIORITY 2: Use IP-based location detection
    console.log('📍 No GPS coordinates available, trying IP-based location');
    
    const userIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                  (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    console.log('🌐 Detected user IP:', userIP);
    
    // Check if IP is valid (not localhost)
    if (userIP && userIP !== '::1' && userIP !== '127.0.0.1' && !userIP.includes('192.168')) {
      try {
        console.log('🌐 Requesting IP geolocation for:', userIP);
        const ipResponse = await axios.get(`http://ip-api.com/json/${userIP}`, { timeout: 5000 });
        
        if (ipResponse.data && ipResponse.data.status === 'success') {
          console.log('✅ IP geolocation successful:', ipResponse.data);
          return {
            address: `${ipResponse.data.city}, ${ipResponse.data.country}`,
            lat: ipResponse.data.lat,
            lng: ipResponse.data.lon
          };
        } else {
          console.warn('⚠️ IP geolocation failed:', ipResponse.data);
        }
      } catch (ipError) {
        console.error('❌ IP geolocation request failed:', ipError.message);
      }
    } else {
      console.warn('⚠️ Local/private IP detected, cannot use IP geolocation:', userIP);
    }

    // PRIORITY 3: Final fallback to default Tanzania location
    console.log('📍 Using fallback location: Dar es Salaam, Tanzania');
    return {
      address: 'Dar es Salaam, Tanzania',
      lat: -6.7924,
      lng: 39.2083
    };

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    // Return default Tanzania location
    return {
      address: 'Dar es Salaam, Tanzania',
      lat: -6.7924,
      lng: 39.2083
    };
  }
};

/**
 * Get known location name based on coordinates (Tanzania regions)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string|null} Known location name or null
 */
const getKnownLocationName = (lat, lng) => {
  // Tanzania major cities with precise coordinates and smaller radius for accuracy
  const locations = [
    { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083, radius: 0.2 },
    { name: 'Mwanza', lat: -2.5164, lng: 32.9175, radius: 0.15 },
    { name: 'Arusha', lat: -3.3869, lng: 36.6830, radius: 0.15 },
    { name: 'Dodoma', lat: -6.1730, lng: 35.7516, radius: 0.15 },
    { name: 'Mbeya', lat: -8.9094, lng: 33.4607, radius: 0.15 },
    { name: 'Morogoro', lat: -6.8235, lng: 37.6614, radius: 0.15 },
    { name: 'Tabora', lat: -5.0169, lng: 32.7999, radius: 0.15 },
    { name: 'Kigoma', lat: -4.8761, lng: 29.6269, radius: 0.15 },
    { name: 'Mtwara', lat: -10.2692, lng: 40.1836, radius: 0.15 },
    { name: 'Bukoba', lat: -1.3359, lng: 31.8123, radius: 0.15 },
    { name: 'Musoma', lat: -1.5000, lng: 33.8000, radius: 0.15 },
    { name: 'Iringa', lat: -7.7669, lng: 35.6919, radius: 0.15 },
    { name: 'Singida', lat: -4.8167, lng: 34.7500, radius: 0.15 }, // Correct Singida coordinates
    { name: 'Shinyanga', lat: -3.6638, lng: 33.4218, radius: 0.15 },
    { name: 'Lindi', lat: -10.0000, lng: 39.7167, radius: 0.15 },
    { name: 'Sumbawanga', lat: -7.9667, lng: 31.6167, radius: 0.15 },
    { name: 'Tanga', lat: -5.0686, lng: 39.0988, radius: 0.15 },
    { name: 'Kilosa', lat: -6.8333, lng: 36.9833, radius: 0.1 },
    { name: 'Moshi', lat: -3.3500, lng: 37.3333, radius: 0.1 }
  ];
  
  // Find the closest known location within a smaller, more precise radius
  for (const location of locations) {
    const distance = Math.sqrt(
      Math.pow(lat - location.lat, 2) + Math.pow(lng - location.lng, 2)
    );
    
    if (distance <= location.radius) {
      console.log(`📍 Matched known location: ${location.name} (distance: ${distance.toFixed(4)})`);
      return location.name;
    }
  }
  
  // NO MORE BROAD REGIONAL MATCHING - only return null if no precise match
  console.log('📍 No precise location match found, will use geocoding service result');
  return null;
};

/**
 * Get coordinates from address string
 * @param {string} address - Address string
 * @returns {Object} Coordinates {lat, lng}
 */
const getCoordinatesFromAddress = async (address) => {
  try {
    const result = await geocoders.osm.geocode(address);
    if (result && result.length > 0) {
      return {
        lat: result[0].latitude,
        lng: result[0].longitude
      };
    }
    return null;
  } catch (error) {
    console.error('Address geocoding error:', error);
    return null;
  }
};

module.exports = {
  geocodeLocation,
  getCoordinatesFromAddress
};
