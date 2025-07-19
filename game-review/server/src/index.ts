import dotenv from 'dotenv';
dotenv.config();

// Import logger first to override console methods
import './utils/logger';

import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { pool } from './db/connection';
import { apiLimiter } from './middleware/rateLimit';
import responseLogger from './middleware/responseLogger';
import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import reviewsRoutes from './routes/reviews';
import adminRoutes from './routes/admin';
import waitlistRoutes from './routes/waitlist';

// Debug environment variables
console.log('Environment variables loaded:');
console.log('AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN);
console.log('AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
console.log('SQS_QUEUE_URL:', process.env.SQS_QUEUE_URL);

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = express();

// Configure CORS to allow requests from both domains
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Local development
    'https://aoe4.senteai.com',  // Main app domain
    'https://senteai.com',  // Landing page domain
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Add response logging middleware before routes
app.use(responseLogger);

app.use('/api', apiLimiter);

// Health endpoint with DB connectivity check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const client = await pool().connect();
    await client.query('SELECT 1');
    client.release();
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

// Test endpoint for error logging
app.get('/test-error', (_req: Request, res: Response) => {
  res.status(400).json({ error: 'This is a test error for logging', code: 'TEST_ERROR' });
});

// API routes
app.use('/api/v1', authRoutes);
app.use('/api/v1', gamesRoutes);
app.use('/api/v1', reviewsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', waitlistRoutes);
// app.use('/api/v1/replays', replaysRoutes); // Removed - replay-parser service not available

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`[AOE4-REVIEW] Server listening on port ${PORT}`);
}); 