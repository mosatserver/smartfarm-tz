const mysql = require('mysql2/promise');
const fs = require('fs').promises;
require('dotenv').config();

async function fixDatabaseIssues() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  console.log('🔧 Starting database schema fixes...');

  try {
    // Issue 1: Add status column to course_enrollments table if it doesn't exist
    console.log('📝 Checking course_enrollments table structure...');
    
    // First, check if we need to add status column to course_enrollments
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_enrollments' AND COLUMN_NAME = 'status'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      console.log('⚠️  Adding missing status column to course_enrollments table...');
      await connection.execute(`
        ALTER TABLE course_enrollments 
        ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER completed_at
      `);
      console.log('✅ Added status column to course_enrollments table');
      
      // Update existing records to have 'active' status
      await connection.execute(`
        UPDATE course_enrollments SET status = 'active' WHERE status IS NULL
      `);
      console.log('✅ Updated existing enrollments to active status');
    } else {
      console.log('✅ course_enrollments.status column already exists');
    }

    // Issue 2: Check if course_content table exists
    console.log('📝 Checking course_content table...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content'
    `, [process.env.DB_NAME]);

    if (tables.length === 0) {
      console.log('⚠️  Creating missing course_content table...');
      
      // Create course_content table manually
      await connection.execute(`
        CREATE TABLE course_content (
          id INT PRIMARY KEY AUTO_INCREMENT,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content_type ENUM('video', 'audio') NOT NULL,
          file_url VARCHAR(500) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          duration_seconds INT DEFAULT 0,
          thumbnail_url VARCHAR(500),
          upload_status ENUM('uploading', 'completed', 'failed', 'processing') DEFAULT 'uploading',
          content_order INT DEFAULT 1,
          is_preview BOOLEAN DEFAULT FALSE,
          access_level ENUM('free', 'premium', 'enrolled_only') DEFAULT 'enrolled_only',
          view_count INT DEFAULT 0,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_course_id (course_id),
          INDEX idx_content_type (content_type),
          INDEX idx_upload_status (upload_status),
          INDEX idx_content_order (content_order),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created course_content table');
    } else {
      console.log('✅ course_content table already exists');
    }

    // Issue 3: Fix the live sessions controller query
    // The query should use academy_enrollments instead of course_enrollments
    console.log('📝 Database schema fix completed!');
    console.log('🔧 Note: The live sessions controller needs to be updated to use academy_enrollments table');

    // Additional fix: Check if academy_enrollments has status column
    const [academyColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'academy_enrollments' AND COLUMN_NAME = 'status'
    `, [process.env.DB_NAME]);

    if (academyColumns.length === 0) {
      console.log('⚠️  Adding status column to academy_enrollments table...');
      await connection.execute(`
        ALTER TABLE academy_enrollments 
        ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active' AFTER last_accessed
      `);
      console.log('✅ Added status column to academy_enrollments table');
      
      // Update existing records to have 'active' status
      await connection.execute(`
        UPDATE academy_enrollments SET status = 'active' WHERE status IS NULL
      `);
      console.log('✅ Updated existing academy enrollments to active status');
    } else {
      console.log('✅ academy_enrollments.status column already exists');
    }

    console.log('🎉 All database schema issues have been resolved!');

  } catch (error) {
    console.error('❌ Database migration error:', error);
  } finally {
    await connection.end();
  }
}

// Run the fix
fixDatabaseIssues().catch(console.error);
