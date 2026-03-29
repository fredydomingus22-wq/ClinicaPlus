import axios from 'axios';

async function test() {
  try {
    const client = axios.create({ baseURL: 'http://localhost:3001/api' });

    // 1. Get stats
    console.log('Testing /superadmin/stats ...');
    try {
      const statsRes = await client.get('/superadmin/stats', { headers: { Authorization: 'fake' } });
      console.log('Stats Response:', statsRes.status);
    } catch(err: any) {
      console.error('Stats Error:', err.response?.status, err.response?.data);
    }

    // 2. Fetch directly from prisma to check counts
  } catch (err) {
    console.error(err);
  }
}

test();
