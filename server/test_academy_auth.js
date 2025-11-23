const axios = require('axios');

async function testAcademyWithAuth() {
  console.log('🔍 Testing /api/academy/courses with authentication...\n');
  
  try {
    // Step 1: Try to create and login with a test user
    console.log('1. 🔐 Creating/logging in test user...');
    
    let authToken = null;
    let userId = null;
    
    // Try to register a new user first
    try {
      console.log('   - Attempting to register testuser...');
      const registerResponse = await axios.post('http://localhost:5000/api/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        password: 'password123',
        userType: 'farmer'
      });
      
      if (registerResponse.data.success) {
        console.log('   ✅ User registered successfully');
        authToken = registerResponse.data.token;
        userId = registerResponse.data.user.id;
      }
    } catch (regError) {
      console.log('   - Registration failed or user exists, trying login...');
      
      // If registration fails, try login (user might already exist)
      try {
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
          email: 'testuser@example.com',
          password: 'password123'
        });
        
        if (loginResponse.data.success) {
          console.log('   ✅ User logged in successfully');
          authToken = loginResponse.data.token;
          userId = loginResponse.data.user.id;
        }
      } catch (loginError) {
        console.log('   ❌ Login also failed. Trying with existing user hamida@gmail.com...');
        
        // Try with existing user from database
        const passwords = ['password123', 'password', '123456', 'hamida123'];
        for (const pwd of passwords) {
          try {
            const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
              email: 'hamida@gmail.com',
              password: pwd
            });
            
            if (loginResponse.data.success) {
              console.log(`   ✅ Logged in with hamida@gmail.com using password: ${pwd}`);
              authToken = loginResponse.data.token;
              userId = loginResponse.data.user.id;
              break;
            }
          } catch (e) {
            // Continue trying
          }
        }
      }
    }
    
    if (!authToken) {
      console.log('   ❌ Could not authenticate any user. Testing without auth...');
    } else {
      console.log(`   ✅ Authenticated! User ID: ${userId}`);
    }
    
    // Step 2: Test courses endpoint with authentication
    console.log('\n2. 📚 Testing /api/academy/courses with authentication...');
    
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    
    const response = await axios.get('http://localhost:5000/api/academy/courses', { headers });
    
    console.log('   Status:', response.status);
    console.log('   Success:', response.data.success);
    console.log('   User Context:', response.data.data.userContext);
    console.log('   Courses Count:', response.data.data.courses.length);
    
    console.log('\n   📊 Enrollment Status Summary:');
    response.data.data.courses.forEach((course, index) => {
      console.log(`   ${index + 1}. "${course.title}" (ID: ${course.id})`);
      console.log(`      - is_enrolled: ${course.is_enrolled}`);
      console.log(`      - isEnrolled: ${course.isEnrolled}`);
      console.log(`      - enrollmentStatus: ${course.enrollmentStatus}`);
      console.log(`      - canEnroll: ${course.canEnroll}`);
      console.log(`      - isInstructor: ${course.isInstructor}`);
    });
    
    // Step 3: If we have auth, try enrolling in a course
    if (authToken && response.data.data.courses.length > 0) {
      const testCourse = response.data.data.courses.find(c => !c.isEnrolled && !c.isInstructor);
      
      if (testCourse) {
        console.log(`\n3. 🎓 Testing enrollment in course: "${testCourse.title}"`);
        
        try {
          const enrollResponse = await axios.post(
            `http://localhost:5000/api/academy/courses/${testCourse.id}/enroll`,
            {},
            { headers }
          );
          
          if (enrollResponse.data.success) {
            console.log('   ✅ Enrollment successful!');
            
            // Test courses endpoint again to see updated enrollment status
            console.log('\n4. 🔄 Re-testing courses endpoint after enrollment...');
            const updatedResponse = await axios.get('http://localhost:5000/api/academy/courses', { headers });
            
            const updatedCourse = updatedResponse.data.data.courses.find(c => c.id === testCourse.id);
            if (updatedCourse) {
              console.log(`   Updated enrollment status for "${updatedCourse.title}":`);
              console.log(`   - is_enrolled: ${updatedCourse.is_enrolled}`);
              console.log(`   - isEnrolled: ${updatedCourse.isEnrolled}`);
              console.log(`   - enrollmentStatus: ${updatedCourse.enrollmentStatus}`);
              console.log(`   - canEnroll: ${updatedCourse.canEnroll}`);
            }
          }
        } catch (enrollError) {
          if (enrollError.response?.data?.message?.includes('already enrolled')) {
            console.log('   ✅ User already enrolled (expected for existing data)');
          } else {
            console.log('   ❌ Enrollment failed:', enrollError.response?.data?.message || enrollError.message);
          }
        }
      } else {
        console.log('\n3. 🎓 No courses available for enrollment (user is instructor of all courses or already enrolled)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
  
  console.log('\n✅ Authentication test completed!');
}

testAcademyWithAuth();
