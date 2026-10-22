// server/realtimeService.js - Real-Time Server-Sent Events (SSE) & Notification Dispatcher
const clients = new Set();

/**
 * Register a client SSE connection
 */
function handleSSEConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const client = {
    id: 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    role: req.query.role || 'GUEST',
    userId: req.query.userId || null,
    res
  };

  clients.add(client);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: client.id, timestamp: new Date().toISOString() })}\n\n`);

  // Heartbeat keep-alive every 20 seconds
  const pingInterval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(pingInterval);
      clients.delete(client);
    } else {
      res.write(': ping\n\n');
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(pingInterval);
    clients.delete(client);
  });
}

/**
 * Broadcast an order event to all connected clients
 */
function broadcastRealtimeEvent(event) {
  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  });

  for (const client of clients) {
    try {
      if (!client.res.writableEnded) {
        client.res.write(`data: ${payload}\n\n`);
      }
    } catch (_) {
      clients.delete(client);
    }
  }
}

function getConnectedClientsCount() {
  return clients.size;
}

module.exports = {
  handleSSEConnection,
  broadcastRealtimeEvent,
  getConnectedClientsCount
};
