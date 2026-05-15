import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startScheduler } from './services/schedulerService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8000);
const frontendDistPath = path.resolve(process.cwd(), 'frontend', 'dist');

function allowedOrigins() {
  return uniqueList([
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || '').split(','),
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]);
}

function uniqueList(values) {
  return values.map((value) => String(value || '').trim()).filter(Boolean);
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowList = allowedOrigins();
      const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

      callback(null, allowList.includes(origin) || isVercelPreview);
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'job-chance-hunter',
    time: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'Frontend build not found. Run npm run build:frontend, then restart the server.',
      api: '/api/health'
    });
  });
}

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDatabase();
  startScheduler();
  app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

export default app;
