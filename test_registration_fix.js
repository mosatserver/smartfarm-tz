// Use built-in fetch (Node.js 18+)

async function testRegistration() {
  console.log('🧪 Testing Registration API Fix...\n');
  
  // Test data
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test_${Date.now()}@example.com`,
    userType: 'farmer',
    mobileNumber: '+255123456789',
    password: 'TestPass123',
    confirmPassword: 'TestPass123'
  };

  console.log('📤 Sending registration request with data:', {
    ...testUser,
    password: '***',
    confirmPassword: '***'
  });

  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    console.log('\n📥 Response Details:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('OK:', response.ok);

    const data = await response.json();
    console.log('\n📋 Response Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS: Registration API is working correctly!');
      
      if (data.data?.token) {
        console.log('✅ Token received successfully');
      } else {
        console.log('❌ No token in response');
      }
      
      if (data.data?.userId) {
        console.log('✅ User ID received successfully');
      } else {
        console.log('❌ No user ID in response');
      }
    } else {
      console.log('\n❌ FAILED: Registration request failed');
      if (data.errors && Array.isArray(data.errors)) {
        console.log('Validation Errors:');
        data.errors.forEach(error => console.log('  -', error.msg));
      } else if (data.message) {
        console.log('Error Message:', data.message);
      }
    }

  } catch (error) {
    console.log('\n🚨 ERROR: Could not connect to server');
    console.log('Error:', error.message);
    console.log('\nMake sure the server is running on http://localhost:5000');
  }
}

// Run the test
testRegistration();
