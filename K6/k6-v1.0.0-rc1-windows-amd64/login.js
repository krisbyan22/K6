import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50,                // jumlah virtual users
  duration: '30s',        // durasi total test
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% request < 1000ms
    checks: ['rate>0.95'],             // 95% test harus sukses
  },
};

export default function () {
  const url = 'https://staging-chief.nexcloud.id/v1/nexchief/session/login/verify';

  const payload = JSON.stringify({
    username: 'katalon_kris',
    password: 'Nexsoft!123'
  });

  const headers = {
    'Content-Type': 'application/json',
  };

  let res = http.post(url, payload, { headers });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'response is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
    'response length > 0': (r) => r.body.length > 0,
  });

  sleep(1); // delay antar request
}
