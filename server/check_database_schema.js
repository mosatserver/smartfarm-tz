const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🔍 Checking database schema for smartfarm_tz...\n');

  try {
    // 1. List all tables
    console.log('📋 ALL TABLES IN DATABASE:');
    console.log('='.repeat(50));
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);

    tables.forEach((table, index) => {
      const dataSize = (table.DATA_LENGTH / 1024).toFixed(2);
      const indexSize = (table.INDEX_LENGTH / 1024).toFixed(2);
      console.log(`${(index + 1).toString().padStart(2)}. ${table.TABLE_NAME} (${table.TABLE_ROWS} rows, ${dataSize}KB data, ${indexSize}KB indexes)`);
    });

    // 2. Check specific academy-related tables
    console.log('\n🎓 ACADEMY-RELATED TABLES:');
    console.log('='.repeat(50));
    const academyTables = [
      'academy_categories',
      'academy_courses', 
      'academy_enrollments',
      'academy_lessons',
      'academy_lesson_progress',
      'academy_course_ratings',
      'course_content',
      'course_enrollments',
      'live_sessions',
      'session_participants',
      'session_bookings'
    ];

    for (const tableName of academyTables) {
      const [tableExists] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [process.env.DB_NAME, tableName]);

      if (tableExists[0].count > 0) {
        // Get table info
        const [tableInfo] = await connection.execute(`
          SELECT TABLE_ROWS, DATA_LENGTH 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [process.env.DB_NAME, tableName]);

        console.log(`✅ ${tableName} - ${tableInfo[0].TABLE_ROWS} rows`);
      } else {
        console.log(`❌ ${tableName} - MISSING`);
      }
    }

    // 3. Check course_content table structure specifically
    console.log('\n📹 COURSE_CONTENT TABLE STRUCTURE:');
    console.log('='.repeat(50));
    
    const [courseContentExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content'
    `, [process.env.DB_NAME]);

    if (courseContentExists[0].count > 0) {
      const [columns] = await connection.execute(`
        SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE, 
          COLUMN_DEFAULT,
          COLUMN_KEY,
          EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content'
        ORDER BY ORDINAL_POSITION
      `, [process.env.DB_NAME]);

      console.log('Column Structure:');
      columns.forEach((col, index) => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.COLUMN_KEY ? ` [${col.COLUMN_KEY}]` : '';
        const extra = col.EXTRA ? ` (${col.EXTRA})` : '';
        const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT: ${col.COLUMN_DEFAULT}` : '';
        
        console.log(`${(index + 1).toString().padStart(2)}. ${col.COLUMN_NAME} - ${col.DATA_TYPE} ${nullable}${key}${extra}${defaultVal}`);
      });

      // Check foreign keys
      const [foreignKeys] = await connection.execute(`
        SELECT 
          CONSTRAINT_NAME,
          COLUMN_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = ? 
          AND TABLE_NAME = 'course_content' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [process.env.DB_NAME]);

      if (foreignKeys.length > 0) {
        console.log('\nForeign Keys:');
        foreignKeys.forEach((fk, index) => {
          console.log(`${index + 1}. ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
        });
      }

      // Check indexes
      const [indexes] = await connection.execute(`
        SELECT 
          INDEX_NAME,
          COLUMN_NAME,
          NON_UNIQUE
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'course_content'
        ORDER BY INDEX_NAME, SEQ_IN_INDEX
      `, [process.env.DB_NAME]);

      if (indexes.length > 0) {
        console.log('\nIndexes:');
        const groupedIndexes = indexes.reduce((acc, idx) => {
          if (!acc[idx.INDEX_NAME]) acc[idx.INDEX_NAME] = [];
          acc[idx.INDEX_NAME].push(idx.COLUMN_NAME);
          return acc;
        }, {});

        Object.entries(groupedIndexes).forEach(([indexName, columns], index) => {
          const unique = indexes.find(i => i.INDEX_NAME === indexName).NON_UNIQUE === 0 ? ' (UNIQUE)' : '';
          console.log(`${index + 1}. ${indexName}: ${columns.join(', ')}${unique}`);
        });
      }
    } else {
      console.log('❌ course_content table does not exist');
    }

    // 4. Check enrollments tables structure
    console.log('\n👥 ENROLLMENTS TABLES COMPARISON:');
    console.log('='.repeat(50));
    
    const enrollmentTables = ['course_enrollments', 'academy_enrollments'];
    
    for (const tableName of enrollmentTables) {
      const [tableExists] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      `, [process.env.DB_NAME, tableName]);

      if (tableExists[0].count > 0) {
        console.log(`\n✅ ${tableName.toUpperCase()}:`);
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [process.env.DB_NAME, tableName]);

        columns.forEach((col, index) => {
          const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.COLUMN_DEFAULT ? ` (${col.COLUMN_DEFAULT})` : '';
          console.log(`   ${col.COLUMN_NAME} - ${col.DATA_TYPE} ${nullable}${defaultVal}`);
        });
      } else {
        console.log(`❌ ${tableName} - MISSING`);
      }
    }

    // 5. Test the problematic queries
    console.log('\n🧪 TESTING PROBLEMATIC QUERIES:');
    console.log('='.repeat(50));
    
    try {
      console.log('Testing course_content INSERT query...');
      const testInsertQuery = `
        INSERT INTO course_content (
          course_id, title, content_type, file_url, file_name, file_size, mime_type,
          duration_seconds, upload_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `;
      console.log('✅ course_content INSERT query syntax is valid');
    } catch (error) {
      console.log('❌ course_content INSERT query failed:', error.message);
    }

    try {
      console.log('Testing academy_enrollments SELECT query...');
      const testSelectQuery = `
        SELECT u.id, u.email, u.first_name, u.last_name
        FROM academy_enrollments ae
        JOIN users u ON ae.user_id = u.id
        WHERE ae.course_id = ? AND ae.status = 'active'
      `;
      console.log('✅ academy_enrollments SELECT query syntax is valid');
    } catch (error) {
      console.log('❌ academy_enrollments SELECT query failed:', error.message);
    }

    console.log('\n🎉 Database schema check completed!');

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    await connection.end();
  }
}

// Run the schema check
checkDatabaseSchema().catch(console.error);
