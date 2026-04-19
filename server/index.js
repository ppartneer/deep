require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { initDB, setupAdmin } = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { initWebSocket } = require('./websocket');

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// Deep Ocean Vault — защита заголовков
app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'"],
    }
  } : false,  // В dev режиме CSP отключаем чтобы не мешал Vite
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));  // Лимит для зашифрованных блобов


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Optional: Serve statically
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await initDB();
    
    // Generate an admin code if none exists, and log it to console
    const adminCode = process.env.ADMIN_CODE || uuidv4();
    await setupAdmin(adminCode);
    console.log(`[SYSTEM] Запуск глубоководного реле.`);
    console.log(`[SYSTEM] Ваш админский код (сохраните его): ${adminCode}`);

    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`[SYSTEM] Слушаю на порту ${PORT}`);
    });
  } catch (error) {
    console.error(`[FATAL] Ошибка запуска:`, error);
    process.exit(1);
  }
};

startServer();
