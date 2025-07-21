export const PADDLE_CONFIG = {
  // Client-side token for Paddle SDK (not vendor ID)
  token: process.env.REACT_APP_PADDLE_TOKEN || process.env.REACT_APP_PADDLE_VENDOR_ID || '',
  
  // Environment - use 'sandbox' for testing, 'production' for live
  environment: (process.env.REACT_APP_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  
  // Whether we're in development mode
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Paddle checkout configuration
  checkoutSettings: {
    displayMode: 'overlay' as const,
    theme: 'dark' as const,
    locale: 'en' as const,
  },
} as const;

// Product IDs for token packages (these will be set in Paddle dashboard)
export const PADDLE_PRODUCT_IDS = {
  small: process.env.REACT_APP_PADDLE_PRODUCT_SMALL || 'pro_01j...',  // 5 tokens - $2
  medium: process.env.REACT_APP_PADDLE_PRODUCT_MEDIUM || 'pro_01j...', // 20 tokens - $5  
  large: process.env.REACT_APP_PADDLE_PRODUCT_LARGE || 'pro_01j...',   // 45 tokens - $10
} as const;

// Validation function
export const validatePaddleConfig = (): boolean => {
  if (!PADDLE_CONFIG.token) {
    console.error('Paddle token is not configured');
    return false;
  }
  
  if (!PADDLE_PRODUCT_IDS.small || !PADDLE_PRODUCT_IDS.medium || !PADDLE_PRODUCT_IDS.large) {
    console.error('Paddle product IDs are not fully configured');
    return false;
  }
  
  return true;
};