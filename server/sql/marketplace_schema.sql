CREATE TABLE IF NOT EXISTS marketplace_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_type ENUM('crop', 'input', 'announcement') NOT NULL,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  price DECIMAL(10, 2),
  quantity DECIMAL(10, 2),
  unit ENUM('kg', 'buckets') DEFAULT 'kg',
  location_address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_post_type (post_type),
  INDEX idx_created_at (created_at),
  INDEX idx_location (location_lat, location_lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create uploads directory structure
-- This will be handled by Node.js file system operations
