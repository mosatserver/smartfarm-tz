-- Additional tables for live sessions functionality

-- Session bookings table
CREATE TABLE IF NOT EXISTS session_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(100) UNIQUE NOT NULL,
  session_id VARCHAR(100) NOT NULL, -- Will reference session_id field in live_sessions
  student_id INT NOT NULL,
  expert_id INT NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0.00,
  payment_method ENUM('free', 'pending', 'paid', 'refunded') DEFAULT 'free',
  booking_notes TEXT,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_student_id (student_id),
  INDEX idx_expert_id (expert_id),
  INDEX idx_booking_status (booking_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session participants table (separate from bookings for flexibility)
CREATE TABLE IF NOT EXISTS session_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL, -- Will reference session_id field in live_sessions
  user_id INT NOT NULL,
  role ENUM('student', 'expert', 'assistant') DEFAULT 'student',
  is_present BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_user (session_id, user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a more traditional live_sessions table with session_id field for backwards compatibility
CREATE TABLE IF NOT EXISTS live_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  course_id INT NULL,
  expert_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type ENUM('one_on_one', 'group', 'webinar') DEFAULT 'one_on_one',
  scheduled_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  max_participants INT DEFAULT 1,
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
  INDEX idx_status (status),
  INDEX idx_session_type (session_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
