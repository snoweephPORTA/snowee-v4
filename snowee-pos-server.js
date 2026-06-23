/**
 * snowee-pos-server.js
 * Snowee V4 - Local WebSocket Server
 * Runs on Infinix Smart 20 (192.168.1.100) via Capacitor
 * Port: 8765
 */

const WebSocket = require('ws');

const PORT = 8765;
const wss = new WebSocket.Server({ port: PORT, host: '0.0.0.0' });

let clients = new Set();

console.log(`[Snowee V4] WebSocket server started on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[+] Client connected: ${ip}`);
  clients.add(ws);

  // Send welcome/ping so client knows server is alive
  ws.send(JSON.stringify({ type: 'server_hello', message: 'Snowee V4 server ready', ts: Date.now() }));

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      console.warn('[!] Invalid JSON from client:', data);
      return;
    }

    console.log(`[MSG] type=${msg.type} from ${ip}`);

    // Broadcast to all OTHER connected clients (e.g. kitchen)
    for (const client of clients) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    }

    // ACK back to sender
    ws.send(JSON.stringify({ type: 'ack', ref: msg.type, ts: Date.now() }));
  });

  ws.on('close', () => {
    console.log(`[-] Client disconnected: ${ip}`);
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error(`[ERR] ${ip}:`, err.message);
    clients.delete(ws);
  });
});

wss.on('error', (err) => {
  console.error('[SERVER ERR]', err.message);
});

// Heartbeat - ping all clients every 30s to detect dead connections
setInterval(() => {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    } else {
      clients.delete(client);
    }
  }
}, 30000);
