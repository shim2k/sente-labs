interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

interface ApiClientOptions {
  getToken: () => Promise<string>;
  onAuthError?: () => void;
}

export class ApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string>;
  private onAuthError?: () => void;

  constructor(baseUrl: string, options: ApiClientOptions) {
    this.baseUrl = baseUrl;
    this.getToken = options.getToken;
    this.onAuthError = options.onAuthError;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const maxRetries = 1;
    
    try {
      let token: string;
      try {
        token = await this.getToken();
      } catch (error: any) {
        console.error('Error getting token in ApiClient:', error);
        // If it's a refresh token error, return early to prevent blocking
        if (error.message && error.message.includes('Missing Refresh Token')) {
          console.log('Refresh token error detected, skipping request');
          return {
            status: 401,
            data: undefined,
            error: 'Authentication required. Please log in again.'
          };
        }
        throw error;
      }
      
      if (!token) {
        console.error('No token available');
        // Don't immediately trigger auth error - let the app handle it
        return { status: 401, error: 'Authentication required' };
      }
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      // Handle 401 errors with retry logic
      if (response.status === 401 && retryCount < maxRetries) {
        console.log('Token expired, retrying with fresh token...');
        
        // Force Auth0 to get a fresh token
        try {
          await this.getToken();
          return this.makeRequest<T>(endpoint, options, retryCount + 1);
        } catch (tokenError) {
          console.error('Failed to refresh token:', tokenError);
          this.onAuthError?.();
          return { status: 401, error: 'Authentication failed' };
        }
      }

      // Handle other auth errors
      if (response.status === 401 || response.status === 403) {
        // Only trigger auth error callback for persistent auth failures
        // Don't trigger it immediately to prevent loops
        console.warn(`Auth error ${response.status} - endpoint: ${endpoint}`);
        return { 
          status: response.status, 
          error: response.status === 401 ? 'Authentication required' : 'Access denied' 
        };
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      return {
        status: response.status,
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : (data as any)?.error || 'Request failed'
      };

    } catch (error) {
      console.error('API request failed:', error);
      return {
        status: 0,
        error: 'Network error'
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}