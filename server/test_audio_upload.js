/**
 * Test script to verify audio upload functionality
 * Run this with: node test_audio_upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_COURSE_ID = 1; // Change this to a valid course ID in your database
const TEST_USER_TOKEN = 'your-jwt-token-here'; // You'll need to get this from login

async function testAudioUpload() {
  console.log('🧪 Starting audio upload test...\n');
  
  try {
    // Step 1: Check if server is running
    console.log('📡 Checking server connection...');
    const healthCheck = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Server is running:', healthCheck.data.message);
    
    // Step 2: Create a test audio file
    console.log('\n🎵 Creating test audio file...');
    const testAudioPath = path.join(__dirname, 'test_audio.mp3');
    
    // Create a small fake MP3 file for testing
    const fakeMP3Header = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, // MP3 header
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    
    fs.writeFileSync(testAudioPath, fakeMP3Header);
    console.log('✅ Test audio file created');
    
    // Step 3: Prepare form data
    console.log('\n📦 Preparing upload data...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testAudioPath));
    form.append('course_id', TEST_COURSE_ID.toString());
    form.append('type', 'audio');
    form.append('title', 'Test Audio Upload');
    
    console.log('FormData prepared with:');
    console.log('  - file: test audio file');
    console.log('  - course_id:', TEST_COURSE_ID);
    console.log('  - type: audio');
    console.log('  - title: Test Audio Upload');
    
    // Step 4: Test upload
    console.log('\n🚀 Testing audio upload...');
    const headers = {
      ...form.getHeaders()
    };
    
    // Add auth token if provided
    if (TEST_USER_TOKEN && TEST_USER_TOKEN !== 'your-jwt-token-here') {
      headers['Authorization'] = `Bearer ${TEST_USER_TOKEN}`;
    }
    
    console.log('Request headers:', Object.keys(headers));
    
    const response = await axios.post(
      `${SERVER_URL}/api/courses/upload-content`,
      form,
      { 
        headers,
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('\n✅ Upload successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('\n❌ Upload failed!');
    console.error('Error details:');
    console.error('  Status:', error.response?.status);
    console.error('  Status Text:', error.response?.statusText);
    console.error('  Message:', error.message);
    console.error('  Response Data:', error.response?.data);
    
    // Specific error diagnostics
    if (error.response?.status === 401) {
      console.log('\n🔐 Authentication Issue:');
      console.log('  - Make sure you have a valid JWT token');
      console.log('  - Update TEST_USER_TOKEN in this script');
    } else if (error.response?.status === 404) {
      console.log('\n🔍 Endpoint Issue:');
      console.log('  - Check if the course ID exists in database');
      console.log('  - Verify the API route is correctly defined');
    } else if (error.response?.status === 400) {
      console.log('\n📝 Validation Issue:');
      console.log('  - Check required fields are present');
      console.log('  - Verify file type validation');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔌 Connection Issue:');
      console.log('  - Make sure the backend server is running');
      console.log('  - Check if it\'s running on port 5000');
    }
  } finally {
    // Cleanup test file
    const testAudioPath = path.join(__dirname, 'test_audio.mp3');
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
      console.log('\n🧹 Test file cleaned up');
    }
  }
}

// Helper function to test individual components
async function testIndividualComponents() {
  console.log('\n🔧 Testing individual components...\n');
  
  // Test 1: Check uploads directory
  console.log('📁 Checking uploads directory structure...');
  const uploadsDir = path.join(__dirname, 'uploads');
  const audiosDir = path.join(uploadsDir, 'audios');
  const videosDir = path.join(uploadsDir, 'videos');
  
  console.log('Uploads dir exists:', fs.existsSync(uploadsDir));
  console.log('Audios dir exists:', fs.existsSync(audiosDir));
  console.log('Videos dir exists:', fs.existsSync(videosDir));
  
  // Test 2: Check database connection
  console.log('\n💾 Testing database schema...');
  try {
    const { pool } = require('./config/database');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'course_content'");
    console.log('course_content table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [columns] = await pool.execute("DESCRIBE course_content");
      console.log('Table columns:', columns.map(col => col.Field).join(', '));
    }
  } catch (error) {
    console.log('Database test failed:', error.message);
  }
  
  // Test 3: Check multer configuration
  console.log('\n🔧 Testing multer configuration...');
  try {
    const { handleContentUpload } = require('./middleware/upload');
    console.log('Upload middleware loaded successfully');
  } catch (error) {
    console.log('Upload middleware test failed:', error.message);
  }
}

// Main execution
console.log('🎯 Audio Upload Diagnostic Tool');
console.log('================================\n');

if (process.argv.includes('--components-only')) {
  testIndividualComponents();
} else if (process.argv.includes('--help')) {
  console.log('Usage:');
  console.log('  node test_audio_upload.js                 # Full upload test');
  console.log('  node test_audio_upload.js --components-only # Test components only');
  console.log('  node test_audio_upload.js --help           # Show this help');
  console.log('\nBefore running full test:');
  console.log('  1. Make sure the backend server is running');
  console.log('  2. Update TEST_COURSE_ID with a valid course ID');
  console.log('  3. Update TEST_USER_TOKEN with a valid JWT token (expert user)');
} else {
  // Run both tests
  testIndividualComponents().then(() => {
    console.log('\n' + '='.repeat(50) + '\n');
    return testAudioUpload();
  });
}
