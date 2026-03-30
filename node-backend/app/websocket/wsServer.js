const WebSocket = require('ws');

let wss;
const clients = new Map(); // userId -> Set of ws connections

function initWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req) => {
        // Expect client to send {"type": "auth", "userId": "..."} as first message
        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg);
                if (data.type === 'auth' && data.userId) {
                    if (!clients.has(data.userId)) {
                        clients.set(data.userId, new Set());
                    }
                    clients.get(data.userId).add(ws);
                    ws.userId = data.userId;
                    ws.send(JSON.stringify({ type: 'auth_ok' }));
                }
            } catch (e) {}
        });

        ws.on('close', () => {
            if (ws.userId && clients.has(ws.userId)) {
                clients.get(ws.userId).delete(ws);
            }
        });
    });
}

function notifyUser(userId, payload) {
    const userClients = clients.get(String(userId));
    if (!userClients) return;
    const msg = JSON.stringify(payload);
    for (const ws of userClients) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        }
    }
}

module.exports = { initWebSocket, notifyUser };
