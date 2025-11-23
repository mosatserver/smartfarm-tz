const mysql = require('mysql2/promise');

async function addSampleData() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'allahuma',
      database: 'smartfarm_tz'
    });

    console.log('📊 Adding sample courses and data...');

    // Get some experts to assign courses to
    const [experts] = await connection.execute(
      'SELECT id FROM users WHERE user_type = ? LIMIT 3', 
      ['expert']
    );

    if (experts.length > 0) {
      // Add sample courses
      const sampleCourses = [
        {
          title: 'Smart Crop Management',
          slug: 'smart-crop-management',
          description: 'Learn modern techniques for efficient crop cultivation and management.',
          category: 'crop-management',
          level: 'beginner'
        },
        {
          title: 'Soil Health & Nutrition',
          slug: 'soil-health-nutrition', 
          description: 'Master soil science and nutrient management for optimal plant growth.',
          category: 'soil-health',
          level: 'intermediate'
        },
        {
          title: 'Sustainable Farming Practices',
          slug: 'sustainable-farming-practices',
          description: 'Implement eco-friendly farming methods for long-term sustainability.',
          category: 'sustainable-agriculture',
          level: 'beginner'
        }
      ];

      for (let i = 0; i < sampleCourses.length; i++) {
        const course = sampleCourses[i];
        const expertId = experts[Math.min(i, experts.length - 1)].id;
        
        await connection.execute(`
          INSERT IGNORE INTO courses (
            title, slug, description, category, level, 
            duration_weeks, instructor_id, instructor_name, 
            status, total_lessons, rating
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          course.title,
          course.slug,
          course.description,
          course.category,
          course.level,
          4, // duration_weeks
          expertId,
          'Expert Instructor',
          'published',
          8, // total_lessons
          4.5 // rating
        ]);
      }
      console.log('✅ Sample courses added');
    } else {
      console.log('⚠️ No experts found. Please register some expert users first.');
    }

    await connection.end();
    console.log('🎉 Sample data setup complete!');
    
  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
  }
}

addSampleData();
