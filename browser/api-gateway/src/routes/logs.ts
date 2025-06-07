import { Router } from 'express';

const router = Router();

// Note: Logs are now handled directly by spawned agent instances
// The UI connects directly to the agent's SSE endpoint
// This route is kept for potential future admin/monitoring purposes

export default router; 