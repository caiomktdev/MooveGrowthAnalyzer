import { getPlan } from '../../lib/plan-store.js';

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (req.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id || id === 'plans') {
    return json(400, { error: 'Missing plan id' });
  }

  const plan = await getPlan(id);
  if (!plan) {
    return json(404, { error: 'Plan not found or expired' });
  }

  return json(200, plan);
}
