import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DonationModal from './DonationModal';

interface TopBarProps {
  onMenuClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout, tokens } = useAuth();
  const navigate = useNavigate();
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  
  // Extract user's name from Auth0 user object
  const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="relative h-16 flex items-center shadow-2xl z-20 border-b border-gray-800/50 overflow-hidden">
      {/* Dynamic gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-blue-700/5 to-blue-600/5">
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
      </div>
      
      <div className="relative w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        {/* Enhanced Brand Section */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* Logo/Brand */}
          <div 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group"
            onClick={() => navigate('/games')}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-200 overflow-hidden">
              <img 
                src="/sentegamesicon.png" 
                alt="Sente Games" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-gray-100 font-bold tracking-wide text-sm sm:text-lg lg:text-xl leading-none group-hover:text-white transition-colors duration-200">
                <span className="hidden sm:inline">AOE4 Game Review</span>
                <span className="sm:hidden">AOE4</span>
                {/* <span className="ml-1 sm:ml-2 text-xs font-medium text-blue-400 bg-blue-400/10 px-1 sm:px-2 py-0.5 rounded-full border border-blue-400/20 group-hover:bg-blue-400/20 group-hover:border-blue-400/30 transition-all duration-200">
                  BETA
                </span> */}
              </h1>
              <span className="hidden sm:block text-xs text-gray-400 leading-none mt-0.5 group-hover:text-gray-300 transition-colors duration-200">AI-Powered Match Analysis</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1.5 px-2 py-1 bg-gray-800/50 rounded-md border border-gray-700/50">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Match Analysis</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Status Section */}
        <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
          {/* Token Count */}
          <div className="relative group">
            <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-1.5 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-600/20 rounded-lg border border-yellow-500/30 shadow-lg backdrop-blur-sm hover:border-yellow-400/40 transition-all duration-300">
              {/* Mobile-optimized display */}
              <span className="text-base sm:text-lg">🟡</span>
              <div className="flex items-center space-x-1">
                <span className="text-base sm:text-sm font-bold text-yellow-300">{tokens}</span>
                <span className="text-xs sm:hidden text-yellow-300/80">tokens</span>
              </div>
              
              {/* Desktop display */}
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-semibold text-yellow-200 leading-none">Credits</span>
                <span className="text-xs text-yellow-400/80 leading-none">{tokens} left</span>
              </div>
            </div>
            
            {/* Enhanced glow effect for better visibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-lg blur-md -z-10 group-hover:from-yellow-500/15 group-hover:to-amber-500/15 transition-all duration-300"></div>
          </div>

          {/* Get More Tokens Button */}
          <button
            onClick={() => setIsDonationModalOpen(true)}
            className="group relative px-2 sm:px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg border border-green-500/30 shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="text-sm sm:text-base">💎</span>
              <span className="text-xs sm:text-sm font-semibold">
                <span className="hidden sm:inline">Get More Tokens</span>
                <span className="sm:hidden">+</span>
              </span>
            </div>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </button>
          
          {/* User Avatar with Initials */}
          <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-gray-800/60 to-gray-700/60 rounded-lg border border-gray-600/50 shadow-lg">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border border-blue-400/30 shadow-md">
              <span className="text-xs font-bold text-white">{userInitials}</span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-gray-200 leading-none">{userName}</span>
              <span className="text-xs text-gray-400 leading-none">Authenticated</span>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={logout}
            className="px-2 sm:px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg border border-gray-600 transition-all duration-200 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </span>
          </button>
        </div>
      </div>
      
      {/* Enhanced border animation */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"
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
      
      {/* Donation Modal */}
      <DonationModal 
        isOpen={isDonationModalOpen}
        onClose={() => setIsDonationModalOpen(false)}
        userTokens={tokens}
      />
    </div>
  );
};

export default TopBar;