-- SmartFarm Academy Database Tables

-- Categories table
CREATE TABLE IF NOT EXISTS academy_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Courses table
CREATE TABLE IF NOT EXISTS academy_courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_description VARCHAR(500),
  instructor_id INT NOT NULL,
  category_id INT NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced') NOT NULL DEFAULT 'beginner',
  duration_weeks INT NOT NULL DEFAULT 1,
  total_lessons INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_free BOOLEAN DEFAULT TRUE,
  thumbnail_url VARCHAR(500),
  preview_video_url VARCHAR(500),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_ratings INT DEFAULT 0,
  enrollment_count INT DEFAULT 0,
  tags JSON,
  requirements TEXT,
  what_you_learn TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES academy_categories(id) ON DELETE CASCADE,
  INDEX idx_instructor_id (instructor_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_level (level),
  INDEX idx_is_free (is_free),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at),
  FULLTEXT idx_search (title, description, short_description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lessons table
CREATE TABLE IF NOT EXISTS academy_lessons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT,
  lesson_order INT NOT NULL,
  duration_minutes INT DEFAULT 0,
  video_url VARCHAR(500),
  pdf_url VARCHAR(500),
  lesson_type ENUM('video', 'text', 'pdf', 'quiz') DEFAULT 'video',
  is_preview BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
  INDEX idx_course_id (course_id),
  INDEX idx_lesson_order (lesson_order),
  INDEX idx_is_active (is_active),
  UNIQUE KEY unique_course_slug (course_id, slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enrollments table
CREATE TABLE IF NOT EXISTS academy_enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completion_date TIMESTAMP NULL,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  current_lesson_id INT NULL,
  total_time_spent INT DEFAULT 0, -- in minutes
  is_completed BOOLEAN DEFAULT FALSE,
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url VARCHAR(500) NULL,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
  FOREIGN KEY (current_lesson_id) REFERENCES academy_lessons(id) ON DELETE SET NULL,
  UNIQUE KEY unique_enrollment (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_enrollment_date (enrollment_date),
  INDEX idx_is_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lesson progress table
CREATE TABLE IF NOT EXISTS academy_lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  enrollment_id INT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  time_spent INT DEFAULT 0, -- in minutes
  completion_date TIMESTAMP NULL,
  last_position INT DEFAULT 0, -- for video position
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES academy_lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES academy_enrollments(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_lesson (user_id, lesson_id),
  INDEX idx_user_id (user_id),
  INDEX idx_lesson_id (lesson_id),
  INDEX idx_enrollment_id (enrollment_id),
  INDEX idx_is_completed (is_completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course ratings table
CREATE TABLE IF NOT EXISTS academy_course_ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_course_rating (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Live sessions table
CREATE TABLE IF NOT EXISTS academy_live_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NULL,
  instructor_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_date DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  max_participants INT DEFAULT 100,
  current_participants INT DEFAULT 0,
  meeting_url VARCHAR(500),
  meeting_id VARCHAR(100),
  meeting_password VARCHAR(50),
  status ENUM('scheduled', 'live', 'completed', 'cancelled') DEFAULT 'scheduled',
  recording_url VARCHAR(500) NULL,
  is_recorded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_course_id (course_id),
  INDEX idx_instructor_id (instructor_id),
  INDEX idx_session_date (session_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Live session participants table
CREATE TABLE IF NOT EXISTS academy_live_session_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP NULL,
  left_at TIMESTAMP NULL,
  attendance_duration INT DEFAULT 0, -- in minutes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES academy_live_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_user (session_id, user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course bookmarks table
CREATE TABLE IF NOT EXISTS academy_course_bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_course_bookmark (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories
INSERT IGNORE INTO academy_categories (name, description, icon) VALUES
('Crop Management', 'Learn about modern crop cultivation and management techniques', 'plant'),
('Technology', 'Explore agricultural technology and IoT solutions', 'cpu'),
('Pest Management', 'Master integrated pest management strategies', 'bug'),
('Business', 'Agricultural business and marketing strategies', 'trending-up'),
('Livestock', 'Animal husbandry and livestock management', 'cow'),
('Soil Science', 'Soil health, fertility, and conservation practices', 'mountain'),
('Water Management', 'Irrigation and water conservation techniques', 'droplet'),
('Organic Farming', 'Sustainable and organic farming practices', 'leaf');
