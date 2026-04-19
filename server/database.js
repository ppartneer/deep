const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// На Railway файловая система постоянна между деплоями.
// На Render нужен примонтированный диск (/data).
// DB_PATH можно задать через env-переменную, по умолчанию — папка сервера.
const dbDir = process.env.DB_PATH || __dirname;
const dbPath = path.resolve(dbDir, 'deep.sqlite');

const db = new sqlite3.Database(dbPath);

const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Table: users
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          publicKey TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table: messages
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          senderId TEXT NOT NULL,
          recipientId TEXT NOT NULL,
          encryptedPayload TEXT NOT NULL,
          iv TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(senderId) REFERENCES users(id),
          FOREIGN KEY(recipientId) REFERENCES users(id)
        )
      `);

      // Push notification subscriptions
      db.run(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          FOREIGN KEY(userId) REFERENCES users(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const setupAdmin = async (adminCode) => {
  if (!adminCode) return;
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE role = 'admin'", [], (err, row) => {
      if (err) return reject(err);
      if (!row) {
        db.run(
          "INSERT INTO users (id, code, name, role) VALUES (?, ?, ?, ?)",
          ['admin-id', adminCode, 'Admin', 'admin'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      } else resolve();
    });
  });
};

module.exports = {
  db,
  initDB,
  setupAdmin
};
