/**
 * Minimal Telegram Login + WebSocket Chat Server
 * Run: npm install && node server.js
 */
require('dotenv').config();
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN || '8410081893:AAHyOorGwPUQ-ime_NXT_5Ef-2kL410LMZI';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://angy-frog.site/index.html';

function checkTelegramAuth(data) {
  const { hash, ...fields } = data;
  const sorted = Object.keys(fields).sort().map(k => `${k}=${fields[k]}`).join('\n');
  const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secret).update(sorted).digest('hex');
  return hmac === hash;
}

// Telegram Login Widget callback
app.get('/auth/telegram', (req, res) => {
  const q = { ...req.query };
  if (!q.hash) return res.status(400).send('Missing hash');
  if (!checkTelegramAuth(q)) return res.status(401).send('Invalid signature');

  const redirect = new URL(FRONTEND_URL);
  redirect.searchParams.set('tg_id', q.id);
  redirect.searchParams.set('tg_first_name', encodeURIComponent(q.first_name || 'User'));
  if (q.username) redirect.searchParams.set('tg_username', q.username);
  if (q.photo_url) redirect.searchParams.set('tg_photo_url', q.photo_url);
  res.redirect(redirect.toString());
});

const server = http.createServer(app);

// WebSocket broadcast chat
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
  ws.on('message', (msg) => {
    let data = null;
    try { data = JSON.parse(msg.toString()); } catch {}
    if (data && data.type === 'chat') {
      const payload = { type: 'chat', payload: data.payload };
      wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(JSON.stringify(payload));
      });
    }
  });
  ws.send(JSON.stringify({ type: 'chat', payload: { text: '欢迎来到 🔶 社区！', name: '系统' } }));
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
