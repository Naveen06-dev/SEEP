import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import examRoutes from './routes/exams.js';
import codingRoutes from './routes/coding.js';
import attemptRoutes from './routes/attempts.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/exams', examRoutes);
  app.use('/api/coding', codingRoutes);
  app.use('/api/attempts', attemptRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export function createSocketServer(app) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || '*' }
  });

  io.on('connection', (socket) => {
    socket.on('join-attempt', (attemptId) => {
      socket.join(`attempt:${attemptId}`);
    });

    socket.on('coding-autosave', async (payload) => {
      try {
        const { attemptId, codingQuestionId, language, sourceCode, cursorPosition } = payload;
        await prisma.codingAutosave.upsert({
          where: {
            attemptId_codingQuestionId: { attemptId, codingQuestionId }
          },
          create: { attemptId, codingQuestionId, language, sourceCode, cursorPosition },
          update: { language, sourceCode, cursorPosition, savedAt: new Date() }
        });
        socket.to(`attempt:${attemptId}`).emit('autosave-ack', { codingQuestionId, savedAt: new Date() });
      } catch (e) {
        socket.emit('autosave-error', { message: e.message });
      }
    });
  });

  return { httpServer, io };
}
