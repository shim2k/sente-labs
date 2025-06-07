import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Session
  sessionId: process.env.SESSION_ID || '',
  userId: process.env.USER_ID || '',
  
  // LLM
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o',
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
  maxLlmTokens: parseInt(process.env.MAX_LLM_TOKENS || '2000', 10),
  
  // Browser
  headless: process.env.HEADLESS !== 'false',
  viewportWidth: parseInt(process.env.VIEWPORT_WIDTH || '1280', 10),
  viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT || '720', 10),
  
  // Streaming configuration
  enableCdpStreaming: process.env.ENABLE_CDP_STREAMING === 'true', // Disabled by default due to high CPU usage
  cdpFrameRate: parseInt(process.env.CDP_FRAME_RATE || '30', 10), // Target FPS for CDP streaming (15-60)
  cdpQuality: parseInt(process.env.CDP_QUALITY || '80', 10), // JPEG quality for CDP frames (1-100)
  cdpMaxWidth: parseInt(process.env.CDP_MAX_WIDTH || '1280', 10), // Max frame width for CDP
  cdpMaxHeight: parseInt(process.env.CDP_MAX_HEIGHT || '720', 10), // Max frame height for CDP
  
  // WebSocket
  wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
  // High-FPS streaming configuration
  // For CDP mode: Frames delivered in real-time (typically 30-60 FPS)
  // For fallback mode: Screenshot interval in milliseconds
  // Default: 50ms (20 FPS) - smooth experience with good performance
  // High performance: 16ms (60 FPS) - very smooth, higher CPU usage
  screenshotInterval: parseInt(process.env.SCREENSHOT_INTERVAL || '50', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Calculate appropriate token budget for DOM extraction based on model context size
export function calculateDOMTokenBudget(model: string = config.llmModel, replyReserve: number = 1000): number {
  // Model context limits (approximate)
  const modelContextLimits: Record<string, number> = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    'claude-3-5-sonnet': 200000,
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000
  };
  
  // Get context limit for the current model
  const contextLimit = modelContextLimits[model] || 8192; // Conservative fallback
  
  // PERFORMANCE OPTIMIZATION: Use much smaller DOM budget for faster responses
  // The minimization strategy is very efficient, so we don't need 126k tokens
  const maxDOMTokens = Math.min(8000, contextLimit * 0.4); // Cap at 8k tokens, max 40% of context
  
  // Reserve tokens for: system prompt (~800), user prompt overhead (~200), reply (~1000)
  const systemOverhead = 800 + 200 + replyReserve;
  
  // Calculate available tokens for DOM content
  const domBudget = Math.max(3000, Math.min(maxDOMTokens, contextLimit - systemOverhead));
  
  return domBudget;
} 