const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, body: json || body });
      });
    });
    req.on('error', (err) => resolve({ status: 'ERROR', body: err.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("==========================================");
  console.log("MEHNDIGO DATABASE-BACKED API SMOKE TESTS");
  console.log("==========================================");

  const health = await makeRequest('/health');
  console.log("1. GET /health -> Status:", health.status, "| Success:", health.body.success);

  const loginPassword = await makeRequest('/api/v1/mehndigo/user/login', 'POST', {
    email: 'ankityadav941318@gmail.com',
    password: 'admin123'
  });
  console.log("2. POST /user/login (Admin Password) -> Status:", loginPassword.status, "| Success:", loginPassword.body.success, "| User:", loginPassword.body.data?.user?.name, "| Role:", loginPassword.body.data?.user?.role);

  const loginCustomer = await makeRequest('/api/v1/mehndigo/user/login', 'POST', {
    email: 'rani@gmail.com',
    password: '123456'
  });
  console.log("3. POST /user/login (Customer Password) -> Status:", loginCustomer.status, "| Success:", loginCustomer.body.success, "| User:", loginCustomer.body.data?.user?.name, "| Role:", loginCustomer.body.data?.user?.role);

  const loginArtist = await makeRequest('/api/v1/mehndigo/user/login', 'POST', {
    email: 'pooja@mehndi.com',
    password: '123456'
  });
  console.log("4. POST /user/login (Artist Password) -> Status:", loginArtist.status, "| Success:", loginArtist.body.success, "| User:", loginArtist.body.data?.user?.name, "| Role:", loginArtist.body.data?.user?.role);

  const sendOtp = await makeRequest('/api/v1/mehndigo/user/send-otp', 'POST', {
    email: 'rani@gmail.com'
  });
  console.log("5. POST /user/send-otp (Existing User) -> Status:", sendOtp.status, "| Success:", sendOtp.body.success, "| Exists:", sendOtp.body.data?.exists);

  const sendOtpNew = await makeRequest('/api/v1/mehndigo/user/send-otp', 'POST', {
    email: 'newuser999@gmail.com'
  });
  console.log("6. POST /user/send-otp (New User) -> Status:", sendOtpNew.status, "| Success:", sendOtpNew.body.success, "| Exists:", sendOtpNew.body.data?.exists);

  const artists = await makeRequest('/api/v1/mehndigo/user/artists');
  console.log("7. GET /user/artists -> Status:", artists.status, "| Success:", artists.body.success, "| Count:", Array.isArray(artists.body.data) ? artists.body.data.length : 'N/A');

  const categories = await makeRequest('/category');
  console.log("8. GET /category -> Status:", categories.status, "| Success:", categories.body.success);

  console.log("==========================================");
  console.log("ALL CORE API TESTS COMPLETED!");
  console.log("==========================================");
}

runTests();
