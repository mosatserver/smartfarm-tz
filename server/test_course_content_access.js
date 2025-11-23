const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

// Test data
let authToken = '';
let studentUserId = '';
let courseId = '';
let contentId = '';

console.log('🧪 Testing Course Content Access System');
console.log('=====================================\n');

// Test functions
async function testAuthentication() {
  console.log('1. 🔐 Testing Authentication...');
  
  try {
    // Try to get existing user or create a test student
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'student@test.com',
      password: 'password123'
    });

    if (response.data.success) {
      authToken = response.data.token;
      studentUserId = response.data.user.id;
      console.log('✅ Authentication successful');
      console.log(`   User ID: ${studentUserId}`);
      console.log(`   Token: ${authToken.substring(0, 20)}...`);
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.response?.data?.message || error.message);
    console.log('💡 Make sure you have a test student account or create one first');
  }
  console.log('');
}

async function testGetCourses() {
  console.log('2. 📚 Testing Get Published Courses...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/academy/courses`);
    
    if (response.data.success && response.data.data.courses.length > 0) {
      courseId = response.data.data.courses[0].id;
      console.log('✅ Found courses successfully');
      console.log(`   Total courses: ${response.data.data.courses.length}`);
      console.log(`   Using course ID: ${courseId} - "${response.data.data.courses[0].title}"`);
      console.log(`   User context: ${response.data.data.userContext?.authenticated ? 'Authenticated' : 'Anonymous'}`);
      
      // Show enrollment status for first few courses
      response.data.data.courses.slice(0, 3).forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" - Status: ${course.enrollmentStatus || 'N/A'} - Can enroll: ${course.canEnroll || false}`);
      });
    } else {
      console.log('❌ No published courses found');
      console.log('💡 Make sure you have published courses in the database');
    }
  } catch (error) {
    console.log('❌ Get courses failed:', error.response?.data?.message || error.message);
  }
  console.log('');
}

async function testEnrollment() {
  console.log('3. 📝 Testing Course Enrollment...');
  
  if (!authToken || !courseId) {
    console.log('❌ Skipping enrollment test - missing auth token or course ID');
    return;
  }
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/academy/courses/${courseId}/enroll`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Enrollment successful');
      console.log(`   Message: ${response.data.message}`);
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already enrolled')) {
      console.log('✅ Already enrolled in course (expected for repeat tests)');
    } else {
      console.log('❌ Enrollment failed:', error.response?.data?.message || error.message);
    }
  }
  console.log('');
}

async function testGetMyEnrolledCourses() {
  console.log('4. 🎓 Testing Get My Enrolled Courses...');
  
  if (!authToken) {
    console.log('❌ Skipping - missing auth token');
    return;
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/academy/my-enrolled-courses`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Retrieved enrolled courses successfully');
      console.log(`   Enrolled courses: ${response.data.data.length}`);
      
      response.data.data.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.title} (${course.totalContentItems} content items)`);
      });
    }
  } catch (error) {
    console.log('❌ Get enrolled courses failed:', error.response?.data?.message || error.message);
  }
  console.log('');
}

async function testGetCourseContent() {
  console.log('5. 📹 Testing Get Course Content...');
  
  if (!authToken || !courseId) {
    console.log('❌ Skipping - missing auth token or course ID');
    return;
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/academy/courses/${courseId}/content`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Retrieved course content successfully');
      console.log(`   Course: ${response.data.data.course.title}`);
      console.log(`   Content items: ${response.data.data.content.length}`);
      
      if (response.data.data.content.length > 0) {
        contentId = response.data.data.content[0].id;
        console.log(`   Sample content: "${response.data.data.content[0].title}" (${response.data.data.content[0].contentType})`);
        console.log(`   Using content ID: ${contentId} for detailed test`);
      }
    }
  } catch (error) {
    console.log('❌ Get course content failed:', error.response?.data?.message || error.message);
    if (error.response?.status === 403) {
      console.log('💡 This might indicate access control is working correctly');
    }
  }
  console.log('');
}

async function testGetContentItem() {
  console.log('6. 🎬 Testing Get Individual Content Item...');
  
  if (!authToken || !courseId || !contentId) {
    console.log('❌ Skipping - missing auth token, course ID, or content ID');
    return;
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/academy/courses/${courseId}/content/${contentId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Retrieved content item successfully');
      console.log(`   Title: ${response.data.data.content.title}`);
      console.log(`   Type: ${response.data.data.content.contentType}`);
      console.log(`   File URL: ${response.data.data.content.fileUrl}`);
      console.log(`   View count: ${response.data.data.content.viewCount}`);
      console.log(`   Access level: ${response.data.data.content.accessLevel}`);
    }
  } catch (error) {
    console.log('❌ Get content item failed:', error.response?.data?.message || error.message);
  }
  console.log('');
}

async function testEnrollmentStatusWithAuth() {
  console.log('7. 🎨 Testing Enrollment Status with Authentication...');
  
  if (!authToken) {
    console.log('❌ Skipping - missing auth token');
    return;
  }
  
  try {
    const response = await axios.get(
      `${BASE_URL}/api/academy/courses`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Retrieved courses with authentication');
      console.log(`   User context: ${response.data.data.userContext?.authenticated ? 'Authenticated' : 'Anonymous'}`);
      console.log(`   User ID: ${response.data.data.userContext?.userId || 'N/A'}`);
      
      // Count courses by enrollment status
      const enrolledCourses = response.data.data.courses.filter(c => c.enrollmentStatus === 'enrolled');
      const availableCourses = response.data.data.courses.filter(c => c.enrollmentStatus === 'available');
      const instructorCourses = response.data.data.courses.filter(c => c.enrollmentStatus === 'instructor');
      
      console.log(`   Enrolled courses: ${enrolledCourses.length}`);
      console.log(`   Available courses: ${availableCourses.length}`);
      console.log(`   Instructor courses: ${instructorCourses.length}`);
      
      // Show detailed status for first few courses
      console.log('   Course enrollment details:');
      response.data.data.courses.slice(0, 3).forEach((course, index) => {
        const statusIcon = {
          'enrolled': '✅',
          'instructor': '👩‍💼',
          'available': '📚'
        }[course.enrollmentStatus] || '❓';
        
        console.log(`     ${statusIcon} "${course.title}" - ${course.enrollmentStatus} ${course.canEnroll ? '(Can Enroll)' : '(Cannot Enroll)'}`);
      });
      
      // Test specific course details with auth
      if (courseId) {
        console.log(`   Testing single course details for course ${courseId}...`);
        const courseResponse = await axios.get(
          `${BASE_URL}/api/academy/courses/${courseId}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          }
        );
        
        if (courseResponse.data.success) {
          const course = courseResponse.data.data;
          console.log(`   ✅ Course details: "${course.title}"`);
          console.log(`     - Enrollment status: ${course.enrollmentStatus}`);
          console.log(`     - Can enroll: ${course.canEnroll}`);
          console.log(`     - Is enrolled: ${course.isEnrolled}`);
          console.log(`     - Is instructor: ${course.isInstructor}`);
          console.log(`     - Content count: ${course.contentCount}`);
          console.log(`     - Has content: ${course.hasContent}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ Get courses with auth failed:', error.response?.data?.message || error.message);
  }
  console.log('');
}

async function testAccessControlWithoutEnrollment() {
  console.log('8. 🔒 Testing Access Control (Without Enrollment)...');
  
  if (!courseId) {
    console.log('❌ Skipping - missing course ID');
    return;
  }
  
  try {
    // Try to access content without authentication
    const response = await axios.get(
      `${BASE_URL}/api/academy/courses/${courseId}/content`
    );
    
    console.log('❌ Access control failed - unauthenticated access was allowed');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Access control working - unauthenticated access denied');
    } else {
      console.log('❓ Unexpected response:', error.response?.status, error.response?.data?.message);
    }
  }
  console.log('');
}

// Main test runner
async function runTests() {
  console.log('⏱️  Starting tests at', new Date().toISOString());
  console.log('🌐 Server URL:', BASE_URL);
  console.log('');
  
  await testAuthentication();
  await testGetCourses();
  await testEnrollment();
  await testGetMyEnrolledCourses();
  await testGetCourseContent();
  await testGetContentItem();
  await testEnrollmentStatusWithAuth();
  await testAccessControlWithoutEnrollment();
  
  console.log('🎯 Test Summary:');
  console.log('================');
  console.log('✅ All tests completed');
  console.log('💡 Check above for any failed tests and their error messages');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('- Make sure your server is running on', BASE_URL);
  console.log('- Ensure you have test data: published courses with content');
  console.log('- Verify student user exists or create one');
  console.log('- Test with a frontend application to see full workflow');
}

// Handle process termination gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});
