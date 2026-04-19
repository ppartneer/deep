import { openDB } from 'idb';

const DB_NAME = 'deep_ocean_vault';
const DB_VERSION = 1;

export const initStorage = async () => {
  return await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys');
      }
      if (!db.objectStoreNames.contains('messages')) {
        const msgsStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgsStore.createIndex('by-chat', 'chatId');
      }
    },
  });
};

export const savePrivateKey = async (privateKey) => {
  const db = await initStorage();
  await db.put('keys', privateKey, 'privateKey');
};

export const getPrivateKey = async () => {
  const db = await initStorage();
  return await db.get('keys', 'privateKey');
};

export const saveMessage = async (msg) => {
  const db = await initStorage();
  // Ensure message has a unique id
  const p = { ...msg };
  p.chatId = p.isOutgoing ? p.recipientId : p.senderId;
  await db.put('messages', p);
};

export const getMessagesForChat = async (chatId) => {
  const db = await initStorage();
  return await db.getAllFromIndex('messages', 'by-chat', chatId);
};

export const wipeAllData = async () => {
  const db = await initStorage();
  await db.clear('keys');
  await db.clear('messages');
  // Clear local storage for jwt and settings
  localStorage.clear();
};
