import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { jobRoutes } from './routes/jobs';
import { statusRoutes } from './routes/status';
import { webhookRoutes } from './routes/webhooks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://joepro.ai',
  'https://neuralsalvage.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`
════════════════════════════════════════════════════════════
🎬 JoePro Video Service
════════════════════════════════════════════════════════════
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
════════════════════════════════════════════════════════════
  `);
});

export default app;
