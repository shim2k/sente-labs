import React, { createContext, useContext, useState, useEffect } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string>;
  tokens: number;
  refreshTokens: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  getToken: async () => '',
  tokens: 5,
  refreshTokens: () => {}
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

  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting token:', error);
      return '';
    }
  };

  const fetchTokens = async () => {
    if (!isAuthenticated) return;
    
    try {
      const token = await getToken();
      console.log('Fetching tokens from API...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/tokens`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token data received:', data);
        setTokens(data.tokens);
      } else {
        console.error('Failed to fetch tokens:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const refreshTokens = () => {
    fetchTokens();
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchTokens();
    }
  }, [isAuthenticated, isLoading]);

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
        refreshTokens
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
        audience: process.env.REACT_APP_AUTH0_AUDIENCE
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <AuthProvider>{children}</AuthProvider>
    </Auth0Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 