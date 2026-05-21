import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { savePlan, getPlan } from './lib/plan-store.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json'
};

async function serveStatic(pathname) {
  let filePath = join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    return { status: 200, body, type: MIME[extname(filePath)] || 'application/octet-stream' };
  } catch {
    return null;
  }
}

function json(status, data) {
  return {
    status,
    body: JSON.stringify(data),
    type: 'application/json'
  };
}

async function handleApi(req, url) {
  if (req.method === 'OPTIONS') {
    return { status: 204, body: '', type: 'text/plain' };
  }

  if (url.pathname === '/api/plans' && req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }
    if (!body?.inputs?.productName || !body?.inputs?.nicho) {
      return json(400, { error: 'Missing required plan fields' });
    }
    const id = randomUUID();
    const shareBase = process.env.SHARE_BASE_URL || `http://localhost:${PORT}`;
    const plan = { ...body, id, version: 1, createdAt: new Date().toISOString() };
    await savePlan(id, plan);
    return json(201, { id, url: `${shareBase.replace(/\/$/, '')}/p/${id}` });
  }

  const match = url.pathname.match(/^\/api\/plans\/([^/]+)$/);
  if (match && req.method === 'GET') {
    const plan = await getPlan(match[1]);
    if (!plan) return json(404, { error: 'Plan not found or expired' });
    return json(200, plan);
  }

  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  let result = await handleApi(req, url);
  if (!result) {
    let pathname = url.pathname;
    if (pathname.startsWith('/p/') && !pathname.endsWith('index.html')) {
      const id = pathname.split('/')[2];
      if (id) {
        url.searchParams.set('id', id);
        pathname = '/p/index.html';
      }
    }
    result = await serveStatic(pathname);
  }

  if (!result) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(result.status, { 'Content-Type': result.type });
  res.end(result.body);
});

server.listen(PORT, () => {
  console.log(`Moove Growth Analyzer → http://localhost:${PORT}`);
});
