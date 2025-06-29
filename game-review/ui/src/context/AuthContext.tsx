import React, { createContext, useContext } from 'react';
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: () => void;
  logout: () => void;
  getToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  getToken: async () => ''
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

  const getToken = async () => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting token:', error);
      return '';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading: isLoading,
        login: loginWithRedirect,
        logout: () => auth0Logout({ logoutParams: { returnTo: window.location.origin } }),
        getToken
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