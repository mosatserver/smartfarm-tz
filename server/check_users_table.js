const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersTable() {
  console.log('🔍 Checking users table structure...\n');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Get table structure
    console.log('📋 Users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      console.log(`   ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });

    // Get users data (without password field)
    console.log('\n👥 Users in database:');
    const [users] = await connection.execute(`
      SELECT id, email, first_name, last_name, user_type, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} - ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Type: ${user.user_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUsersTable().catch(console.error);
