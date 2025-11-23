const axios = require('axios');

async function testBothEndpoints() {
  console.log('🔍 Testing both course endpoints...\n');
  
  try {
    // Test 1: /api/academy/courses (the good one)
    console.log('1. Testing /api/academy/courses:');
    console.log('================================');
    const academyResponse = await axios.get('http://localhost:5000/api/academy/courses');
    console.log('Status:', academyResponse.status);
    console.log('Success:', academyResponse.data.success);
    console.log('Data structure:', Object.keys(academyResponse.data.data || {}));
    console.log('User context:', academyResponse.data.data?.userContext);
    if (academyResponse.data.data?.courses) {
      console.log('Courses count:', academyResponse.data.data.courses.length);
      if (academyResponse.data.data.courses[0]) {
        console.log('Sample course enrollment fields:', {
          is_enrolled: academyResponse.data.data.courses[0].is_enrolled,
          isEnrolled: academyResponse.data.data.courses[0].isEnrolled,
          enrollmentStatus: academyResponse.data.data.courses[0].enrollmentStatus
        });
      }
    }
    
  } catch (error) {
    console.log('❌ /api/academy/courses failed:', error.message);
  }
  
  try {
    // Test 2: /api/courses (the old one)
    console.log('\n2. Testing /api/courses:');
    console.log('========================');
    const coursesResponse = await axios.get('http://localhost:5000/api/courses');
    console.log('Status:', coursesResponse.status);
    console.log('Success:', coursesResponse.data.success);
    console.log('Data structure:', Object.keys(coursesResponse.data.data || coursesResponse.data));
    if (coursesResponse.data.data) {
      console.log('Courses count:', Array.isArray(coursesResponse.data.data) ? coursesResponse.data.data.length : 'Not array');
      if (Array.isArray(coursesResponse.data.data) && coursesResponse.data.data[0]) {
        console.log('Sample course enrollment fields:', {
          is_enrolled: coursesResponse.data.data[0].is_enrolled,
          isEnrolled: coursesResponse.data.data[0].isEnrolled,
          enrollmentStatus: coursesResponse.data.data[0].enrollmentStatus
        });
      }
    }
    
  } catch (error) {
    console.log('❌ /api/courses failed:', error.message);
  }
  
  console.log('\n✅ Endpoint testing completed!');
}

testBothEndpoints();
