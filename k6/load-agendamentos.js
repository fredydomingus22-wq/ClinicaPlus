import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend } from 'k6/metrics';

const slotLatency = new Trend('slot_latency_ms');

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '2m',  target: 50  },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration:   ['p(95)<500'],
    http_req_failed:     ['rate<0.01'],
    slot_latency_ms:     ['p(95)<300'],
  },
};

export function setup() {
  const payload = JSON.stringify({ 
    email: 'contacto.naturamed@gmail.com', 
    password: 'Demo1234!', 
    clinicaSlug: 'nutrimacho-ao' 
  });
  
  const res = http.post(`${__ENV.BASE_URL}/api/auth/login`, payload, { 
    headers: { 'Content-Type': 'application/json' } 
  });
  
  console.log(`Login status: ${res.status}`);
  
  // Extract token from response
  let token = null;
  try {
    const body = res.json();
    token = body.data.accessToken;
    console.log(`Token obtained: ${token ? 'YES' : 'NO'}`);
  } catch (e) {
    console.error(`Failed to parse setup response: ${res.body}`);
  }
  
  return { token };
}

export default function ({ token }) {
  if (!token) {
    return;
  }
  
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const t0   = Date.now();
  // Using the Medico ID found in the database for the nutrimacho-ao clinic
  const res  = http.get(`${__ENV.BASE_URL}/api/medicos/cmmov2qes000h13q274a8t9fd/slots?data=2026-03-20`, { headers });
  slotLatency.add(Date.now() - t0);

  check(res, { 'slots 200': r => r.status === 200 });
  sleep(Math.random() * 2 + 1);
}
