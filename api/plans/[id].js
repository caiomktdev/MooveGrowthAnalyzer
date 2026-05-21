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

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function GET(request) {
  const url = new URL(request.url);
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
