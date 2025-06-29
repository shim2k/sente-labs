import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useIdentity } from '../context/IdentityContext';

interface LinkAccountResponse {
  success: boolean;
  error?: string;
  code?: string;
}

interface UserIdentities {
  steam?: {
    steamId: string;
    aoe4world_profile_id: string;
    aoe4world_username: string;
  } | null;
  discord?: {
    discordId: string;
    username: string;
  } | null;
}

interface IdentitiesResponse {
  identities: UserIdentities;
}

const Settings: React.FC = () => {
  const { getToken } = useAuth();
  const { refreshIdentityStatus } = useIdentity();
  const [steamId, setSteamId] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [isLinkingSteam, setIsLinkingSteam] = useState(false);
  const [isLinkingDiscord, setIsLinkingDiscord] = useState(false);
  const [steamLinked, setSteamLinked] = useState(false);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(true);
  const [existingIdentities, setExistingIdentities] = useState<UserIdentities>({});

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const fetchIdentities = async () => {
    try {
      setIsLoadingIdentities(true);
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/identities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: IdentitiesResponse = await response.json();
        setExistingIdentities(data.identities);
        
        // Update state based on existing identities
        if (data.identities.steam) {
          setSteamLinked(true);
          setSteamId(data.identities.steam.steamId);
        }
        
        if (data.identities.discord) {
          setDiscordLinked(true);
          setDiscordId(data.identities.discord.discordId);
          setDiscordUsername(data.identities.discord.username);
        }
      } else {
        console.error('Failed to fetch identities');
      }
    } catch (error) {
      console.error('Error fetching identities:', error);
    } finally {
      setIsLoadingIdentities(false);
    }
  };

  useEffect(() => {
    fetchIdentities();
  }, []);

  const linkSteamAccount = async () => {
    if (!steamId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Steam ID' });
      return;
    }

    setIsLinkingSteam(true);
    setMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/link/steam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ steamId: steamId.trim() })
      });

      const data: LinkAccountResponse = await response.json();

      if (response.ok && data.success) {
        setSteamLinked(true);
        setMessage({ type: 'success', text: 'Steam account linked successfully!' });
        setSteamId('');
        // Refresh identity status in sidebar
        refreshIdentityStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to link Steam account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLinkingSteam(false);
    }
  };

  const linkDiscordAccount = async () => {
    if (!discordId.trim() || !discordUsername.trim()) {
      setMessage({ type: 'error', text: 'Please enter both Discord ID and username' });
      return;
    }

    setIsLinkingDiscord(true);
    setMessage(null);

    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/link/discord`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          discordId: discordId.trim(),
          username: discordUsername.trim()
        })
      });

      const data: LinkAccountResponse = await response.json();

      if (response.ok && data.success) {
        setDiscordLinked(true);
        setMessage({ type: 'success', text: 'Discord account linked successfully!' });
        setDiscordId('');
        setDiscordUsername('');
        // Refresh identity status in sidebar
        refreshIdentityStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to link Discord account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLinkingDiscord(false);
    }
  };

  if (isLoadingIdentities) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading account settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Settings</h1>
        <p className="text-gray-400">Link your gaming accounts to enable match analysis</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-600/50 text-green-300'
            : 'bg-red-900/20 border-red-600/50 text-red-300'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Steam Account Section */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2.34-.21 3.41-.6.3-.11.49-.4.49-.72v-3.38c0-.32-.19-.61-.49-.72C14.34 16.21 13.19 16 12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4c0 .85-.27 1.63-.72 2.28-.14.2-.35.32-.58.32-.23 0-.44-.12-.58-.32C14.27 13.63 14 12.85 14 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2c.55 0 1.05-.22 1.41-.59.36.37.87.59 1.41.59 1.1 0 2-.9 2-2 0-3.31-2.69-6-6-6s-6 2.69-6 6 2.69 6 6 6v4c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Steam Account</h2>
              <p className="text-sm text-gray-400">Required for fetching AOE4 match data</p>
            </div>
          </div>

          {steamLinked ? (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-300 font-medium">Steam account linked</span>
                </div>
                <button
                  onClick={() => {
                    setSteamLinked(false);
                    setSteamId('');
                    setExistingIdentities(prev => ({ ...prev, steam: null }));
                    refreshIdentityStatus();
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Unlink
                </button>
              </div>
              {existingIdentities.steam && (
                <div className="mt-3 pt-3 border-t border-green-600/20">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-green-200">Steam ID:</span>
                      <span className="text-green-100 ml-2 font-mono">{existingIdentities.steam.steamId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="steamId" className="block text-sm font-medium text-gray-300 mb-2">
                  Steam ID
                </label>
                <input
                  type="text"
                  id="steamId"
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  placeholder="Enter your Steam ID"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Find your Steam ID in your Steam profile URL or use a Steam ID finder tool
                </p>
              </div>
              
              <button
                onClick={linkSteamAccount}
                disabled={isLinkingSteam || !steamId.trim()}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isLinkingSteam || !steamId.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                {isLinkingSteam ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Linking...</span>
                  </div>
                ) : (
                  'Link Steam Account'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Discord Account Section */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Discord Account</h2>
              <p className="text-sm text-gray-400">Optional - for review notifications</p>
            </div>
          </div>

          {discordLinked ? (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-300 font-medium">Discord account linked</span>
                </div>
                <button
                  onClick={() => {
                    setDiscordLinked(false);
                    setDiscordId('');
                    setDiscordUsername('');
                    setExistingIdentities(prev => ({ ...prev, discord: null }));
                    refreshIdentityStatus();
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Unlink
                </button>
              </div>
              {existingIdentities.discord && (
                <div className="mt-3 pt-3 border-t border-green-600/20">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <span className="text-green-200">Username:</span>
                      <span className="text-green-100 ml-2">{existingIdentities.discord.username}</span>
                    </div>
                    <div>
                      <span className="text-green-200">User ID:</span>
                      <span className="text-green-100 ml-2 font-mono">{existingIdentities.discord.discordId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="discordUsername" className="block text-sm font-medium text-gray-300 mb-2">
                  Discord Username
                </label>
                <input
                  type="text"
                  id="discordUsername"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="username#1234"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="discordId" className="block text-sm font-medium text-gray-300 mb-2">
                  Discord User ID
                </label>
                <input
                  type="text"
                  id="discordId"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                  placeholder="123456789012345678"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enable Developer Mode in Discord settings to copy your User ID
                </p>
              </div>
              
              <button
                onClick={linkDiscordAccount}
                disabled={isLinkingDiscord || !discordId.trim() || !discordUsername.trim()}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isLinkingDiscord || !discordId.trim() || !discordUsername.trim()
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
                }`}
              >
                {isLinkingDiscord ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Linking...</span>
                  </div>
                ) : (
                  'Link Discord Account'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className="mt-8 bg-gray-800/30 rounded-lg border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Account Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${steamLinked ? 'bg-green-400' : 'bg-gray-500'}`}></div>
            <span className="text-gray-300">Steam Account</span>
            <span className={`text-sm ${steamLinked ? 'text-green-400' : 'text-gray-500'}`}>
              {steamLinked ? 'Linked' : 'Not linked'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${discordLinked ? 'bg-green-400' : 'bg-gray-500'}`}></div>
            <span className="text-gray-300">Discord Account</span>
            <span className={`text-sm ${discordLinked ? 'text-green-400' : 'text-gray-500'}`}>
              {discordLinked ? 'Linked' : 'Not linked'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;