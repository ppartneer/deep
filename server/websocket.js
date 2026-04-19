const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { db } = require('./database');
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'deep-ocean-secret-key-321';

const clients = new Map(); // userId -> WebSocket connection

const sendPushToOfflineUser = (userId, payload) => {
  db.all("SELECT * FROM subscriptions WHERE userId = ?", [userId], (err, subs) => {
    if (err || !subs || subs.length === 0) return;
    
    subs.forEach(s => {
      const pushSubscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth }
      };
      
      const payloadString = JSON.stringify({ title: 'Новое сообщение на глубине', body: '🔒 Новое зашифрованное сообщение' });
      webpush.sendNotification(pushSubscription, payloadString).catch(e => {
        if (e.statusCode === 410 || e.statusCode === 404) {
          db.run("DELETE FROM subscriptions WHERE id = ?", [s.id]);
        }
      });
    });
  });
};

const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    let userId = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.stringify(message.toString()) === '"{}"' ? {} : JSON.parse(message);
        
        // Handle auth
        if (data.type === 'auth') {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            userId = decoded.id;
            clients.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth_success' }));
            
            // Send pending offline messages
            db.all("SELECT * FROM messages WHERE recipientId = ?", [userId], (err, msgs) => {
              if (!err && msgs) {
                msgs.forEach(m => {
                  ws.send(JSON.stringify({
                    type: 'message',
                    id: m.id,
                    senderId: m.senderId,
                    encryptedPayload: m.encryptedPayload,
                    iv: m.iv,
                    timestamp: m.timestamp
                  }));
                  // We delete or mark them as delivered. Let's delete to keep the relay clean.
                  db.run("DELETE FROM messages WHERE id = ?", [m.id]);
                });
              }
            });

          } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Неверный токен' }));
            ws.close();
          }
          return;
        }

        if (!userId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Неавторизован' }));
          ws.close();
          return;
        }

        // Handle sending messages (relay)
        if (data.type === 'message') {
          const { recipientId, encryptedPayload, iv } = data;
          const msgId = uuidv4();
          const timestamp = new Date().toISOString();

          // Check if recipient is online
          const recipientWs = clients.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'message',
              id: msgId,
              senderId: userId,
              encryptedPayload,
              iv,
              timestamp
            }));
          } else {
            // Save to DB and push notification
            db.run(
              "INSERT INTO messages (id, senderId, recipientId, encryptedPayload, iv, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
              [msgId, userId, recipientId, encryptedPayload, iv, timestamp],
              (err) => {
                if (!err) sendPushToOfflineUser(recipientId, encryptedPayload);
              }
            );
          }
          
          // Ack back to sender
          ws.send(JSON.stringify({ type: 'ack', id: msgId }));
        }

      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
      }
    });
  });
};

module.exports = { initWebSocket };
