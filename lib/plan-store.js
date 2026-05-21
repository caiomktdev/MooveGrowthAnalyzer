import { kv } from '@vercel/kv';

const TTL_DAYS = parseInt(process.env.PLAN_TTL_DAYS || '90', 10);
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

const memoryStore = globalThis.__moovePlanStore || (globalThis.__moovePlanStore = new Map());

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function savePlan(id, data) {
  if (hasKv()) {
    await kv.set(`plan:${id}`, data, { ex: TTL_SECONDS });
    return;
  }
  memoryStore.set(id, {
    data,
    expiresAt: Date.now() + TTL_SECONDS * 1000
  });
}

export async function getPlan(id) {
  if (hasKv()) {
    return kv.get(`plan:${id}`);
  }
  const entry = memoryStore.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryStore.delete(id);
    return null;
  }
  return entry.data;
}
