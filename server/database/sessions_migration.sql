-- Live Sessions Migration
-- Creates tables for managing live sessions between experts and students

-- Create live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  expert_id INT NOT NULL,
  course_id INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  session_type ENUM('one_on_one', 'group', 'webinar') DEFAULT 'one_on_one',
  max_participants INT DEFAULT 1,
  current_participants INT DEFAULT 0,
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 60,
  status ENUM('scheduled', 'active', 'ended', 'cancelled') DEFAULT 'scheduled',
  meeting_url VARCHAR(500) NULL,
  meeting_password VARCHAR(50) NULL,
  recording_url VARCHAR(500) NULL,
  notes TEXT,
  price DECIMAL(10, 2) DEFAULT 0.00,
  is_free BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  INDEX idx_expert_id (expert_id),
  INDEX idx_course_id (course_id),
  INDEX idx_status (status),
  INDEX idx_session_type (session_type),
  INDEX idx_scheduled_at (scheduled_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session_participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL,
  user_id INT NOT NULL,
  role ENUM('expert', 'student', 'observer') DEFAULT 'student',
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  is_present BOOLEAN DEFAULT FALSE,
  notes TEXT,
  rating INT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES live_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_user (session_id, user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_role (role),
  INDEX idx_is_present (is_present)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session_bookings table
CREATE TABLE IF NOT EXISTS session_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id VARCHAR(100) UNIQUE NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  student_id INT NOT NULL,
  expert_id INT NOT NULL,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
  amount DECIMAL(10, 2) DEFAULT 0.00,
  payment_method ENUM('bank', 'mobile', 'free') DEFAULT 'free',
  payment_reference VARCHAR(100) NULL,
  booking_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP NULL,
  confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES live_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_student_id (student_id),
  INDEX idx_expert_id (expert_id),
  INDEX idx_booking_status (booking_status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session_messages table (for session chat)
CREATE TABLE IF NOT EXISTS session_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL,
  sender_id INT NOT NULL,
  message_type ENUM('text', 'system', 'file', 'image') DEFAULT 'text',
  content TEXT NOT NULL,
  file_url VARCHAR(500) NULL,
  file_name VARCHAR(255) NULL,
  is_system_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES live_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_sender_id (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_message_type (message_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session_resources table (files shared during session)
CREATE TABLE IF NOT EXISTS session_resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id VARCHAR(100) NOT NULL,
  uploaded_by INT NOT NULL,
  resource_type ENUM('document', 'image', 'video', 'audio', 'link') NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NULL,
  file_name VARCHAR(255) NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  is_downloadable BOOLEAN DEFAULT TRUE,
  access_level ENUM('public', 'participants_only', 'expert_only') DEFAULT 'participants_only',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES live_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_resource_type (resource_type),
  INDEX idx_access_level (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expert_availability table
CREATE TABLE IF NOT EXISTS expert_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expert_id INT NOT NULL,
  day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  session_duration_minutes INT DEFAULT 60,
  buffer_minutes INT DEFAULT 15, -- Time between sessions
  price_per_hour DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_expert_id (expert_id),
  INDEX idx_day_of_week (day_of_week),
  INDEX idx_is_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create expert_blocked_times table (for specific dates/times when expert is not available)
CREATE TABLE IF NOT EXISTS expert_blocked_times (
  id INT PRIMARY KEY AUTO_INCREMENT,
  expert_id INT NOT NULL,
  blocked_from TIMESTAMP NOT NULL,
  blocked_until TIMESTAMP NOT NULL,
  reason VARCHAR(200),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(100) NULL, -- e.g., 'weekly', 'monthly'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_expert_id (expert_id),
  INDEX idx_blocked_from (blocked_from),
  INDEX idx_blocked_until (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
