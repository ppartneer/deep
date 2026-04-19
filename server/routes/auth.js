const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const webpush = require('web-push');

const JWT_SECRET = process.env.JWT_SECRET || 'deep-ocean-secret-key-321';

// VAPID ключи для Web Push уведомлений.
// На production их нужно вынести в .env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY).
// Если ключей нет — генерируем одноразовые (уведомления не доживут до перезапуска).
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  const generated = webpush.generateVAPIDKeys();
  vapidPublicKey = generated.publicKey;
  vapidPrivateKey = generated.privateKey;
  // Выводим ключи в консоль, чтобы можно было скопировать в .env
  console.log('[VAPID] Ключи не заданы. Используются сгенерированные (временные):');
  console.log(`[VAPID] VAPID_PUBLIC_KEY=${vapidPublicKey}`);
  console.log(`[VAPID] VAPID_PRIVATE_KEY=${vapidPrivateKey}`);
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL || 'deep@example.com'}`,
  vapidPublicKey,
  vapidPrivateKey
);

router.post('/login', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Код доступа обязателен' });

  db.get("SELECT * FROM users WHERE code = ?", [code], (err, user) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    if (!user) return res.status(403).json({ error: 'Доступ запрещен. Шлюз закрыт.' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, publicKey: user.publicKey },
      vapidPublicKey: vapidPublicKey
    });
  });
});

router.post('/public-key', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Неавторизован' });
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { publicKey } = req.body;

    db.run("UPDATE users SET publicKey = ? WHERE id = ?", [publicKey, decoded.id], function(err) {
      if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
      res.json({ success: true });
    });
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

router.post('/wipe', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Неавторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.serialize(() => {
      // Remove messages
      db.run("DELETE FROM messages WHERE senderId = ? OR recipientId = ?", [decoded.id, decoded.id]);
      db.run("DELETE FROM subscriptions WHERE userId = ?", [decoded.id]);
      db.run("DELETE FROM users WHERE id = ?", [decoded.id], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка стирания данных' });
        res.json({ success: true, message: 'Следы уничтожены. Глубина поглотила всё.' });
      });
    });
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

router.post('/subscribe', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Неавторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const subscription = req.body;

    const id = Date.now().toString();
    db.run(
      "INSERT INTO subscriptions (id, userId, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)",
      [id, decoded.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth],
      function(err) {
        res.status(201).json({ success: true });
      }
    );
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

router.get('/contacts', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Неавторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    db.all("SELECT id, name, publicKey FROM users WHERE id != ? AND publicKey IS NOT NULL", [decoded.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      res.json(rows);
    });
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

module.exports = router;
