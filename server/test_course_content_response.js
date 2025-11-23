const axios = require('axios');

// Test the course content API response
async function testCourseContentAPI() {
  const API_BASE = 'http://localhost:5000';
  const COURSE_ID = 6;
  const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImlhdCI6MTc1NTg0MzczMSwiZXhwIjoxNzU2NDQ4NTMxfQ.WU2x1UGJB8UUwrAh_nwUNDiOpNmTDcDbE8SMoB7QVG0';

  try {
    console.log('🔍 Testing course content API...');
    console.log(`📡 Making request to: ${API_BASE}/academy/courses/${COURSE_ID}/content`);
    
    const response = await axios.get(`${API_BASE}/academy/courses/${COURSE_ID}/content`, {
      headers: {
        'Authorization': AUTH_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check the structure
    if (response.data.success) {
      const content = response.data.data?.content || [];
      console.log(`\n📊 Content Analysis:`);
      console.log(`   Total items: ${content.length}`);
      
      if (content.length > 0) {
        console.log(`\n📋 First content item structure:`);
        const firstItem = content[0];
        console.log('   Properties:', Object.keys(firstItem));
        console.log('   Content Type Property:', firstItem.contentType || firstItem.type || firstItem.content_type);
        console.log('   Title:', firstItem.title);
        console.log('   File URL:', firstItem.fileUrl);
        
        console.log(`\n📝 All content items:`);
        content.forEach((item, index) => {
          console.log(`   ${index + 1}. "${item.title}" - Type: ${item.contentType || item.type} - URL: ${item.fileUrl}`);
        });
      }
    } else {
      console.log('❌ API returned unsuccessful response:', response.data.message);
    }

  } catch (error) {
    console.log('❌ API Request failed:');
    console.log('   Status:', error.response?.status);
    console.log('   Message:', error.response?.data?.message || error.message);
    console.log('   Full error response:', error.response?.data);
  }
}

// Run the test
testCourseContentAPI().catch(console.error);
