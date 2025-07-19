import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { ApiClient } from '../utils/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string>;
  tokens: number;
  refreshTokens: () => void;
  apiClient: ApiClient | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  getToken: async () => '',
  tokens: 3,
  refreshTokens: () => {},
  apiClient: null
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { 
    isAuthenticated, 
    user, 
    loginWithRedirect, 
    logout: auth0Logout,
    getAccessTokenSilently,
    isLoading 
  } = useAuth0();

  const [tokens, setTokens] = useState<number>(5);
  const [apiClient, setApiClient] = useState<ApiClient | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const getToken = async () => {
    try {
      const token = await getAccessTokenSilently();
      return token;
    } catch (error: any) {
      console.error('Error getting token:', error);
      
      // If it's a refresh token error, force re-authentication
      if (error.message && error.message.includes('Missing Refresh Token')) {
        console.log('Refresh token missing, clearing cache and prompting re-login...');
        // Clear Auth0 cache
        localStorage.removeItem(`@@auth0spajs@@::${process.env.REACT_APP_AUTH0_CLIENT_ID}::${process.env.REACT_APP_AUTH0_AUDIENCE}::openid profile email offline_access`);
        // Force re-authentication
        loginWithRedirect({
          authorizationParams: {
            prompt: 'login'
          }
        });
      }
      throw error;
    }
  };

  const fetchTokens = async () => {
    if (!isAuthenticated || !apiClient) return;
    
    try {
      console.log('Fetching tokens from API...');
      const response = await apiClient.get<{ tokens: number }>('/api/v1/tokens');
      
      if (response.data) {
        console.log('Token data received:', response.data);
        setTokens(response.data.tokens);
      } else {
        console.error('Failed to fetch tokens:', response.error);
        // Don't trigger auth error for token fetch failures
        // as this can cause infinite loops
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
      // Don't trigger auth error for token fetch failures
    }
  };

  const refreshTokens = () => {
    fetchTokens();
  };

  // Initialize API client
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const client = new ApiClient(
        process.env.REACT_APP_API_URL || '', 
        {
          getToken: async () => {
            try {
              const token = await getAccessTokenSilently();
              return token;
            } catch (error) {
              console.error('Error getting token in ApiClient:', error);
              throw error;
            }
          },
          onAuthError: () => {
            console.log('Authentication error detected');
            // Only redirect if we're not already in the process of authenticating
            if (!isLoading && !isRedirecting && isAuthenticated) {
              console.log('Redirecting to login due to auth error...');
              setIsRedirecting(true);
              loginWithRedirect();
            } else {
              console.log('Skipping redirect - already authenticating, redirecting, or not authenticated');
            }
          }
        }
      );
      setApiClient(client);
    }
  }, [isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect]);

  // Fetch tokens when API client is ready
  useEffect(() => {
    if (apiClient) {
      // Add a small delay to ensure authentication is fully settled
      const timer = setTimeout(() => {
        fetchTokens();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [apiClient]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading: isLoading,
        login: loginWithRedirect,
        logout: () => auth0Logout({ logoutParams: { returnTo: window.location.origin } }),
        getToken,
        tokens,
        refreshTokens,
        apiClient
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const Auth0Wrapper: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN || ''}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID || ''}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <AuthProvider>{children}</AuthProvider>
    </Auth0Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 