import http from 'k6/http';
import { sleep } from 'k6';

export function setup() {
  const payload = JSON.stringify({ 
    email: 'contacto.naturamed@gmail.com', 
    password: 'Demo1234!', 
    clinicaSlug: 'nutrimacho-ao' 
  });
  
  const res = http.post(`${__ENV.BASE_URL}/api/auth/login`, payload, { 
    headers: { 'Content-Type': 'application/json' } 
  });
  
  return { token: res.json('data.accessToken') };
}

export default function ({ token }) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const res = http.get(`${__ENV.BASE_URL}/api/medicos`, { headers });
  console.log(`List Medicos Status: ${res.status}`);
  console.log(`List Medicos Body: ${res.body}`);
}
