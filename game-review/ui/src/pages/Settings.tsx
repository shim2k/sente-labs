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
}

interface IdentitiesResponse {
  identities: UserIdentities;
  error?: string;
}

const Settings: React.FC = () => {
  const { apiClient } = useAuth();
  const { refreshIdentityStatus } = useIdentity();
  const [steamId, setSteamId] = useState('');
  const [isLinkingSteam, setIsLinkingSteam] = useState(false);
  const [steamLinked, setSteamLinked] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [isLinkingAOE4World, setIsLinkingAOE4World] = useState(false);
  const [linkingMethod, setLinkingMethod] = useState<'steam' | 'aoe4world'>('steam');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingIdentities, setIsLoadingIdentities] = useState(true);
  const [existingIdentities, setExistingIdentities] = useState<UserIdentities>({});

  const fetchIdentities = async () => {
    if (!apiClient) return;
    
    try {
      setIsLoadingIdentities(true);
      const response = await apiClient.get<IdentitiesResponse>('/api/v1/identities');

      if (response.data && response.data.identities) {
        setExistingIdentities(response.data.identities);
        
        // Update state based on existing identities
        if (response.data.identities.steam) {
          setSteamLinked(true);
          setSteamId(response.data.identities.steam.steamId);
        }
      } else {
        const errorMessage = response.data?.error || 'Failed to fetch identities';
        console.error('Failed to fetch identities:', errorMessage);
      }
    } catch (error) {
      console.error('Error fetching identities:', error);
    } finally {
      setIsLoadingIdentities(false);
    }
  };

  useEffect(() => {
    if (apiClient) {
      fetchIdentities();
    }
  }, [apiClient]); // Re-fetch when apiClient changes

  const linkSteamAccount = async () => {
    if (!steamId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Steam ID' });
      return;
    }

    if (!apiClient) {
      setMessage({ type: 'error', text: 'Authentication required' });
      return;
    }

    setIsLinkingSteam(true);
    setMessage(null);

    try {
      const response = await apiClient.post<LinkAccountResponse>('/api/v1/link/steam', {
        steamId: steamId.trim()
      });

      if (response.data && response.data.success) {
        setSteamLinked(true);
        setMessage({ type: 'success', text: 'Steam account linked successfully!' });
        setSteamId('');
        // Refresh identity status in sidebar
        refreshIdentityStatus();
        // Refresh identities to update UI
        fetchIdentities();
      } else {
        setMessage({ type: 'error', text: response.data?.error || 'Failed to link Steam account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLinkingSteam(false);
    }
  };

  const linkAOE4WorldAccount = async () => {
    if (!profileId.trim()) {
      setMessage({ type: 'error', text: 'Please enter an AOE4World profile ID' });
      return;
    }

    if (!apiClient) {
      setMessage({ type: 'error', text: 'Authentication required' });
      return;
    }

    setIsLinkingAOE4World(true);
    setMessage(null);

    try {
      const response = await apiClient.post<LinkAccountResponse>('/api/v1/link/aoe4world', {
        profileId: profileId.trim()
      });

      if (response.data && response.data.success) {
        setSteamLinked(true);
        setMessage({ type: 'success', text: 'AOE4World profile linked successfully!' });
        setProfileId('');
        // Refresh identity status in sidebar
        refreshIdentityStatus();
        // Refresh identities to update UI
        fetchIdentities();
      } else {
        setMessage({ type: 'error', text: response.data?.error || 'Failed to link AOE4World profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLinkingAOE4World(false);
    }
  };


  const unlinkSteamAccount = async () => {
    if (!apiClient) {
      setMessage({ type: 'error', text: 'Authentication required' });
      return;
    }

    try {
      const response = await apiClient.delete<LinkAccountResponse>('/api/v1/link/steam');

      if (response.data && response.data.success) {
        setSteamLinked(false);
        setSteamId('');
        setExistingIdentities({ steam: null });
        refreshIdentityStatus();
        setMessage({ type: 'success', text: 'Steam account unlinked successfully!' });
      } else {
        setMessage({ type: 'error', text: response.data?.error || 'Failed to unlink Steam account' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };


  if (isLoadingIdentities) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">Settings</h1>
        <p className="text-sm sm:text-base text-gray-400">Link your gaming accounts to enable match analysis</p>
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

      <div className="w-full">
        {/* Steam Account Section */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 sm:p-6">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2.34-.21 3.41-.6.3-.11.49-.4.49-.72v-3.38c0-.32-.19-.61-.49-.72C14.34 16.21 13.19 16 12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4c0 .85-.27 1.63-.72 2.28-.14.2-.35.32-.58.32-.23 0-.44-.12-.58-.32C14.27 13.63 14 12.85 14 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2c.55 0 1.05-.22 1.41-.59.36.37.87.59 1.41.59 1.1 0 2-.9 2-2 0-3.31-2.69-6-6-6s-6 2.69-6 6 2.69 6 6 6v4c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-100">AOE4 Account</h2>
              <p className="text-xs sm:text-sm text-gray-400">Required for fetching AOE4 match data. Link via Steam ID or AOE4World profile ID.</p>
            </div>
          </div>

          {steamLinked ? (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-300 font-medium">
                    {existingIdentities.steam?.aoe4world_profile_id ? 'AOE4World profile linked' : 'Steam account linked'}
                  </span>
                </div>
                <button
                  onClick={unlinkSteamAccount}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Unlink
                </button>
              </div>
              {existingIdentities.steam && (
                <div className="mt-3 pt-3 border-t border-green-600/20">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {existingIdentities.steam.aoe4world_profile_id ? (
                      <>
                        <div>
                          <span className="text-green-200">AOE4World Profile ID:</span>
                          <span className="text-green-100 ml-2 font-mono">{existingIdentities.steam.aoe4world_profile_id}</span>
                        </div>
                        <div>
                          <span className="text-green-200">AOE4World Username:</span>
                          <span className="text-green-100 ml-2">{existingIdentities.steam.aoe4world_username}</span>
                        </div>
                        {existingIdentities.steam.steamId && (
                          <div>
                            <span className="text-green-200">Steam ID:</span>
                            <span className="text-green-100 ml-2 font-mono">{existingIdentities.steam.steamId}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <span className="text-green-200">Steam ID:</span>
                        <span className="text-green-100 ml-2 font-mono">{existingIdentities.steam.steamId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Method Selection */}
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="linkingMethod"
                    value="steam"
                    checked={linkingMethod === 'steam'}
                    onChange={(e) => setLinkingMethod(e.target.value as 'steam' | 'aoe4world')}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Steam ID</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="linkingMethod"
                    value="aoe4world"
                    checked={linkingMethod === 'aoe4world'}
                    onChange={(e) => setLinkingMethod(e.target.value as 'steam' | 'aoe4world')}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">AOE4World Profile ID</span>
                </label>
              </div>

              {linkingMethod === 'steam' ? (
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
              ) : (
                <div>
                  <label htmlFor="profileId" className="block text-sm font-medium text-gray-300 mb-2">
                    AOE4World Profile ID
                  </label>
                  <input
                    type="text"
                    id="profileId"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    placeholder="Enter your AOE4World profile ID"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-300 font-medium">
                      📍 Find your profile ID in your AOE4World URL:
                    </p>
                    <p>Go to your AOE4World profile page and copy the profile ID from the URL.</p>
                    <p className="text-sm text-blue-200 mt-1 font-mono">
                      https://aoe4world.com/players/<span className="bg-yellow-400/20 text-yellow-300 px-1 rounded font-bold">your_profile_id</span>
                    </p>
                  </div>
                </div>
              )}
              
              <button
                onClick={linkingMethod === 'steam' ? linkSteamAccount : linkAOE4WorldAccount}
                disabled={(linkingMethod === 'steam' ? (isLinkingSteam || !steamId.trim()) : (isLinkingAOE4World || !profileId.trim()))}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  (linkingMethod === 'steam' ? (isLinkingSteam || !steamId.trim()) : (isLinkingAOE4World || !profileId.trim()))
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                {(linkingMethod === 'steam' ? isLinkingSteam : isLinkingAOE4World) ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Linking...</span>
                  </div>
                ) : (
                  `Link ${linkingMethod === 'steam' ? 'Steam' : 'AOE4World'} Account`
                )}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Account Status */}
      <div className="mt-6 sm:mt-8 bg-gray-800/30 rounded-lg border border-gray-700/50 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-3 sm:mb-4">Account Status</h3>
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${steamLinked ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-gray-300">AOE4 Account</span>
          <span className={`text-sm ${steamLinked ? 'text-green-400' : 'text-gray-500'}`}>
            {steamLinked ? 'Linked' : 'Not linked'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Settings;