// Basic Node/Express + WebSocket server for the Voxel game
// Run with: npm install && npm start

const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const PORT = parseInt(process.argv[2], 10) || process.env.PORT || 3000;

const app = express();
// serve everything in the workspace root (static files, images, etc.)
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// simple state for connected clients
const clients = new Map(); // ws -> {id,name,team,x,y,z,yaw}
let nextId = 1;

function broadcast(payload, exceptWs) {
  const msg = JSON.stringify(payload);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN && ws !== exceptWs) {
      ws.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const state = { id, name: `Player${id}`, team: 'red', x: 0, y: 70, z: 0, yaw: 0 };
  clients.set(ws, state);

  // welcome packet + existing players
  ws.send(JSON.stringify({ type: 'welcome', id, players: Array.from(clients.values()) }));
  broadcast({ type: 'join', player: state }, ws);

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const st = clients.get(ws);
      if (!st) return;

      switch (msg.type) {
        case 'hello':
          st.name = msg.name || st.name;
          st.team = msg.team || st.team;
          broadcast({ type: 'join', player: st }, ws);
          break;
        case 'state':
          st.x = msg.x; st.y = msg.y; st.z = msg.z; st.yaw = msg.yaw;
          broadcast({ type: 'state', id: st.id, x: st.x, y: st.y, z: st.z, yaw: st.yaw }, ws);
          break;
        case 'blockChange':
          broadcast({
            type: 'blockChange',
            x: msg.x,
            y: msg.y,
            z: msg.z,
            blockType: msg.blockType
          }, ws);
          break;
        default:
          break;
      }
    } catch (e) {
      // ignore malformed
    }
  });

  ws.on('close', () => {
    const st = clients.get(ws);
    clients.delete(ws);
    if (st) broadcast({ type: 'leave', id: st.id });
  });
});

server.listen(PORT, () => {
  console.log(`HTTP + WebSocket server listening on port ${PORT}`);
});
