import React from 'react';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';

const TopBar: React.FC = () => {
  const { isConnected, isProcessingInstruction } = useSession();
  const { user } = useAuth();
  
  // Extract user's name from Auth0 user object
  const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="relative h-16 flex items-center shadow-2xl z-20 border-b border-gray-800/50 overflow-hidden">
      {/* Dynamic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900">
        {/* Animated background pattern when connected */}
        {isConnected && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5">
            <div className="absolute inset-0 opacity-20">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
                style={{
                  animation: 'topBarWave 15s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Processing overlay */}
        {isProcessingInstruction && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/8 via-purple-600/8 to-green-600/8">
            <div className="absolute inset-0 opacity-40">
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent"
                style={{
                  animation: 'topBarProcessing 4s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="relative w-full px-8 flex justify-between items-center">
        {/* Enhanced Brand Section */}
        <div className="flex items-center space-x-6">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3L4 14h7v7l9-11h-7V3z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-gray-100 font-bold tracking-wide text-xl leading-none">
            Sente
                <span className="ml-2 text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                  BETA
                </span>
          </h1>
              <span className="text-xs text-gray-400 leading-none mt-0.5">Browser Automation Platform</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5 px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700/50">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Live Session</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Status Section */}
        <div className="flex items-center space-x-6">
          {/* Processing Indicator */}
          {isProcessingInstruction && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-500/20">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
              <span className="text-xs font-medium text-blue-300">Processing</span>
              <div className="flex space-x-0.5">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
              isConnected 
                ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/30 shadow-lg shadow-green-500/20' 
                : 'bg-gradient-to-r from-red-900/40 to-red-800/40 border-red-500/30 shadow-lg shadow-red-500/20'
            }`}>
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' 
                  : 'bg-red-400 shadow-lg shadow-red-400/50 animate-pulse'
              }`}></div>
              <span className={`text-sm font-medium transition-all duration-300 ${
                isConnected ? 'text-green-300' : 'text-red-300'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* User Section */}
            <div className="flex items-center space-x-3">
              {/* User Avatar with Initials */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-600/50 shadow-lg">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border border-blue-400/30 shadow-md">
                  <span className="text-xs font-bold text-white">{userInitials}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-200 leading-none">{userName}</span>
                  <span className="text-xs text-gray-400 leading-none">Authenticated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced border animation */}
      {isConnected && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"
            style={{
              animation: 'topBarBorderMove 8s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      )}
      
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
          
          @keyframes topBarProcessing {
            0% {
              transform: translateX(-100%);
              opacity: 0;
            }
            30% {
              opacity: 1;
            }
            70% {
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