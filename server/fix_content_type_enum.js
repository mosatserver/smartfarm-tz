const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixContentTypeEnum() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🔧 Fixing course_content.content_type ENUM to include "document"...\n');

  try {
    // First, let's check the current ENUM values
    console.log('1. Checking current ENUM values...');
    const [currentEnum] = await connection.execute(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content' AND COLUMN_NAME = 'content_type'
    `, [process.env.DB_NAME]);

    if (currentEnum.length > 0) {
      console.log(`   Current ENUM: ${currentEnum[0].COLUMN_TYPE}`);
    }

    // Modify the ENUM to include 'document'
    console.log('\n2. Updating ENUM to include "document"...');
    await connection.execute(`
      ALTER TABLE course_content 
      MODIFY COLUMN content_type ENUM('video', 'audio', 'document') NOT NULL
    `);

    console.log('✅ Successfully updated content_type ENUM');

    // Verify the change
    console.log('\n3. Verifying the update...');
    const [newEnum] = await connection.execute(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content' AND COLUMN_NAME = 'content_type'
    `, [process.env.DB_NAME]);

    if (newEnum.length > 0) {
      console.log(`   Updated ENUM: ${newEnum[0].COLUMN_TYPE}`);
    }

    // Test insertion of a document type
    console.log('\n4. Testing document type insertion (dry run)...');
    try {
      // This is just to test the ENUM validation - we'll rollback
      await connection.execute('START TRANSACTION');
      
      await connection.execute(`
        INSERT INTO course_content (
          course_id, title, content_type, file_url, file_name, file_size, mime_type,
          duration_seconds, upload_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `, [1, 'Test Document', 'document', '/test/file.pdf', 'test.pdf', 1000, 'application/pdf', 0, 1]);
      
      console.log('✅ Document type insertion test passed');
      
      // Rollback the test insertion
      await connection.execute('ROLLBACK');
      console.log('   (Test record rolled back)');
      
    } catch (testError) {
      await connection.execute('ROLLBACK');
      console.log('❌ Document type insertion test failed:', testError.message);
    }

    console.log('\n🎉 Content type ENUM fix completed successfully!');
    console.log('   Documents can now be uploaded to the course_content table.');

  } catch (error) {
    console.error('❌ Error fixing content type ENUM:', error.message);
    console.error('Full error:', error);
  } finally {
    await connection.end();
  }
}

// Run the fix
fixContentTypeEnum().catch(console.error);
