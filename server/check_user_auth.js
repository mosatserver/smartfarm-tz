const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkUserAuth() {
  console.log('🔍 Checking user authentication...\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get user data
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, password_hash, user_type, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log('👥 All users in database:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} - ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Type: ${user.user_type}`);
      console.log(`   Password hash: ${user.password_hash.substring(0, 20)}...`);
    });

    // Test password verification for hamida
    const hamidaUser = users.find(u => u.email === 'hamida@gmail.com');
    if (hamidaUser) {
      console.log('\n🔐 Testing passwords for hamida@gmail.com:');
      const passwords = ['password123', 'password', '123456', 'hamida123', 'admin', 'Allahuma@11'];
      
      for (const pwd of passwords) {
        try {
          const isMatch = await bcrypt.compare(pwd, hamidaUser.password_hash);
          console.log(`   ${pwd}: ${isMatch ? '✅ MATCH' : '❌ No match'}`);
          if (isMatch) {
            console.log(`   🎯 Found correct password: ${pwd}`);
            break;
          }
        } catch (error) {
          console.log(`   ${pwd}: ❌ Error comparing - ${error.message}`);
        }
      }
    } else {
      console.log('\n❌ hamida@gmail.com not found');
    }

    // Check enrollments for hamida
    if (hamidaUser) {
      console.log('\n🎓 Checking enrollments for hamida:');
      const [enrollments] = await connection.execute(`
        SELECT 
          ae.id, ae.user_id, ae.course_id, ae.status,
          c.title as course_title
        FROM academy_enrollments ae
        JOIN academy_courses c ON ae.course_id = c.id
        WHERE ae.user_id = ?
      `, [hamidaUser.id]);

      if (enrollments.length > 0) {
        console.log(`   Found ${enrollments.length} enrollments:`);
        enrollments.forEach((enrollment, index) => {
          console.log(`   ${index + 1}. Course "${enrollment.course_title}" (ID: ${enrollment.course_id}) - Status: ${enrollment.status}`);
        });
      } else {
        console.log('   No enrollments found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUserAuth().catch(console.error);
