const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function debugEnrollments() {
  console.log('🔍 Debugging Enrollment Issues');
  console.log('===============================\n');

  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to database successfully\n');

    // 1. Check all users
    console.log('1. 👥 CHECKING ALL USERS:');
    console.log('========================');
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, user_type, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} - ${user.first_name} ${user.last_name} (${user.email}) - Type: ${user.user_type}`);
    });

    // 2. Check all courses
    console.log('\n2. 📚 CHECKING ALL COURSES:');
    console.log('===========================');
    const [courses] = await connection.execute(`
      SELECT id, title, status, instructor_id, enrollment_count, created_at 
      FROM academy_courses 
      ORDER BY created_at DESC
    `);
    
    if (courses.length === 0) {
      console.log('❌ No courses found in database');
      return;
    }

    courses.forEach((course, index) => {
      console.log(`${index + 1}. ID: ${course.id} - "${course.title}" - Status: ${course.status} - Instructor: ${course.instructor_id} - Enrollments: ${course.enrollment_count}`);
    });

    // 3. Check all enrollments
    console.log('\n3. 🎓 CHECKING ALL ENROLLMENTS:');
    console.log('===============================');
    const [enrollments] = await connection.execute(`
      SELECT 
        ae.id,
        ae.user_id,
        ae.course_id,
        ae.enrollment_date,
        ae.status,
        ae.progress_percentage,
        ae.is_completed,
        u.email as user_email,
        u.first_name,
        u.last_name,
        c.title as course_title,
        c.status as course_status
      FROM academy_enrollments ae
      JOIN users u ON ae.user_id = u.id
      JOIN academy_courses c ON ae.course_id = c.id
      ORDER BY ae.enrollment_date DESC
    `);

    if (enrollments.length === 0) {
      console.log('❌ No enrollments found in academy_enrollments table');
      
      // Check if enrollments might be in the other table
      console.log('\n🔍 Checking course_enrollments table...');
      const [oldEnrollments] = await connection.execute(`
        SELECT 
          ce.*,
          u.email as user_email,
          u.first_name,
          u.last_name
        FROM course_enrollments ce
        JOIN users u ON ce.user_id = u.id
        ORDER BY ce.enrollment_date DESC
      `);
      
      if (oldEnrollments.length > 0) {
        console.log(`⚠️ Found ${oldEnrollments.length} enrollments in course_enrollments table (old table)`);
        oldEnrollments.forEach((enroll, index) => {
          console.log(`${index + 1}. User: ${enroll.first_name} ${enroll.last_name} (${enroll.user_email}) - Course ID: ${enroll.course_id} - Date: ${enroll.enrollment_date}`);
        });
      } else {
        console.log('❌ No enrollments found in either table');
      }
    } else {
      console.log(`✅ Found ${enrollments.length} enrollments in academy_enrollments table:`);
      enrollments.forEach((enroll, index) => {
        console.log(`${index + 1}. User: ${enroll.first_name} ${enroll.last_name} (${enroll.user_email}) - Course: "${enroll.course_title}" - Status: ${enroll.status} - Date: ${enroll.enrollment_date}`);
      });
    }

    // 4. Test API endpoints
    console.log('\n4. 🔌 TESTING API ENDPOINTS:');
    console.log('=============================');
    
    // Try to login with a student account
    let authToken = '';
    let studentUserId = '';
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'student@test.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success) {
        authToken = loginResponse.data.token;
        studentUserId = loginResponse.data.user.id;
        console.log(`✅ Login successful - User ID: ${studentUserId}`);
      }
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
      
      // Try with the first user if login fails
      if (users.length > 0) {
        console.log('🔄 Trying to find any student user...');
        const studentUsers = users.filter(u => u.user_type !== 'expert');
        if (studentUsers.length > 0) {
          console.log(`💡 Found student user: ${studentUsers[0].email} (ID: ${studentUsers[0].id})`);
        }
      }
    }

    // Test my-courses endpoint
    if (authToken) {
      console.log('\n🔍 Testing /api/academy/my-courses endpoint...');
      try {
        const myCoursesResponse = await axios.get(`${BASE_URL}/api/academy/my-courses`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (myCoursesResponse.data.success) {
          console.log(`✅ My-courses endpoint works - Found: ${myCoursesResponse.data.data.length} courses`);
          myCoursesResponse.data.data.forEach((course, index) => {
            console.log(`   ${index + 1}. ${course.title} - Progress: ${course.progress}%`);
          });
        }
      } catch (error) {
        console.log('❌ My-courses endpoint failed:', error.response?.data?.message || error.message);
      }

      console.log('\n🔍 Testing /api/academy/my-enrolled-courses endpoint...');
      try {
        const enrolledResponse = await axios.get(`${BASE_URL}/api/academy/my-enrolled-courses`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (enrolledResponse.data.success) {
          console.log(`✅ My-enrolled-courses endpoint works - Found: ${enrolledResponse.data.data.length} courses`);
          enrolledResponse.data.data.forEach((course, index) => {
            console.log(`   ${index + 1}. ${course.title} - Content Items: ${course.totalContentItems}`);
          });
        }
      } catch (error) {
        console.log('❌ My-enrolled-courses endpoint failed:', error.response?.data?.message || error.message);
      }
    }

    // 5. Check table structures
    console.log('\n5. 📋 CHECKING TABLE STRUCTURES:');
    console.log('=================================');
    
    console.log('Academy_enrollments table structure:');
    const [enrollStructure] = await connection.execute(`
      DESCRIBE academy_enrollments
    `);
    enrollStructure.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });

    console.log('\nAcademy_courses table structure:');
    const [courseStructure] = await connection.execute(`
      DESCRIBE academy_courses
    `);
    courseStructure.slice(0, 10).forEach(col => { // Show first 10 columns
      console.log(`   ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });

    // 6. Recommendations
    console.log('\n6. 💡 RECOMMENDATIONS:');
    console.log('======================');
    
    if (enrollments.length === 0) {
      console.log('❗ Issue identified: No enrollments in academy_enrollments table');
      console.log('🔧 Possible solutions:');
      console.log('   1. Check if enrollments are going to the wrong table (course_enrollments vs academy_enrollments)');
      console.log('   2. Verify enrollment endpoint is using the correct table');
      console.log('   3. Check if enrollment process completed successfully');
    }

    if (!authToken) {
      console.log('❗ Cannot test API endpoints without authentication');
      console.log('🔧 Create a test student user or check login credentials');
    }

    console.log('\n✅ Debug completed!');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the debug
debugEnrollments().catch(console.error);
