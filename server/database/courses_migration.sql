-- Courses Management Tables Migration
-- Run this to create the necessary tables for course management

-- Main courses table
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category ENUM(
    'crop-management', 
    'soil-health', 
    'pest-control', 
    'irrigation', 
    'livestock', 
    'organic-farming',
    'farm-technology',
    'business-planning',
    'sustainable-agriculture',
    'climate-smart-agriculture'
  ) NOT NULL,
  level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  duration_weeks INT NOT NULL,
  price VARCHAR(20) DEFAULT 'Free',
  instructor_id INT NOT NULL,
  instructor_name VARCHAR(100) NOT NULL,
  prerequisites TEXT,
  tags JSON,
  learning_objectives JSON,
  thumbnail_url VARCHAR(500),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_lessons INT DEFAULT 0,
  total_enrollments INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_instructor_id (instructor_id),
  INDEX idx_category (category),
  INDEX idx_level (level),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course enrollments table (already exists, but ensure it's compatible)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress DECIMAL(5,2) DEFAULT 0.00,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  last_accessed TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_course (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_enrollment_date (enrollment_date),
  INDEX idx_progress (progress)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) NOT NULL,
  description TEXT,
  content LONGTEXT,
  lesson_order INT NOT NULL DEFAULT 1,
  duration_minutes INT DEFAULT 0,
  video_url VARCHAR(500),
  video_duration INT DEFAULT 0,
  attachments JSON,
  is_preview BOOLEAN DEFAULT FALSE,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_lesson_order (course_id, lesson_order),
  INDEX idx_course_id (course_id),
  INDEX idx_lesson_order (lesson_order),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course lesson progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  time_spent_minutes INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_lesson (user_id, lesson_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_lesson_id (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course reviews and ratings
CREATE TABLE IF NOT EXISTS course_reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  helpful_votes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_course_review (user_id, course_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course categories table (for dynamic categories)
CREATE TABLE IF NOT EXISTS course_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#10B981',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories
INSERT IGNORE INTO course_categories (name, slug, description, icon, color) VALUES
('Crop Management', 'crop-management', 'Learn effective crop cultivation techniques', '🌾', '#10B981'),
('Soil Health', 'soil-health', 'Understand soil composition and improvement methods', '🌱', '#8B5CF6'),
('Pest Control', 'pest-control', 'Manage pests and diseases naturally and effectively', '🐛', '#EF4444'),
('Irrigation', 'irrigation', 'Water management and irrigation systems', '💧', '#06B6D4'),
('Livestock', 'livestock', 'Animal husbandry and livestock management', '🐄', '#F59E0B'),
('Organic Farming', 'organic-farming', 'Chemical-free farming practices', '🌿', '#22C55E'),
('Farm Technology', 'farm-technology', 'Modern farming tools and technology', '🚜', '#6366F1'),
('Business Planning', 'business-planning', 'Agricultural business and marketing', '📊', '#EC4899'),
('Sustainable Agriculture', 'sustainable-agriculture', 'Environmentally friendly farming practices', '🌍', '#059669'),
('Climate-Smart Agriculture', 'climate-smart-agriculture', 'Adapting farming to climate change', '⛅', '#0EA5E9');

-- Create documents table (for course materials and file uploads)
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NULL,
  lesson_id INT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  upload_type ENUM('document', 'course-material', 'assignment', 'thumbnail', 'video', 'audio') DEFAULT 'document',
  access_level ENUM('private', 'public', 'course_members') DEFAULT 'private',
  download_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_lesson_id (lesson_id),
  INDEX idx_upload_type (upload_type),
  INDEX idx_access_level (access_level),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

