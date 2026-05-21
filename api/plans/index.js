import { randomUUID } from 'crypto';
import { savePlan } from '../../lib/plan-store.js';

const MAX_PAYLOAD_BYTES = 500 * 1024;

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (JSON.stringify(body).length > MAX_PAYLOAD_BYTES) {
    return json(413, { error: 'Payload too large' });
  }

  if (!body?.inputs?.productName || !body?.inputs?.nicho) {
    return json(400, { error: 'Missing required plan fields' });
  }

  const id = randomUUID();
  const shareBase = process.env.SHARE_BASE_URL || new URL(request.url).origin;
  const plan = {
    ...body,
    id,
    version: 1,
    createdAt: new Date().toISOString()
  };

  try {
    await savePlan(id, plan);
  } catch (err) {
    console.error('savePlan failed:', err);
    return json(500, { error: 'Failed to save plan' });
  }

  return json(201, {
    id,
    url: `${shareBase.replace(/\/$/, '')}/p/${id}`
  });
}
