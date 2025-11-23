const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFrontendFlow() {
  try {
    console.log('🔐 Creating new user session...');
    
    // Register a new user
    const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
      firstName: 'Frontend',
      lastName: 'Test',
      email: 'frontend_test_' + Date.now() + '@example.com',
      userType: 'farmer',
      mobileNumber: '+255987654321',
      password: 'FrontendTest123',
      confirmPassword: 'FrontendTest123'
    });

    const token = registerResponse.data.data.token;
    console.log('✅ User registered, token length:', token.length);

    // Test image exists
    const testImagePath = 'ai-service/test_image.jpg';
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found');
      return;
    }

    console.log('📸 Testing crop health analysis exactly as frontend does...');
    
    // Create FormData exactly like the frontend
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('lang', 'en');

    console.log('📤 Sending request with token:', `Bearer ${token.substring(0, 20)}...`);

    // Make the request exactly like frontend with axios
    const analysisResponse = await axios.post('http://localhost:5000/api/crop-health/analyze', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // 30 seconds timeout like production
    });

    console.log('✅ Success! Response:', JSON.stringify(analysisResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Server is not running or not accessible on port 5000');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🚨 Request timed out - server may be overloaded');
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.error('❌ Server not accessible:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await testFrontendFlow();
  } else {
    console.log('Please make sure the server is running on port 5000');
  }
}

main();
