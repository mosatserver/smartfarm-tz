-- Migration to add 'document' to content_type ENUM
-- This allows the course_content table to store document files

ALTER TABLE course_content 
MODIFY COLUMN content_type ENUM('video', 'audio', 'document') NOT NULL;
