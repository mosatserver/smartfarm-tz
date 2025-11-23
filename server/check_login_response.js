const axios = require('axios');

async function checkLoginResponse() {
  console.log('🔍 Checking login response structure...\n');

  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'hamida@gmail.com',
      password: 'Allahuma@11'
    });

    console.log('📊 Full login response:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Login error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkLoginResponse();
