const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'deep-ocean-secret-key-321';

// Middleware for admin check
const isAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Неавторизован' });
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
};

router.get('/users', isAdmin, (req, res) => {
  db.all("SELECT id, name, role, createdAt, (publicKey IS NOT NULL) as hasKey FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    res.json(rows);
  });
});

router.post('/add-code', isAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя обязательно' });

  const code = uuidv4();
  const id = uuidv4();
  
  db.run("INSERT INTO users (id, code, name, role) VALUES (?, ?, ?, 'user')", [id, code, name], function(err) {
    if (err) return res.status(500).json({ error: 'Ошибка создания кода' });
    res.json({ id, code, name });
  });
});

module.exports = router;
