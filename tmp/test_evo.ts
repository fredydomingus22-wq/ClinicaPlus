import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const evo = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: { apikey: process.env.EVOLUTION_API_KEY },
});

async function test() {
  try {
    console.log('Fetching instances...');
    const result = await evo.get('/instance/fetchInstances');
    console.log(JSON.stringify(result.data, null, 2));
  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
  }
}

test();
