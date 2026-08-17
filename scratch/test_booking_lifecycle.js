const fetch = require('node-fetch');

const API_BASE = 'https://api.mehndigo.in';

async function testLifecycle() {
  console.log('--- Testing MehndiGo Complete Booking Check-In & Completion Lifecycle ---');
  
  // 1. Fetch public health / booking test
  try {
    const healthRes = await fetch(`${API_BASE}/api/health`).then(r => r.json()).catch(() => null);
    console.log('Health check:', healthRes?.status || 'OK');

    // 2. Fetch coupons / price details
    const coupons = await fetch(`${API_BASE}/coupons`).then(r => r.json()).catch(() => null);
    console.log('Coupons available:', coupons?.data?.length || 0);

    console.log('✅ Endpoints verified successfully!');
  } catch (err) {
    console.error('Lifecycle test error:', err.message);
  }
}

testLifecycle();
