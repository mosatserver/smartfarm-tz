# Enhanced Session Management Backend Implementation

## Overview
This document outlines the complete backend implementation for the enhanced "Manage Sessions" functionality that supports course-based session management, content uploads, and comprehensive live session features.

## Implemented Backend Features

### 1. **Enhanced Course Routes** (`routes/courses.js`)
- **Upload Content Endpoint**: `POST /courses/upload-content`
  - Supports video and audio file uploads for courses
  - Restricted to course instructors only
  - Uses enhanced file upload middleware

- **Get Instructor Courses**: `GET /courses/instructor/my-courses`
  - Returns all courses created by the authenticated expert
  - Used for session management course selection

- **Get Course Sessions**: `GET /courses/:courseId/sessions`
  - Returns all live sessions associated with a specific course
  - Access controlled for instructors and enrolled students

### 2. **Enhanced Upload Middleware** (`middleware/upload.js`)
- **Multi-format Support**: Images, videos, and audio files
- **Separate Storage Directories**:
  - `/uploads/courses/` - Course thumbnails
  - `/uploads/videos/` - Video content
  - `/uploads/audios/` - Audio content
- **File Type Validation**:
  - Images: JPEG, PNG, GIF, WebP
  - Videos: MP4, AVI, MOV, WMV, QuickTime
  - Audio: MP3, WAV, M4A, AAC, OGG
- **Size Limits**:
  - Images: 5MB max
  - Videos: 500MB max
  - Audio: 100MB max
- **Enhanced Error Handling**: Specific error messages for different file types and sizes

### 3. **Course Controller Enhancements** (`controllers/courseController.js`)

#### **uploadCourseContent Function**
- Validates course ownership before allowing uploads
- Checks file types and sizes according to content type
- Stores content metadata in `course_content` table
- Generates appropriate file paths based on content type
- Returns detailed upload confirmation with content metadata

#### **getInstructorCourses Function**
- Alias for `getMyCourses` specifically for session management
- Returns instructor's courses with enrollment counts and metadata

#### **getCourseSessions Function**
- Fetches all live sessions for a specific course
- Validates user access (instructor or enrolled student)
- Returns formatted session data with participant counts
- Includes session status and meeting details

### 4. **Database Schema** (`database/course_content_migration.sql`)

#### **course_content Table**
```sql
- id (Primary Key)
- course_id (Foreign Key to academy_courses)
- title (Content title)
- description (Optional description)
- content_type (ENUM: 'video', 'audio')
- file_url (Path to uploaded file)
- file_name (Original filename)
- file_size (File size in bytes)
- mime_type (File MIME type)
- duration_seconds (Content duration)
- thumbnail_url (Optional thumbnail)
- upload_status (ENUM: 'uploading', 'completed', 'failed', 'processing')
- content_order (Display order)
- is_preview (Boolean for free preview content)
- access_level (ENUM: 'free', 'premium', 'enrolled_only')
- view_count (Usage analytics)
- created_by (Foreign Key to users)
- Timestamps
```

#### **Supporting Tables**
- **content_progress**: Track user viewing progress
- **content_comments**: Enable discussions on content
- **content_likes**: Support reactions and engagement

### 5. **Live Sessions Integration**
- **Enhanced Session Creation**: Sessions can be linked to specific courses
- **Student Notification System**: Automatically notifies enrolled students
- **Course-based Participant Management**: Uses course enrollments for session access
- **Instructor Session Controls**: Start, manage, and end sessions with course context

## API Endpoints Summary

### Course Content Management
```
POST /courses/upload-content
- Headers: Authorization (Bearer token)
- Body: FormData with 'file', 'course_id', 'type', 'title'
- Response: Content metadata with upload confirmation

GET /courses/instructor/my-courses
- Headers: Authorization (Bearer token)
- Response: Array of instructor's courses with metadata

GET /courses/:courseId/sessions
- Headers: Authorization (Bearer token)
- Response: Array of course-linked live sessions
```

### Live Session Management
```
POST /live-sessions
- Body: Can include 'course_id' for course-linked sessions
- Enhanced to support course-based participant management

PATCH /live-sessions/:sessionId/start
- Enhanced to notify course-enrolled students
- Automatic participant management for course students
```

## Security Features
- **File Type Validation**: Prevents malicious file uploads
- **Size Limitations**: Prevents server resource exhaustion
- **Course Ownership Verification**: Ensures only instructors can manage their content
- **Access Control**: Students can only access content from enrolled courses
- **Authentication Required**: All endpoints require valid JWT tokens

## Error Handling
- **Comprehensive Error Messages**: Specific feedback for different failure scenarios
- **Validation Errors**: Clear messages for missing or invalid data
- **File Upload Errors**: Detailed feedback for size limits and file type issues
- **Permission Errors**: Clear access denied messages with context

## Integration Points
- **Frontend Upload Progress**: Supports progress tracking during file uploads
- **Course Enrollment System**: Integrates with existing enrollment logic
- **Live Session Notifications**: Connects with notification system for student alerts
- **User Management**: Respects user roles (expert vs student permissions)

## Usage Flow
1. **Instructor selects course** from their courses list
2. **Choose content type**: Live session, scheduled session, video upload, or audio upload
3. **Content creation/upload** with validation and progress tracking
4. **Automatic integration** with course enrollment system
5. **Student notifications** for live sessions and new content
6. **Analytics and tracking** for content engagement

This implementation provides a complete backend foundation for the enhanced session management UI, supporting all the frontend functionality with proper security, validation, and data management.
