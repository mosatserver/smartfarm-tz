const axios = require('axios');

async function testMyCourses() {
  console.log('🔍 Testing all "My Courses" related endpoints...\n');

  try {
    // Step 1: Login
    console.log('1. 🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hamida@gmail.com',
      password: 'Allahuma@11'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed');
      return;
    }

    console.log('✅ Login successful!');
    const authToken = loginResponse.data.data.token;
    const userId = loginResponse.data.data.userId;
    const headers = { 'Authorization': `Bearer ${authToken}` };

    // Step 2: Test all possible "my courses" endpoints
    const endpointsToTest = [
      '/api/academy/my-courses',
      '/api/academy/my-enrolled-courses', 
      '/api/courses/my-courses',
      '/api/courses/student/my-enrollments'
    ];

    for (const endpoint of endpointsToTest) {
      console.log(`\n2. 📚 Testing ${endpoint}...`);
      try {
        const response = await axios.get(`http://localhost:5000${endpoint}`, { headers });
        
        console.log(`   ✅ ${endpoint} - Status: ${response.status}`);
        console.log(`   Success: ${response.data.success}`);
        
        if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`   📊 Found: ${response.data.data.length} courses`);
          response.data.data.forEach((course, index) => {
            console.log(`      ${index + 1}. "${course.title || course.name || 'Unknown'}" - Progress: ${course.progress || course.progress_percentage || 0}%`);
          });
        } else if (response.data.data) {
          console.log(`   📊 Response type: ${typeof response.data.data}`);
          console.log(`   📊 Keys: ${Object.keys(response.data.data)}`);
        } else {
          console.log(`   📊 No data array found`);
        }

      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`   ❌ ${endpoint} - Not Found (404)`);
        } else if (error.response?.status === 403) {
          console.log(`   ❌ ${endpoint} - Forbidden (403) - ${error.response.data?.message || 'Access denied'}`);
        } else {
          console.log(`   ❌ ${endpoint} - Error: ${error.response?.data?.message || error.message}`);
        }
      }
    }

    // Step 3: Direct database check
    console.log('\n3. 🗄️ Direct database verification...');
    const mysql = require('mysql2/promise');
    require('dotenv').config();
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const [enrollments] = await connection.execute(`
      SELECT 
        e.id as enrollment_id,
        e.course_id,
        e.enrollment_date,
        e.progress_percentage,
        e.status,
        c.title as course_title,
        c.status as course_status
      FROM academy_enrollments e
      JOIN academy_courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.enrollment_date DESC
    `, [userId]);

    console.log(`   Found ${enrollments.length} enrollments in database:`);
    enrollments.forEach((enrollment, index) => {
      console.log(`   ${index + 1}. Course: "${enrollment.course_title}"`);
      console.log(`      - Enrollment ID: ${enrollment.enrollment_id}`);
      console.log(`      - Course ID: ${enrollment.course_id}`);
      console.log(`      - Status: ${enrollment.status}`);
      console.log(`      - Progress: ${enrollment.progress_percentage}%`);
      console.log(`      - Course Status: ${enrollment.course_status}`);
      console.log(`      - Enrolled: ${enrollment.enrollment_date}`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }

  console.log('\n✅ My Courses endpoints test completed!');
}

testMyCourses();
