import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { getRedisClient, getRedisSubClient } from '../config/redis.js';
import { getJwtKeys } from '../config/keys.js';
import { ENV } from '../config/env.js';

let io: SocketIOServer;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ENV.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  // Attach Redis adapter if not mock
  if (!ENV.USE_MOCK_REDIS) {
    try {
      const pubClient = getRedisClient();
      const subClient = getRedisSubClient();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.IO] Redis adapter connected');
    } catch (err) {
      console.warn('[Socket.IO] Using in-memory adapter fallback:', err);
    }
  }

  // Authentication Middleware for WebSocket handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required for socket connection'));
    }

    try {
      const { publicKey } = getJwtKeys();
      const payload = jwt.verify(token as string, publicKey, { algorithms: ['RS256'] }) as {
        sub: string;
        role: string;
      };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.sub;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join channel room
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  return io;
}

export function broadcastChatMessage(channelId: string, message: any) {
  if (io) {
    io.to(`channel:${channelId}`).emit('chat:message_received', message);
  }
}
