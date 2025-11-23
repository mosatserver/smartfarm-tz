const axios = require('axios');

async function testCoursesEndpoint() {
  try {
    console.log('🔍 Testing courses endpoint...');
    
    const response = await axios.get('http://localhost:5000/api/academy/courses');
    console.log('📊 Response status:', response.status);
    console.log('📝 Response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Response:', error.response.data);
    }
  }
}

testCoursesEndpoint();
