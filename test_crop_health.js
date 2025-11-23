const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testCropHealthAnalysis() {
  try {
    // First, register a test user and get auth token
    console.log('🔐 Registering test user...');
    
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser_' + Date.now() + '@example.com',
      userType: 'farmer',
      mobileNumber: '+255123456789',
      password: 'Password123',
      confirmPassword: 'Password123'
    });

    const token = registerResponse.data.data.token;
    console.log('✅ User registered successfully');
    console.log('🔑 Token received:', token ? 'Yes' : 'No');
    console.log('📝 Token length:', token ? token.length : 0);

    // Test with an existing image
    const testImagePath = 'ai-service/test_image.jpg';
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      return;
    }

    console.log('📸 Testing crop health analysis...');
    
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('lang', 'en');

    const analysisResponse = await axios.post('http://localhost:5000/api/crop-health/analyze', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Analysis completed successfully!');
    console.log('📊 Results:', JSON.stringify(analysisResponse.data, null, 2));

    // Test getting analysis history
    console.log('📚 Getting analysis history...');
    const historyResponse = await axios.get('http://localhost:5000/api/crop-health/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ History retrieved successfully!');
    console.log('📝 History count:', historyResponse.data.history.length);

    // Test getting statistics
    console.log('📈 Getting statistics...');
    const statsResponse = await axios.get('http://localhost:5000/api/crop-health/statistics', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Statistics retrieved successfully!');
    console.log('📊 Statistics:', JSON.stringify(statsResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testCropHealthAnalysis();
