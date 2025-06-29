import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Auth0Wrapper, useAuth } from './context/AuthContext';
import { IdentityProvider } from './context/IdentityContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import Games from './pages/Games';
import Settings from './pages/Settings';
import Review from './pages/Review';
import './App.css';

// Login component for unauthenticated users
function LoginPage() {
  const { login } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-red-600/5 to-orange-600/5">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent"
            style={{
              animation: 'loginWave 12s ease-in-out infinite',
              transform: 'translateX(-100%) rotate(-45deg)'
            }}
          />
        </div>
      </div>
      
      <div className="relative z-10 text-center max-w-md">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 via-red-600 to-yellow-700 flex items-center justify-center shadow-2xl shadow-orange-500/30">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent">
          AOE4 Game Review
        </h1>
        <p className="mb-8 text-gray-400 text-lg leading-relaxed">
          AI-powered match analysis for Age of Empires IV players.
        </p>
        
        <button 
          onClick={login}
          className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-orange-500/25 hover:shadow-orange-400/40 overflow-hidden"
        >
          {/* Button shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              style={{
                animation: 'buttonShimmer 2s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
          <span className="relative">Sign In to Continue</span>
        </button>
        
        <div className="mt-8 flex items-center justify-center space-x-2 text-sm text-gray-500">
          {/* <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> */}
          {/* <span>Secure Authentication via Auth0</span> */}
        </div>
      </div>
      
      {/* CSS for login animations */}
      <style>
        {`
          @keyframes loginWave {
            0% {
              transform: translateX(-100%) rotate(-45deg);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(300%) rotate(-45deg);
              opacity: 0;
            }
          }
          
          @keyframes buttonShimmer {
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
}

// Enhanced loading component
function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-red-600/5 to-orange-600/5">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent"
            style={{
              animation: 'loadingWave 10s ease-in-out infinite',
              transform: 'translateX(-100%) rotate(45deg)'
            }}
          />
        </div>
      </div>
      
      <div className="relative z-10 text-center">
        {/* Enhanced loading spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-red-600 animate-spin">
            <div className="absolute inset-2 rounded-full bg-gray-900"></div>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-ping"></div>
        </div>
        
        <h2 className="text-xl font-semibold mb-2 text-gray-200">Loading AOE4 Game Review</h2>
        <p className="text-gray-400">Initializing secure connection...</p>
        
        {/* Loading dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-orange-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          <div className="w-2 h-2 bg-orange-200 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
        </div>
      </div>
      
      {/* CSS for loading animations */}
      <style>
        {`
          @keyframes loadingWave {
            0% {
              transform: translateX(-100%) rotate(45deg);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateX(300%) rotate(45deg);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
}

// Router-aware sidebar wrapper
function SidebarWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPage = location.pathname.replace('/', '') || 'games';
  
  const handlePageChange = (page: string) => {
    navigate(`/${page}`);
  };
  
  return <Sidebar currentPage={currentPage} onPageChange={handlePageChange} />;
}

// Main app content with routing
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  // If Auth0 is still initializing
  if (loading) {
    return <LoadingPage />;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <IdentityProvider>
      <Router>
        <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
          {/* Top Bar */}
          <TopBar />
          
          {/* Main Content Area */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <SidebarWrapper />
            
            {/* Main Content */}
            <div className="flex-1 overflow-auto bg-gray-900">
              <Routes>
                <Route path="/" element={<Navigate to="/games" replace />} />
                <Route 
                  path="/games" 
                  element={<Games />} 
                />
                <Route 
                  path="/settings" 
                  element={<Settings />} 
                />
                <Route 
                  path="/review/:reviewId" 
                  element={<Review />} 
                />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </IdentityProvider>
  );
}

function App() {
  return (
    <Auth0Wrapper>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Auth0Wrapper>
  );
}

export default App;