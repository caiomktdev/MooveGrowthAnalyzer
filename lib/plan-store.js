import { head, put } from '@vercel/blob';

const TTL_DAYS = parseInt(process.env.PLAN_TTL_DAYS || '90', 10);
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

const memoryStore = globalThis.__moovePlanStore || (globalThis.__moovePlanStore = new Map());

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function planPath(id) {
  return `plans/${id}.json`;
}

export async function savePlan(id, data) {
  if (hasBlob()) {
    await put(planPath(id), JSON.stringify(data), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      cacheControlMaxAge: TTL_SECONDS
    });
    return;
  }

  memoryStore.set(id, {
    data,
    expiresAt: Date.now() + TTL_SECONDS * 1000
  });
}

export async function getPlan(id) {
  if (hasBlob()) {
    try {
      const meta = await head(planPath(id));
      const res = await fetch(meta.url);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  const entry = memoryStore.get(id);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryStore.delete(id);
    return null;
  }
  return entry.data;
}
