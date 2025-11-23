// This script will help monitor what API calls the frontend is making
const express = require('express');
const app = express();

// Add logging middleware to track all API calls
app.use('/api/*', (req, res, next) => {
  console.log('\n🌐 API Request Received:');
  console.log(`📍 Method: ${req.method}`);
  console.log(`🔗 URL: ${req.originalUrl}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log(`🔑 Authorization: ${req.headers.authorization ? 'Present ✅' : 'Missing ❌'}`);
  console.log(`👤 User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  console.log(`📦 Body:`, req.body);
  console.log(`🔍 Query:`, req.query);
  console.log('─'.repeat(80));
  
  // Log the response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 Response Status: ${res.statusCode}`);
    console.log(`📦 Response Data:`, typeof data === 'string' ? data.substring(0, 200) + '...' : data);
    console.log('═'.repeat(80));
    return originalSend.call(this, data);
  };
  
  next();
});

console.log(`
🔍 Frontend Debug Monitor
========================

To use this debug script:

1. Open your browser to the My Courses page
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Clear network logs
5. Refresh the My Courses page
6. Look for API calls to /api/academy/my-courses or similar
7. Check the response data

Expected API calls:
✅ GET /api/academy/my-courses (with Authorization header)
✅ GET /api/academy/my-enrolled-courses (with Authorization header)

If you see different endpoints or missing Authorization headers, that's the issue!

Common Issues to Check:
━━━━━━━━━━━━━━━━━━━━━━━
1. Wrong endpoint: /api/courses/my-courses (old) vs /api/academy/my-courses (correct)
2. Missing Authorization header
3. Token expired or invalid
4. Frontend not handling response correctly
5. CORS issues
6. Base URL configuration in frontend

In Browser DevTools Network Tab, look for:
• Request URL: Should be /api/academy/my-courses
• Request Headers: Should include Authorization: Bearer [token]
• Response: Should show enrolled courses data

This monitoring script is now ready. Check your browser's Network tab!
`);

module.exports = app;
