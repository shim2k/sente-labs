interface RetryOptions {
  retries: number;
  timeout: number;
  baseDelay?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { retries, timeout, baseDelay = 1000 } = options;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const promise = fn();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );
      
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Retry logic failed unexpectedly');
} 