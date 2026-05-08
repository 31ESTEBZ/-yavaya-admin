import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_SOCKET_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('[socket] conectado al servidor'));
  socket.on('disconnect', () => console.log('[socket] desconectado'));
  socket.on('connect_error', (e) => console.warn('[socket] error:', e.message));

  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
