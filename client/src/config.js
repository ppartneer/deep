// Конфигурация API URL
// В production эти переменные берутся из process.env.VITE_API_URL
// В development по умолчанию используется localhost:3000

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const API_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

// WebSocket: автоматически определяем протокол (ws/wss) и хост
export const WS_URL = (() => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  // Если крутимся в браузере — берём текущий хост и меняем протокол
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
})();
