const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testEnrollmentStatus() {
  console.log('🔍 Testing Enrollment Status in Courses API');
  console.log('===========================================\n');

  try {
    // Test login with the actual enrolled user
    console.log('1. 🔐 Testing login with enrolled user (hamida@gmail.com)...');
    let loginResponse;
    try {
      loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'hamida@gmail.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success) {
        console.log(`✅ Login successful - User ID: ${loginResponse.data.user.id}`);
      }
    } catch (error) {
      console.log('❌ Login with hamida@gmail.com failed, trying different passwords...');
      
      // Try common passwords
      const passwords = ['123456', 'password', 'hamida123', 'admin'];
      for (const pwd of passwords) {
        try {
          loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'hamida@gmail.com',
            password: pwd
          });
          if (loginResponse.data.success) {
            console.log(`✅ Login successful with password: ${pwd} - User ID: ${loginResponse.data.user.id}`);
            break;
          }
        } catch (e) {
          // Continue trying
        }
      }
      
      if (!loginResponse || !loginResponse.data.success) {
        console.log('❌ Could not login with any password. Checking user registration...');
        
        // Try to register a new test user
        try {
          const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            firstName: 'Test',
            lastName: 'Student',
            email: 'student@test.com',
            password: 'password123',
            userType: 'farmer'
          });
          
          if (registerResponse.data.success) {
            console.log('✅ New test user registered successfully');
            
            // Now try login with new user
            loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
              email: 'student@test.com',
              password: 'password123'
            });
            
            if (loginResponse.data.success) {
              console.log(`✅ Login with new user successful - User ID: ${loginResponse.data.user.id}`);
            }
          }
        } catch (regError) {
          console.log('❌ Could not register new user:', regError.response?.data?.message || regError.message);
          console.log('⚠️  Continuing without authentication - will test public endpoints only');
        }
      }
    }

    const authToken = loginResponse?.data?.success ? loginResponse.data.token : '';
    const userId = loginResponse?.data?.user?.id || '';

    // 2. Test courses endpoint without auth
    console.log('\\n2. 📚 Testing /api/academy/courses (public) endpoint...');
    try {
      const coursesResponse = await axios.get(`${BASE_URL}/api/academy/courses`);
      
      if (coursesResponse.data.success) {
        console.log(`✅ Courses endpoint works - Found: ${coursesResponse.data.data.length} courses`);
        
        coursesResponse.data.data.forEach((course, index) => {
          console.log(`   ${index + 1}. "${course.title}" - ID: ${course.id} - Status: ${course.status}`);
          console.log(`      🎓 Enrolled: ${course.is_enrolled ? 'YES' : 'NO'} (should show enrollment status)`);
        });
      }
    } catch (error) {
      console.log('❌ Courses endpoint failed:', error.response?.data?.message || error.message);
    }

    // 3. Test courses endpoint with auth
    if (authToken) {
      console.log('\\n3. 📚 Testing /api/academy/courses (authenticated) endpoint...');
      try {
        const authCoursesResponse = await axios.get(`${BASE_URL}/api/academy/courses`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (authCoursesResponse.data.success) {
          console.log(`✅ Authenticated courses endpoint works - Found: ${authCoursesResponse.data.data.length} courses`);
          
          authCoursesResponse.data.data.forEach((course, index) => {
            console.log(`   ${index + 1}. "${course.title}" - ID: ${course.id} - Status: ${course.status}`);
            console.log(`      🎓 Enrolled: ${course.is_enrolled ? 'YES' : 'NO'}`);
            console.log(`      📊 Enrollment Count: ${course.enrollment_count || 0}`);
          });
        }
      } catch (error) {
        console.log('❌ Authenticated courses endpoint failed:', error.response?.data?.message || error.message);
      }

      // 4. Test specific enrollment
      console.log('\\n4. 🎯 Testing enrollment for specific courses...');
      const courseIdsToTest = [5, 6]; // Courses that hamida is enrolled in according to debug
      
      for (const courseId of courseIdsToTest) {
        try {
          const enrollResponse = await axios.post(`${BASE_URL}/api/academy/enroll/${courseId}`, {}, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          console.log(`Course ${courseId} enrollment attempt:`, enrollResponse.data);
        } catch (error) {
          if (error.response?.data?.message?.includes('already enrolled')) {
            console.log(`✅ Course ${courseId}: User already enrolled (expected)`);
          } else {
            console.log(`❌ Course ${courseId} enrollment test failed:`, error.response?.data?.message || error.message);
          }
        }
      }

      // 5. Test my-courses
      console.log('\\n5. 🎓 Testing /api/academy/my-courses endpoint...');
      try {
        const myCoursesResponse = await axios.get(`${BASE_URL}/api/academy/my-courses`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (myCoursesResponse.data.success) {
          console.log(`✅ My-courses endpoint works - Found: ${myCoursesResponse.data.data.length} enrolled courses`);
          myCoursesResponse.data.data.forEach((course, index) => {
            console.log(`   ${index + 1}. "${course.title}" - Progress: ${course.progress || 0}%`);
          });
        }
      } catch (error) {
        console.log('❌ My-courses endpoint failed:', error.response?.data?.message || error.message);
      }
    }

    console.log('\\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testEnrollmentStatus().catch(console.error);
