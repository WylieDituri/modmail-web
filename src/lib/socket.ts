import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (url?: string): Socket => {
  if (socket) {
    return socket;
  }

  socket = io(url || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  socket.on('reconnect', () => {
    console.log('Reconnected to socket server');
  });

  socket.on('reconnect_error', (error) => {
    console.error('Reconnection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const socketService = {
  initializeSocket,
  getSocket,
  disconnectSocket,
};

export default socketService;
