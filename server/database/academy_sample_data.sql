-- Sample data for SmartFarm Academy

-- First, let's create some sample expert instructor users
INSERT IGNORE INTO users (first_name, last_name, email, user_type, mobile_number, password_hash, is_active, email_verified) VALUES
('Dr. Sarah', 'Mwangi', 'sarah.mwangi@smartfarm.com', 'expert', '+255123456789', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE),
('Eng. James', 'Kiprotich', 'james.kiprotich@smartfarm.com', 'expert', '+255123456790', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE),
('Prof. Mary', 'Wanjiku', 'mary.wanjiku@smartfarm.com', 'expert', '+255123456791', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE),
('MBA. Peter', 'Macharia', 'peter.macharia@smartfarm.com', 'expert', '+255123456792', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE),
('Dr. Grace', 'Nyong''o', 'grace.nyongo@smartfarm.com', 'expert', '+255123456793', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE),
('Eng. Daniel', 'Maina', 'daniel.maina@smartfarm.com', 'expert', '+255123456794', '$2b$12$LKBwKlGQFqY4VwC6tBhz/ekzOGpBGFLwLU3HhFCY8aNQOkjgKKopm', TRUE, TRUE);

-- Get the IDs of the instructors (we'll assume they get IDs 1-6 for simplicity, but in real scenario we'd use proper queries)
-- Note: In production, you would run SELECT queries to get the actual IDs

-- Insert sample courses
INSERT IGNORE INTO academy_courses (
  title, slug, description, short_description, instructor_id, category_id, 
  level, duration_weeks, total_lessons, price, is_free, thumbnail_url,
  status, rating, total_ratings, enrollment_count, tags, requirements, what_you_learn
) VALUES 
(
  'Modern Crop Management Techniques',
  'modern-crop-management-techniques',
  'Master the art of sustainable crop production with cutting-edge techniques used by successful farmers worldwide. This comprehensive course covers everything from soil preparation to harvest optimization, incorporating both traditional wisdom and modern agricultural science.',
  'Learn advanced techniques for maximizing crop yield and quality using sustainable farming practices.',
  1, 1, 'beginner', 6, 24, 0.00, TRUE, '/uploads/academy/crop-management.jpg',
  'published', 4.8, 156, 1250,
  '["Sustainable Farming", "Crop Rotation", "Soil Health", "Yield Optimization"]',
  'Basic understanding of farming, Access to internet for online materials',
  'Soil preparation and analysis techniques, Crop rotation strategies, Pest and disease management, Harvest timing optimization, Sustainable farming practices'
),
(
  'Smart Irrigation Systems',
  'smart-irrigation-systems',
  'Dive deep into the world of precision agriculture with IoT-based irrigation systems. Learn to design, implement, and manage smart irrigation solutions that save water while maximizing crop productivity.',
  'Master the implementation and management of IoT-based irrigation systems for optimal water usage.',
  2, 2, 'intermediate', 4, 16, 49.99, FALSE, '/uploads/academy/smart-irrigation.jpg',
  'published', 4.9, 89, 890,
  '["IoT", "Water Management", "Automation", "Sensors", "Data Analytics"]',
  'Basic knowledge of farming, Familiarity with mobile apps, Interest in technology',
  'IoT sensor installation and configuration, Water scheduling optimization, Remote monitoring systems, Data analysis for irrigation decisions, Maintenance and troubleshooting'
),
(
  'Organic Pest Control Methods',
  'organic-pest-control-methods',
  'Protect your crops naturally with proven organic pest control methods. This course teaches you to identify pests early, use biological controls, and create integrated pest management strategies without harmful chemicals.',
  'Discover natural and organic methods for controlling pests without harmful chemicals.',
  3, 3, 'beginner', 3, 12, 0.00, TRUE, '/uploads/academy/organic-pest-control.jpg',
  'published', 4.7, 210, 2100,
  '["Organic Farming", "Natural Pesticides", "Integrated Pest Management", "Beneficial Insects"]',
  'Basic farming knowledge, Willingness to adopt organic practices',
  'Pest identification techniques, Beneficial insect cultivation, Natural pesticide preparation, IPM strategy development, Organic certification requirements'
),
(
  'Agricultural Business & Marketing',
  'agricultural-business-marketing',
  'Transform your farming operation into a profitable business venture. Learn essential business skills including financial planning, market analysis, digital marketing, and value chain management.',
  'Learn how to turn your farming venture into a profitable business with modern marketing strategies.',
  4, 4, 'advanced', 8, 32, 79.99, FALSE, '/uploads/academy/agri-business.jpg',
  'published', 4.6, 75, 750,
  '["Business Planning", "Marketing", "Financial Management", "Value Chain", "Digital Marketing"]',
  'Existing farming experience, Basic computer skills, Access to smartphone/computer',
  'Business plan development, Market research and analysis, Financial planning and budgeting, Digital marketing strategies, Supply chain management, Customer relationship management'
),
(
  'Sustainable Livestock Management',
  'sustainable-livestock-management',
  'Learn modern livestock management techniques that prioritize animal welfare while maximizing productivity. Cover breeding, nutrition, housing, and health management for various livestock species.',
  'Comprehensive guide to modern, sustainable livestock farming practices and management.',
  5, 5, 'intermediate', 5, 20, 39.99, FALSE, '/uploads/academy/livestock-management.jpg',
  'published', 4.5, 92, 450,
  '["Animal Husbandry", "Nutrition", "Breeding", "Health Management", "Sustainability"]',
  'Basic understanding of animal care, Access to livestock or planning to start',
  'Animal nutrition planning, Breeding program management, Disease prevention strategies, Housing and facility design, Record keeping and management'
),
(
  'Soil Health and Fertility Management',
  'soil-health-fertility-management',
  'Understand the foundation of successful farming - healthy soil. Learn to assess soil health, improve fertility naturally, and maintain productive soils for long-term sustainability.',
  'Master soil science fundamentals and learn to maintain healthy, productive soils.',
  6, 6, 'intermediate', 4, 18, 29.99, FALSE, '/uploads/academy/soil-health.jpg',
  'published', 4.7, 134, 890,
  '["Soil Science", "Composting", "Nutrient Management", "Soil Testing", "Conservation"]',
  'Basic farming knowledge, Willingness to conduct soil tests',
  'Soil composition and structure analysis, Nutrient cycling understanding, Composting techniques, Soil testing and interpretation, Erosion prevention methods'
);

-- Insert sample lessons for the first course (Modern Crop Management)
INSERT IGNORE INTO academy_lessons (course_id, title, slug, description, content, lesson_order, duration_minutes, video_url, lesson_type, is_preview, is_active) VALUES
(1, 'Introduction to Modern Crop Management', 'introduction-modern-crop-management', 'Overview of modern crop management principles and objectives', 'Welcome to Modern Crop Management! In this introductory lesson, we will explore...', 1, 15, '/uploads/academy/videos/lesson-1-1.mp4', 'video', TRUE, TRUE),
(1, 'Soil Analysis and Preparation', 'soil-analysis-preparation', 'Learn how to analyze and prepare soil for optimal crop production', 'Soil is the foundation of successful crop production. In this lesson...', 2, 25, '/uploads/academy/videos/lesson-1-2.mp4', 'video', FALSE, TRUE),
(1, 'Seed Selection and Quality', 'seed-selection-quality', 'Understanding seed varieties and quality factors', 'Choosing the right seeds is crucial for successful farming...', 3, 20, '/uploads/academy/videos/lesson-1-3.mp4', 'video', FALSE, TRUE),
(1, 'Planting Techniques and Timing', 'planting-techniques-timing', 'Master various planting methods and optimal timing', 'Proper planting techniques can significantly impact your yield...', 4, 30, '/uploads/academy/videos/lesson-1-4.mp4', 'video', FALSE, TRUE);

-- Insert sample lessons for Smart Irrigation course
INSERT IGNORE INTO academy_lessons (course_id, title, slug, description, content, lesson_order, duration_minutes, video_url, lesson_type, is_preview, is_active) VALUES
(2, 'Introduction to Smart Irrigation', 'introduction-smart-irrigation', 'Understanding IoT-based irrigation systems', 'Smart irrigation systems are revolutionizing agriculture...', 1, 20, '/uploads/academy/videos/lesson-2-1.mp4', 'video', TRUE, TRUE),
(2, 'Sensor Types and Installation', 'sensor-types-installation', 'Learn about different sensors and how to install them', 'Sensors are the eyes and ears of your irrigation system...', 2, 35, '/uploads/academy/videos/lesson-2-2.mp4', 'video', FALSE, TRUE),
(2, 'System Design and Planning', 'system-design-planning', 'Design your irrigation system layout', 'Proper planning is essential for an efficient irrigation system...', 3, 40, '/uploads/academy/videos/lesson-2-3.mp4', 'video', FALSE, TRUE);

-- Insert sample live sessions
INSERT IGNORE INTO academy_live_sessions (course_id, instructor_id, title, description, session_date, duration_minutes, max_participants, meeting_url, status) VALUES
(1, 1, 'Q&A Session: Tomato Disease Management', 'Interactive session discussing common tomato diseases and their management strategies', '2025-08-20 14:00:00', 60, 100, 'https://meet.example.com/tomato-qa-session', 'scheduled'),
(2, 2, 'Live Demo: Setting up Drip Irrigation', 'Hands-on demonstration of drip irrigation system installation and configuration', '2025-08-22 10:00:00', 120, 50, 'https://meet.example.com/drip-irrigation-demo', 'scheduled'),
(3, 3, 'Organic Farming Success Stories', 'Panel discussion with successful organic farmers sharing their experiences', '2025-08-25 16:00:00', 90, 150, 'https://meet.example.com/organic-success-stories', 'scheduled');

-- Insert some sample course ratings
INSERT IGNORE INTO academy_course_ratings (user_id, course_id, rating, review, is_public) VALUES
(1, 1, 5, 'Excellent course! Very practical and well-structured. The instructor explains concepts clearly.', TRUE),
(2, 1, 4, 'Great content, learned a lot about sustainable farming practices.', TRUE),
(3, 2, 5, 'Amazing course on smart irrigation. The IoT integration examples were very helpful.', TRUE),
(4, 3, 4, 'Good introduction to organic pest control. Would recommend for beginners.', TRUE);
