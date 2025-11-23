const axios = require('axios');

async function testMyCoursesSimple() {
  console.log('🔍 Testing My Courses endpoints...\n');

  try {
    // Login
    console.log('1. 🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hamida@gmail.com',
      password: 'Allahuma@11'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }

    console.log('✅ Login successful!');
    const authToken = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${authToken}` };

    // Test /api/academy/my-courses
    console.log('\n2. 📚 Testing /api/academy/my-courses...');
    try {
      const response = await axios.get('http://localhost:5000/api/academy/my-courses', { headers });
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      console.log('   Data type:', typeof response.data.data);
      console.log('   Data length:', response.data.data?.length || 'not array');
      
      if (response.data.data?.length) {
        console.log('   Courses found:');
        response.data.data.forEach((course, index) => {
          console.log(`      ${index + 1}. "${course.title}" - Progress: ${course.progress}%`);
        });
      } else {
        console.log('   ❌ No courses found');
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test /api/academy/my-enrolled-courses
    console.log('\n3. 📚 Testing /api/academy/my-enrolled-courses...');
    try {
      const response = await axios.get('http://localhost:5000/api/academy/my-enrolled-courses', { headers });
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      console.log('   Data type:', typeof response.data.data);
      console.log('   Data length:', response.data.data?.length || 'not array');
      
      if (response.data.data?.length) {
        console.log('   Courses found:');
        response.data.data.forEach((course, index) => {
          console.log(`      ${index + 1}. "${course.title}" - Progress: ${course.progress}%`);
        });
      } else {
        console.log('   ❌ No courses found');
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Overall error:', error.message);
  }
}

testMyCoursesSimple();
