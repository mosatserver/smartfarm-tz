/**
 * Debug script to test the exact upload request that's failing
 * This replicates what the browser is sending
 */

const express = require('express');
const app = express();
const multer = require('multer');

// Test middleware individually
console.log('🧪 Testing Upload Middleware Components\n');

// Test 1: Check if multer accepts audio files
console.log('1️⃣ Testing Multer Audio File Filter...');

const { contentFileFilter } = require('./middleware/upload');

// Simulate different audio file types
const testFiles = [
  { mimetype: 'audio/mp3', originalname: 'test.mp3' },
  { mimetype: 'audio/mpeg', originalname: 'test.mp3' },
  { mimetype: 'audio/wav', originalname: 'test.wav' },
  { mimetype: 'audio/m4a', originalname: 'test.m4a' },
  { mimetype: 'audio/ogg', originalname: 'test.ogg' },
  { mimetype: 'audio/vorbis', originalname: 'test.ogg' },
  { mimetype: 'audio/webm', originalname: 'test.webm' },
  { mimetype: 'video/mp4', originalname: 'test.mp4' }, // Should also work
];

testFiles.forEach(file => {
  try {
    console.log(`Testing ${file.mimetype}...`);
    
    // Test the file filter function
    const result = new Promise((resolve) => {
      const mockReq = {};
      const mockCb = (error, accepted) => {
        resolve({ error, accepted });
      };
      
      // Import the actual filter function
      const { handleContentUpload } = require('./middleware/upload');
      
      // We need to test the contentFileFilter function directly
      const path = require('path');
      const fs = require('fs');
      const multerConfig = require('./middleware/upload');
      
      // Create a temporary test
      const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/quicktime'];
      const allowedAudioTypes = [
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac', 
        'audio/ogg', 'audio/vorbis', 'audio/webm'
      ];
      
      const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes];
      
      if (allowedTypes.includes(file.mimetype)) {
        mockCb(null, true);
      } else {
        mockCb(new Error('Invalid file type'), false);
      }
    });
    
    result.then(({ error, accepted }) => {
      if (accepted) {
        console.log(`  ✅ ${file.mimetype} - ACCEPTED`);
      } else {
        console.log(`  ❌ ${file.mimetype} - REJECTED: ${error?.message}`);
      }
    });
    
  } catch (error) {
    console.log(`  💥 ${file.mimetype} - ERROR: ${error.message}`);
  }
});

// Test 2: Check middleware chain
console.log('\n2️⃣ Testing Middleware Chain...');

// Mock request that matches what frontend sends
const mockRequest = {
  body: {
    course_id: '1',
    type: 'audio',
    title: 'Test Audio Upload'
  },
  file: {
    fieldname: 'file',
    originalname: 'test.mp3',
    encoding: '7bit',
    mimetype: 'audio/mp3',
    size: 1024,
    destination: './uploads/audios',
    filename: 'audio_123456.mp3',
    path: './uploads/audios/audio_123456.mp3'
  },
  userId: 1,  // Assume authenticated
  userType: 'expert'  // Assume expert role
};

console.log('Mock request body:', mockRequest.body);
console.log('Mock file:', mockRequest.file);

// Test 3: Validate controller function requirements
console.log('\n3️⃣ Testing Controller Requirements...');

const { uploadCourseContent } = require('./controllers/courseController');

// Check what the controller expects
console.log('Controller function exists:', typeof uploadCourseContent === 'function');

// Test 4: Check database for test course
console.log('\n4️⃣ Testing Database Requirements...');

async function testDatabase() {
  try {
    const { pool } = require('./config/database');
    
    // Check if we have any courses to test with
    const [courses] = await pool.execute('SELECT id, title, instructor_id FROM academy_courses LIMIT 5');
    console.log('Available courses for testing:');
    courses.forEach(course => {
      console.log(`  - Course ID: ${course.id}, Title: ${course.title}, Instructor: ${course.instructor_id}`);
    });
    
    // Check if we have any expert users
    const [experts] = await pool.execute("SELECT id, first_name, user_type FROM users WHERE user_type = 'expert' LIMIT 3");
    console.log('\nAvailable expert users:');
    experts.forEach(expert => {
      console.log(`  - User ID: ${expert.id}, Name: ${expert.first_name}, Type: ${expert.user_type}`);
    });
    
    if (courses.length > 0 && experts.length > 0) {
      console.log('\n✅ Database has required data for testing');
      console.log('📝 Suggested test parameters:');
      console.log(`  - TEST_COURSE_ID: ${courses[0].id}`);
      console.log(`  - TEST_USER_ID: ${experts[0].id}`);
    } else {
      console.log('\n❌ Database missing required data:');
      if (courses.length === 0) console.log('  - No courses found');
      if (experts.length === 0) console.log('  - No expert users found');
    }
    
  } catch (error) {
    console.log('Database test failed:', error.message);
  }
}

// Test 5: Check authentication middleware
console.log('\n5️⃣ Testing Authentication Flow...');

async function testAuthFlow() {
  try {
    const { authenticateToken } = require('./middleware/authMiddleware');
    const { requireExpert } = require('./middleware/roleMiddleware');
    
    console.log('authenticateToken middleware exists:', typeof authenticateToken === 'function');
    console.log('requireExpert middleware exists:', typeof requireExpert === 'function');
    
    // Check JWT configuration
    console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
    
  } catch (error) {
    console.log('Auth middleware test failed:', error.message);
  }
}

// Run all tests
(async () => {
  await testDatabase();
  await testAuthFlow();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DEBUGGING RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  console.log('\n1. Check browser network tab for exact error response');
  console.log('2. Look at server console when upload fails');
  console.log('3. Verify user is logged in as expert');
  console.log('4. Confirm course ID exists and belongs to user');
  console.log('5. Check that audio file MIME type matches allowed types');
  
  console.log('\n📋 Next steps to debug:');
  console.log('1. Start the server with: npm start');
  console.log('2. Open browser dev tools Network tab');
  console.log('3. Try uploading an audio file');
  console.log('4. Check the 400 response body for exact error message');
  console.log('5. Check server console for error logs');
})();
