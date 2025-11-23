const { pool } = require('./config/database');

async function createMissingTables() {
  try {
    console.log('🔧 Creating missing tables...');
    
    // Create live_sessions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS live_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        course_id INT NULL,
        expert_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        session_type ENUM('one_on_one', 'group', 'webinar') DEFAULT 'group',
        scheduled_at DATETIME NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        max_participants INT DEFAULT 50,
        current_participants INT DEFAULT 0,
        price DECIMAL(10,2) DEFAULT 0.00,
        is_free BOOLEAN DEFAULT TRUE,
        meeting_url VARCHAR(500),
        meeting_password VARCHAR(50),
        status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
        started_at TIMESTAMP NULL,
        ended_at TIMESTAMP NULL,
        notes TEXT,
        recording_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_course_id (course_id),
        INDEX idx_expert_id (expert_id),
        INDEX idx_scheduled_at (scheduled_at),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ live_sessions table created');
    
    // Create session_bookings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS session_bookings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id VARCHAR(100) UNIQUE NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        student_id INT NOT NULL,
        expert_id INT NOT NULL,
        amount DECIMAL(10,2) DEFAULT 0.00,
        payment_method ENUM('free', 'pending', 'paid', 'refunded') DEFAULT 'free',
        booking_notes TEXT,
        booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'paid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_student_id (student_id),
        INDEX idx_expert_id (expert_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ session_bookings table created');
    
    // Create session_participants table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS session_participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(100) NOT NULL,
        user_id INT NOT NULL,
        role ENUM('student', 'expert', 'assistant') DEFAULT 'student',
        is_present BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP NULL,
        left_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_session_user (session_id, user_id),
        INDEX idx_session_id (session_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ session_participants table created');
    
    // Create sample data
    console.log('🚀 Creating sample data...');
    
    const [experts] = await pool.execute('SELECT id FROM users WHERE user_type = "expert" LIMIT 1');
    if (experts.length > 0) {
      const expertId = experts[0].id;
      
      // Create sample live session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7); // Next week
      
      await pool.execute(`
        INSERT INTO live_sessions (
          session_id, expert_id, title, description, scheduled_at,
          duration_minutes, max_participants, session_type, is_free, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        expertId,
        'Smart Farming Q&A Session',
        'Join our expert for a live Q&A session about smart farming technologies.',
        scheduledDate,
        60,
        50,
        'group',
        true,
        'scheduled'
      ]);
      console.log('✅ Sample live session created');
    }
    
    console.log('🎉 All tables and sample data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

module.exports = { createMissingTables };

// Run if called directly
if (require.main === module) {
  createMissingTables().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}
