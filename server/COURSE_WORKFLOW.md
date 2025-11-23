# Course Management Workflow with Image Upload

## 🎯 Overview
This implementation provides a comprehensive course management system where:
- **Courses are created as 'draft' by default**
- **Experts can upload course thumbnail images**
- **Draft courses can be edited and published separately**
- **Published courses appear in the public "All Courses" section**

## 📸 Image Upload Support

### File Upload Configuration
- **Upload Directory**: `server/uploads/courses/`
- **File Size Limit**: 5MB
- **Allowed Formats**: Images only (jpg, png, gif, etc.)
- **File Naming**: `course_[timestamp]-[random].[ext]`
- **Static Access**: `http://localhost:5000/uploads/courses/[filename]`

### Upload Middleware
- **Location**: `middleware/upload.js`
- **Features**: 
  - Automatic directory creation
  - File type validation  
  - Error handling for size limits
  - Unique filename generation

## 🔄 Course Workflow

### 1. Course Creation
```http
POST /api/courses
Content-Type: multipart/form-data
Authorization: Bearer [expert_token]

FormData:
- title: "Course Title"
- description: "Course Description"
- category: "Agriculture"
- level: "beginner"
- duration_weeks: 4
- price: "Free"
- tags: ["farming", "plants"]
- prerequisites: "Basic knowledge"
- learning_objectives: ["Learn X", "Understand Y"]
- thumbnail: [image_file]  // Optional
```

**Result**: Course created with `status = 'draft'`

### 2. Get My Courses (Expert Dashboard)
```http
GET /api/courses/my-courses
Authorization: Bearer [expert_token]
```

**Response includes**:
- All courses (draft + published) owned by expert
- Additional fields:
  - `is_draft`: boolean
  - `can_publish`: boolean  
  - `can_edit`: boolean
  - `thumbnail_url`: string (or default)

### 3. Edit Draft Course
```http
PUT /api/courses/:id
Content-Type: multipart/form-data
Authorization: Bearer [expert_token]

FormData: (same as creation + optional new thumbnail)
```

**Features**:
- Updates course details
- Replaces thumbnail if new one uploaded
- Deletes old thumbnail automatically

### 4. Publish Course
```http
PATCH /api/courses/:id/publish
Authorization: Bearer [expert_token]
```

**Result**: Changes `status` from 'draft' to 'published'

### 5. Public Course Listing
```http
GET /api/courses
```

**Result**: Returns only courses with `status = 'published'`

## 🗂️ Database Schema

### academy_courses table
Key fields for the workflow:
- `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft'
- `thumbnail_url` VARCHAR(500) NULLABLE
- `instructor_id` INT (for ownership verification)

## 📁 File Structure

```
server/
├── middleware/
│   └── upload.js           # File upload handling
├── controllers/
│   └── courseController.js # Updated with image support
├── routes/
│   └── courses.js          # Updated routes with upload middleware
├── uploads/
│   └── courses/            # Course thumbnail storage
└── server.js               # Static file serving configured
```

## 🎨 Frontend Integration Guidelines

### Course Creation Form
```html
<form enctype="multipart/form-data">
  <input type="text" name="title" required />
  <textarea name="description" required></textarea>
  <select name="category">...</select>
  <select name="level">...</select>
  <input type="number" name="duration_weeks" />
  <input type="text" name="price" />
  <input type="file" name="thumbnail" accept="image/*" />
  <button type="submit">Create Course</button>
</form>
```

### Expert Dashboard
```javascript
// Get my courses (including drafts)
fetch('/api/courses/my-courses', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(res => res.json())
.then(data => {
  data.courses.forEach(course => {
    if (course.is_draft) {
      // Show "Edit" and "Publish" buttons
      showDraftActions(course);
    } else {
      // Show "Edit" and "Unpublish" buttons  
      showPublishedActions(course);
    }
  });
});
```

### Publish Course Action
```javascript
function publishCourse(courseId) {
  fetch(`/api/courses/${courseId}/publish`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // Refresh course list or update UI
      refreshCourseList();
    }
  });
}
```

## 🔒 Security Features

1. **File Upload Security**:
   - File type validation
   - Size limits (5MB)
   - Unique filename generation
   - Directory traversal prevention

2. **Access Control**:
   - Only course owners can edit/publish
   - JWT token verification
   - Expert role requirement

3. **Parameter Validation**:
   - Secure query wrapper
   - SQL injection prevention
   - Input sanitization

## 🚀 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/courses` | Expert | Create course (draft) |
| GET | `/api/courses/my-courses` | Expert | Get own courses |
| PUT | `/api/courses/:id` | Expert | Update course |
| PATCH | `/api/courses/:id/publish` | Expert | Publish course |
| PATCH | `/api/courses/:id/unpublish` | Expert | Unpublish course |
| GET | `/api/courses` | Public | Get published courses |
| GET | `/uploads/courses/:filename` | Public | Access uploaded images |

## 🎉 Benefits

1. **Better UX**: Experts can create and refine courses before publishing
2. **Image Support**: Visual course thumbnails improve engagement  
3. **Draft Management**: Clear separation between work-in-progress and public content
4. **Flexible Publishing**: Easy publish/unpublish workflow
5. **Security**: Proper file handling and access control

This implementation provides a professional course management workflow suitable for an educational platform.
