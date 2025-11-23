-- Course Content Management Migration
-- Run this to create tables for managing course video/audio content

-- Course content table (for videos and audio specifically)
CREATE TABLE IF NOT EXISTS course_content (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content views/progress tracking
CREATE TABLE IF NOT EXISTS content_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  content_id INT NOT NULL,
  progress_seconds INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_position_seconds INT DEFAULT 0,
  watch_time_seconds INT DEFAULT 0,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES academy_courses(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES course_content(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_content (user_id, content_id),
  INDEX idx_user_id (user_id),
  INDEX idx_course_id (course_id),
  INDEX idx_content_id (content_id),
  INDEX idx_completed (completed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content comments/discussions
CREATE TABLE IF NOT EXISTS content_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  content_id INT NOT NULL,
  parent_id INT NULL,
  comment_text TEXT NOT NULL,
  timestamp_seconds INT DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES course_content(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES content_comments(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_content_id (content_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content likes/reactions
CREATE TABLE IF NOT EXISTS content_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  content_id INT NOT NULL,
  reaction_type ENUM('like', 'love', 'helpful', 'confusing') DEFAULT 'like',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES course_content(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_content_reaction (user_id, content_id),
  INDEX idx_user_id (user_id),
  INDEX idx_content_id (content_id),
  INDEX idx_reaction_type (reaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add some sample content types if needed
-- This would be populated by the application when content is uploaded
