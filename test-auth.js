const axios = require('axios');
const API_URL = 'http://localhost:8000/api/v1/mehndigo';

async function runTests() {
  console.log('Testing Authentication Endpoints (Email-First Flow)...');

  try {
    // 1. Test Admin Login (OTP Request using Email)
    console.log('\n--- 1. Admin Login via Email (OTP Request) ---');
    const adminEmailRes = await axios.post(`${API_URL}/user/send-otp`, {
      email: 'ankityadav941318@gmail.com',
      role: 'ADMIN'
    });
    console.log('Admin Email Login Response:', adminEmailRes.data);
    const adminOtp = adminEmailRes.data.data.otp;

    // 2. Test Admin Login (OTP Verification)
    console.log('\n--- 2. Admin Login (OTP Verify) ---');
    const adminVerifyRes = await axios.post(`${API_URL}/user/verify-otp`, {
      email: 'ankityadav941318@gmail.com',
      otp: adminOtp,
      role: 'ADMIN'
    });
    console.log('Admin Verify Response:', adminVerifyRes.data.message, '| Role:', adminVerifyRes.data.data.user.role);

    // 3. Test Registration WITHOUT phone number (Optional field)
    console.log('\n--- 3. User Registration WITHOUT Phone Number (OTP Request) ---');
    const newEmailNoPhone = `testnophone${Date.now()}@example.com`;
    const regRes1 = await axios.post(`${API_URL}/user/register-send-otp`, {
      name: 'Test No Phone User',
      email: newEmailNoPhone,
      role: 'USER'
    });
    console.log('Register Response:', regRes1.data);
    const regOtp1 = regRes1.data.data.otp;

    // 4. Test Registration WITHOUT phone number (OTP Verification)
    console.log('\n--- 4. User Registration WITHOUT Phone Number (OTP Verify) ---');
    const regVerifyRes1 = await axios.post(`${API_URL}/user/register-verify-otp`, {
      email: newEmailNoPhone,
      otp: regOtp1
    });
    console.log('Register Verify Response (Null Phone):', regVerifyRes1.data.message, '| Phone:', regVerifyRes1.data.data.user.phone);

    // 5. Test Registration WITH phone number (Optional field provided)
    console.log('\n--- 5. User Registration WITH Phone Number (OTP Request) ---');
    const newEmailWithPhone = `testphone${Date.now()}@example.com`;
    const newPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const regRes2 = await axios.post(`${API_URL}/user/register-send-otp`, {
      name: 'Test With Phone User',
      email: newEmailWithPhone,
      role: 'USER',
      phone: newPhone
    });
    console.log('Register Response:', regRes2.data);
    const regOtp2 = regRes2.data.data.otp;

    // 6. Test Registration WITH phone number (OTP Verification)
    console.log('\n--- 6. User Registration WITH Phone Number (OTP Verify) ---');
    const regVerifyRes2 = await axios.post(`${API_URL}/user/register-verify-otp`, {
      email: newEmailWithPhone,
      otp: regOtp2
    });
    console.log('Register Verify Response:', regVerifyRes2.data.message, '| Phone:', regVerifyRes2.data.data.user.phone);

    // 7. Check non-existing email login (returns 404 error)
    console.log('\n--- 7. Non-existing Email Login (OTP Request) ---');
    try {
      await axios.post(`${API_URL}/user/send-otp`, {
        email: 'notregistered@example.com',
        role: 'USER'
      });
      console.log('❌ Unexpected success for non-existent email login');
    } catch (e) {
      if (e.response && e.response.status === 404) {
        console.log('✅ Correctly blocked login for unregistered email (Status: 404)');
      } else {
        throw e;
      }
    }

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
