import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import WebSocket from 'ws';
import { WebSocketHandlers } from './websocket/handlers';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = express();
app.use(cors());
app.use(express.json());

// Health endpoint to let the API-Gateway know we are alive
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = createServer(app);
const wss = new WebSocket.Server({ server });
const wsHandlers = new WebSocketHandlers();

wss.on('connection', (ws) => wsHandlers.handleConnection(ws));

server.listen(PORT, () => {
  console.log(`[AGENT] Skeleton server listening on port ${PORT}`);
}); 