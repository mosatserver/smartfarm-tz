const { pool } = require('./config/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and tables...');

    // Test basic connection
    const [connection] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connection successful');

    // Check which tables exist
    const [tables] = await pool.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE '%course%' OR table_name LIKE '%session%' OR table_name LIKE '%academy%'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Found tables:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    // Check users table for experts
    const [experts] = await pool.execute(`
      SELECT id, first_name, last_name, email, user_type 
      FROM users 
      WHERE user_type = 'expert' 
      LIMIT 5
    `);
    
    console.log(`\n👨‍🏫 Found ${experts.length} experts:`);
    experts.forEach(expert => {
      console.log(`  - ${expert.first_name} ${expert.last_name} (${expert.email})`);
    });

    // Test courses table (if exists)
    try {
      const [courses] = await pool.execute('SELECT COUNT(*) as count FROM courses');
      console.log(`\n📚 Courses table: ${courses[0].count} records`);
    } catch (error) {
      console.log('\n❌ Courses table does not exist');
    }

    // Test academy_courses table (if exists)
    try {
      const [academyCourses] = await pool.execute('SELECT COUNT(*) as count FROM academy_courses');
      console.log(`📚 Academy courses table: ${academyCourses[0].count} records`);
    } catch (error) {
      console.log('❌ Academy courses table does not exist');
    }

    // Test live sessions tables
    try {
      const [liveSessions] = await pool.execute('SELECT COUNT(*) as count FROM live_sessions');
      console.log(`🎥 Live sessions table: ${liveSessions[0].count} records`);
    } catch (error) {
      console.log('❌ Live sessions table does not exist');
    }

    try {
      const [academySessions] = await pool.execute('SELECT COUNT(*) as count FROM academy_live_sessions');
      console.log(`🎥 Academy live sessions table: ${academySessions[0].count} records`);
    } catch (error) {
      console.log('❌ Academy live sessions table does not exist');
    }

    // Test academy_categories
    try {
      const [categories] = await pool.execute('SELECT name FROM academy_categories WHERE is_active = TRUE');
      console.log(`\n📂 Academy categories (${categories.length}):`);
      categories.forEach(cat => console.log(`  - ${cat.name}`));
    } catch (error) {
      console.log('❌ Academy categories table does not exist');
    }

    // Try to create some sample data if we have experts
    if (experts.length > 0) {
      console.log('\n🚀 Creating sample data...');
      await createSampleData(experts[0]);
    }

  } catch (error) {
    console.error('❌ Database test error:', error);
  }
}

async function createSampleData(expert) {
  try {
    // Try to create sample course in regular courses table
    try {
      const [existingCourse] = await pool.execute(
        'SELECT id FROM courses WHERE instructor_id = ? LIMIT 1',
        [expert.id]
      );

      if (existingCourse.length === 0) {
        await pool.execute(`
          INSERT INTO courses (
            title, slug, description, category, level, duration_weeks,
            price, instructor_id, instructor_name, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          'Introduction to Smart Farming',
          'introduction-to-smart-farming',
          'Learn the basics of modern agricultural technology and smart farming techniques.',
          'farm-technology',
          'beginner',
          4,
          'Free',
          expert.id,
          `${expert.first_name} ${expert.last_name}`,
          'published'
        ]);
        console.log('✅ Created sample course in courses table');
      }
    } catch (error) {
      console.log('❌ Could not create course in courses table:', error.message);
    }

    // Try to create sample course in academy_courses table
    try {
      // First ensure we have a category
      const [categories] = await pool.execute(
        'SELECT id FROM academy_categories WHERE is_active = TRUE LIMIT 1'
      );

      if (categories.length > 0) {
        const [existingAcademyCourse] = await pool.execute(
          'SELECT id FROM academy_courses WHERE instructor_id = ? LIMIT 1',
          [expert.id]
        );

        if (existingAcademyCourse.length === 0) {
          await pool.execute(`
            INSERT INTO academy_courses (
              title, slug, description, instructor_id, category_id,
              level, duration_weeks, is_free, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            'Advanced Crop Management Techniques',
            'advanced-crop-management-techniques',
            'Master advanced techniques for managing crops using modern technology.',
            expert.id,
            categories[0].id,
            'intermediate',
            6,
            true,
            'published'
          ]);
          console.log('✅ Created sample course in academy_courses table');
        }
      }
    } catch (error) {
      console.log('❌ Could not create course in academy_courses table:', error.message);
    }

    // Try to create sample live session
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7); // Next week

      await pool.execute(`
        INSERT INTO live_sessions (
          session_id, expert_id, title, description, scheduled_at,
          duration_minutes, max_participants, session_type, is_free
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        expert.id,
        'Smart Farming Q&A Session',
        'Join our expert for a live Q&A session about smart farming technologies.',
        scheduledDate,
        60,
        50,
        'group',
        true
      ]);
      console.log('✅ Created sample live session');
    } catch (error) {
      console.log('❌ Could not create live session:', error.message);
    }

    // Try to create academy live session
    try {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 10); // Next week + 3 days

      await pool.execute(`
        INSERT INTO academy_live_sessions (
          instructor_id, title, description, session_date,
          duration_minutes, max_participants, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        expert.id,
        'Precision Agriculture Workshop',
        'Learn about precision agriculture tools and techniques.',
        sessionDate,
        90,
        30,
        'scheduled'
      ]);
      console.log('✅ Created sample academy live session');
    } catch (error) {
      console.log('❌ Could not create academy live session:', error.message);
    }

  } catch (error) {
    console.error('❌ Sample data creation error:', error);
  }
}

// Run the test
testDatabase().then(() => {
  console.log('\n✅ Database test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Database test failed:', error);
  process.exit(1);
});
