import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  let headers = { 'Content-Type': 'application/json' };

  // === 1. AUTHORIZATION ===
  const authPayload = JSON.stringify({
    code_challenger: '04be7784d5ad2d4ecac792656f6969f9e1386d4b2f2429d1a6cee917080301cae'
  });

  const authRes = http.post('https://staging-chief.nexcloud.id/v1/nexchief/session/login/authorize', authPayload, { headers });

  console.log(`[AUTH] Status: ${authRes.status}`);
  console.log(`[AUTH] Headers:`, JSON.stringify(authRes.headers));

  let lowerHeaders = {};
  for (const key in authRes.headers) {
    lowerHeaders[key.toLowerCase()] = authRes.headers[key];
  }

  const authorization_token = lowerHeaders['authorization'];

  check(authRes, {
    'authorization 200': (r) => r.status === 200,
    'authorization token found': () => authorization_token !== undefined,
  });

  if (!authorization_token) {
    console.error('❌ Authorization token not found.');
    return;
  }

  // === 2. VERIFY ===
  headers['Authorization'] = authorization_token;

  const verifyPayload = JSON.stringify({
    username: 'katalon_kris',
    password: 'Nexsoft!123'
  });

  const verifyRes = http.post('https://staging-chief.nexcloud.id/v1/nexchief/session/login/verify', verifyPayload, { headers });

  console.log(`\n[VERIFY] Status: ${verifyRes.status}`);
  console.log('[VERIFY] Body:', verifyRes.body);

  let verifyBody = {};
  try {
    verifyBody = verifyRes.json();
  } catch (e) {
    console.error('❌ Failed to parse verify response JSON');
  }

  const authentication_code = verifyBody?.nexsoft?.payload?.data?.content?.authentication_code;

  check(verifyRes, {
    'verify 200': (r) => r.status === 200,
    'authentication_code exists': () => authentication_code !== undefined
  });

  if (!authentication_code) {
    console.error('❌ Authentication code not found. Skipping token exchange...');
    return;
  }

  // === 3. TOKEN ===
const tokenPayload = JSON.stringify({
  authorization_code: authentication_code,
  code_verifier: '12341512134141213131'
});

// FIXED Headers untuk authorized client
const tokenHeaders = {
  'Content-Type': 'application/json',
  'Cookie': 'X-Qlik-Session-JWT=a8c1522b-a6e4-4056-9a7c-7d5a92736c18', // GANTI dengan yang kamu lihat real dari browser
  'nex-menu': 'undefined',
  'origin': 'https://staging-chief.nexcloud.id'
};


console.log('[TOKEN] Sending headers:', JSON.stringify(tokenHeaders));
console.log('[TOKEN] Sending payload:', tokenPayload);

const tokenRes = http.post(
  'https://staging-chief.nexcloud.id/v1/nexchief/session/login/token',
  tokenPayload,
  { headers: tokenHeaders }
);

  console.log(`\n[TOKEN] Status: ${tokenRes.status}`);
  console.log('[TOKEN] Body:', tokenRes.body);

  let tokenBody = {};
  try {
    tokenBody = tokenRes.json();
  } catch (e) {
    console.error('❌ Failed to parse token response JSON');
  }

  const finalToken = tokenBody?.nexsoft?.payload?.data?.content?.token;

  check(tokenRes, {
    'token success': (r) => r.status === 200,
    'token extracted': () => finalToken !== undefined
  });

  if (!finalToken) {
    console.error('❌ Final token not found. Skipping secured endpoint access...');
    return;
  }

  // === 4. ACCESS ENDPOINT WITH FINAL TOKEN ===
  const securedHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${finalToken}`
  };

  const dataRes = http.post('https://staging-chief.nexcloud.id/v1/nexchief/users/verify', JSON.stringify({
    nexchief_account_id: 4
  }), { headers: securedHeaders });

  console.log(`\n[DATA ACCESS] Status: ${dataRes.status}`);
  console.log('[DATA ACCESS] Body:', dataRes.body);

  check(dataRes, {
    'data endpoint OK': (r) => r.status === 200
  });

  sleep(1);
}
