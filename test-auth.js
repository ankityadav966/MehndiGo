const axios = require('axios');
const API_URL = 'http://localhost:8000/api/v1/mehndigo';

async function runTests() {
  console.log('Testing Authentication Endpoints...');

  try {
    // 1. Test Admin Login (OTP Request)
    console.log('\n--- 1. Admin Login (OTP Request) ---');
    const adminRes = await axios.post(`${API_URL}/user/login`, {
      phone: '6350650966'
    });
    console.log('Admin Login Response:', adminRes.data);
    const adminOtp = adminRes.data.data.otp;

    // 2. Test Admin Login (OTP Verification)
    console.log('\n--- 2. Admin Login (OTP Verify) ---');
    const adminVerifyRes = await axios.post(`${API_URL}/user/verify-otp`, {
      phone: '6350650966',
      otp: adminOtp
    });
    console.log('Admin Verify Response:', adminVerifyRes.data.message, '| Role:', adminVerifyRes.data.data.user.role);

    // 3. Test User Registration (OTP Request)
    console.log('\n--- 3. User Registration (OTP Request) ---');
    const newEmail = `testuser${Date.now()}@example.com`;
    const regRes = await axios.post(`${API_URL}/user/register-send-otp`, {
      name: 'Test User',
      email: newEmail,
      password: 'password123',
      role: 'USER'
    });
    console.log('User Reg Response:', regRes.data);
    const userOtp = regRes.data.data.otp;

    // 4. Test User Registration (OTP Verification)
    console.log('\n--- 4. User Registration (OTP Verify) ---');
    const regVerifyRes = await axios.post(`${API_URL}/user/register-verify-otp`, {
      email: newEmail,
      otp: userOtp
    });
    console.log('User Reg Verify Response:', regVerifyRes.data.message, '| Role:', regVerifyRes.data.data.user.role);

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTests();
