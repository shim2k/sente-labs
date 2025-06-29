import React from 'react';
import { useAuth } from '../context/AuthContext';

const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Extract user's name from Auth0 user object
  const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="relative h-16 flex items-center shadow-2xl z-20 border-b border-gray-800/50 overflow-hidden">
      {/* Dynamic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 via-red-600/5 to-orange-600/5">
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent"
              style={{
                animation: 'topBarWave 15s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
        </div>
      </div>
      
      <div className="relative w-full px-8 flex justify-between items-center">
        {/* Enhanced Brand Section */}
        <div className="flex items-center space-x-6">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-red-600 to-yellow-700 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-gray-100 font-bold tracking-wide text-xl leading-none">
                AOE4 Game Review
                <span className="ml-2 text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20">
                  BETA
                </span>
              </h1>
              <span className="text-xs text-gray-400 leading-none mt-0.5">AI-Powered Match Analysis</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5 px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700/50">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Match Analysis</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Status Section */}
        <div className="flex items-center space-x-6">
          {/* User Avatar with Initials */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-600/50 shadow-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center border border-orange-400/30 shadow-md">
              <span className="text-xs font-bold text-white">{userInitials}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-200 leading-none">{userName}</span>
              <span className="text-xs text-gray-400 leading-none">Authenticated</span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg border border-gray-600 transition-all duration-200 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
      
      {/* Enhanced border animation */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/80 to-transparent"
          style={{
            animation: 'topBarBorderMove 8s ease-in-out infinite',
            transform: 'translateX(-100%)'
          }}
        />
      </div>
      
      {/* CSS animations */}
      <style>
        {`
          @keyframes topBarWave {
            0% {
              transform: translateX(-100%);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0;
            }
          }
          
          @keyframes topBarBorderMove {
            0% {
              transform: translateX(-100%);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default TopBar;