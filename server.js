// Simple Node.js WebSocket server for Warzone 2044
// Run with: node server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let nextId = 1;

function broadcast(msg, exceptId = null) {
  for (const id in players) {
    if (id !== exceptId) players[id].ws.send(JSON.stringify(msg));
  }
}

wss.on('connection', function connection(ws) {
  const id = String(nextId++);
  players[id] = { ws, x: 400, y: 300, hp: 100, alive: true };
  ws.send(JSON.stringify({ type: 'init', id, players: Object.fromEntries(Object.entries(players).map(([pid, p]) => [pid, { x: p.x, y: p.y, hp: p.hp, alive: p.alive }])) }));
  broadcast({ type: 'join', id, x: 400, y: 300 }, id);

  ws.on('message', function incoming(message) {
    let msg;
    try { msg = JSON.parse(message); } catch { ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' })); return; }
    if (msg.type === 'move') {
      players[id].x = msg.x;
      players[id].y = msg.y;
      players[id].hp = msg.hp;
      players[id].alive = msg.alive;
      broadcast({ type: 'move', id, x: msg.x, y: msg.y, hp: msg.hp, alive: msg.alive }, id);
    }
    if (msg.type === 'shoot') {
      broadcast({ type: 'shoot', id, x: msg.x, y: msg.y, angle: msg.angle }, id);
    }
    if (msg.type === 'respawn') {
      players[id].x = msg.x;
      players[id].y = msg.y;
      players[id].hp = 100;
      players[id].alive = true;
      broadcast({ type: 'respawn', id, x: msg.x, y: msg.y }, id);
    }
  });

  ws.on('close', function() {
    delete players[id];
    // TODO: Remove player from any raid sector if implemented
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'A network error occurred.' }));
  });
});

console.log('WebSocket server running on ws://localhost:8080');
