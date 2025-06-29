import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface IdentityStatus {
  steamLinked: boolean;
  discordLinked: boolean;
  loading: boolean;
}

interface IdentityContextType {
  identityStatus: IdentityStatus;
  refreshIdentityStatus: () => Promise<void>;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
};

interface IdentityProviderProps {
  children: ReactNode;
}

export const IdentityProvider: React.FC<IdentityProviderProps> = ({ children }) => {
  const { getToken, isAuthenticated } = useAuth();
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>({
    steamLinked: false,
    discordLinked: false,
    loading: true
  });

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const refreshIdentityStatus = async () => {
    if (!isAuthenticated) {
      setIdentityStatus({ steamLinked: false, discordLinked: false, loading: false });
      return;
    }

    try {
      setIdentityStatus(prev => ({ ...prev, loading: true }));
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/identities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIdentityStatus({
          steamLinked: !!data.identities.steam,
          discordLinked: !!data.identities.discord,
          loading: false
        });
      } else {
        setIdentityStatus({ steamLinked: false, discordLinked: false, loading: false });
      }
    } catch (error) {
      console.error('Error fetching identity status:', error);
      setIdentityStatus({ steamLinked: false, discordLinked: false, loading: false });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshIdentityStatus();
    } else {
      setIdentityStatus({ steamLinked: false, discordLinked: false, loading: false });
    }
  }, [isAuthenticated]);

  return (
    <IdentityContext.Provider value={{ identityStatus, refreshIdentityStatus }}>
      {children}
    </IdentityContext.Provider>
  );
};