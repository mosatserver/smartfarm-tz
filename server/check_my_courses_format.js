const axios = require('axios');

async function checkMyCoursesFormat() {
  console.log('🔍 Checking detailed format of my-courses endpoints...\n');

  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hamida@gmail.com',
      password: 'Allahuma@11'
    });

    const authToken = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${authToken}` };

    // Test /api/academy/my-courses
    console.log('1. 📚 /api/academy/my-courses Response Format:');
    const myCoursesResponse = await axios.get('http://localhost:5000/api/academy/my-courses', { headers });
    console.log(JSON.stringify(myCoursesResponse.data, null, 2));

    console.log('\n' + '='.repeat(80) + '\n');

    // Test /api/academy/my-enrolled-courses
    console.log('2. 📚 /api/academy/my-enrolled-courses Response Format:');
    const enrolledResponse = await axios.get('http://localhost:5000/api/academy/my-enrolled-courses', { headers });
    console.log(JSON.stringify(enrolledResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

checkMyCoursesFormat();
