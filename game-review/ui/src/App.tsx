import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Auth0Wrapper, useAuth } from './context/AuthContext';
import { IdentityProvider } from './context/IdentityContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import ScrollToTop from './components/ScrollToTop';
import Games from './pages/Games';
import Settings from './pages/Settings';
import Review from './pages/Review';
import Reviews from './pages/Reviews';
import ReplayViewer from './pages/ReplayViewer';
import Dashboard from './pages/Dashboard';
import TermsOfService from './pages/TermsOfService';
import Pricing from './pages/Pricing';
import './App.css';

// Redirect component for unauthenticated users
function RedirectToLanding() {
  const { login } = useAuth();

  React.useEffect(() => {
    // Only redirect if not on the app domain (aoe4.senteai.com) and in production
    const isAppDomain = window.location.hostname === 'aoe4.senteai.com';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !isAppDomain) {
      window.location.href = 'https://senteai.com';
    }
  }, []);

  // In development or on app domain, show login page instead of redirecting
  const isAppDomain = window.location.hostname === 'aoe4.senteai.com';
  if (process.env.NODE_ENV === 'development' || isAppDomain) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-blue-700/5 to-blue-600/5">
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
              style={{
                animation: 'loginWave 12s ease-in-out infinite',
                transform: 'translateX(-100%) rotate(-45deg)'
              }}
            />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-md">
          {/* Logo */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden">
            <img
              src="/sentegamesicon.png"
              alt="Sente Games"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent">
            AOE4 Game Review
          </h1>
          <p className="mb-8 text-gray-400 text-lg leading-relaxed">
            AI-powered match analysis for Age of Empires IV players.
          </p>

          <button
            onClick={login}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25 hover:shadow-blue-400/40 overflow-hidden"
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

  // Production: Show loading message while redirecting
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center overflow-hidden">
          <img
            src="/sentegamesicon.png"
            alt="Sente Games"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-gray-400">Redirecting to senteai.com...</p>
      </div>
    </div>
  );
}

// Enhanced loading component
function LoadingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-blue-700/5 to-blue-600/5">
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-spin">
            <div className="absolute inset-2 rounded-full bg-gray-900"></div>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-ping"></div>
        </div>

        <h2 className="text-xl font-semibold mb-2 text-gray-200">Loading AOE4 Game Review</h2>
        <p className="text-gray-400">Initializing secure connection...</p>

        {/* Loading dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
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
function SidebarWrapper({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = location.pathname.replace('/', '') || 'games';

  const handlePageChange = (page: string) => {
    navigate(`/${page}`);
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return <Sidebar currentPage={currentPage} onPageChange={handlePageChange} onClose={onClose} />;
}

// Authenticated app layout
function AuthenticatedLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <IdentityProvider>
      <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
        {/* Top Bar */}
        <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Main Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block">
            <SidebarWrapper />
          </div>

          {/* Mobile Sidebar Overlay */}
          <div className={`lg:hidden fixed inset-0 z-40 flex pointer-events-none ${isSidebarOpen ? '' : ''}`}>
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <div className={`relative flex w-64 flex-col bg-gray-900 border-r border-gray-800 shadow-2xl transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } pointer-events-auto`}>
              <SidebarWrapper onClose={() => setIsSidebarOpen(false)} />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto bg-gray-900">
            <Routes>
              <Route path="/games" element={<Games />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/review/:reviewId" element={<Review />} />
              <Route path="/replay" element={<ReplayViewer />} />
              <Route path="*" element={<Navigate to="/games" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </IdentityProvider>
  );
}

// Main app content with routing
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  // If Auth0 is still initializing
  if (loading) {
    return <LoadingPage />;
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated) {
    return <RedirectToLanding />;
  }

  return <AuthenticatedLayout />;
}

// Public routes wrapper (no auth required)
function PublicAppContent() {
  return (
    <Router>
      <ScrollToTop>
        <Routes>
          <Route path="/public/terms" element={<TermsOfService />} />
          <Route path="/public/pricing" element={<Pricing />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </ScrollToTop>
    </Router>
  );
}

function App() {
  return (
    <Auth0Wrapper>
      <ThemeProvider>
        <PublicAppContent />
      </ThemeProvider>
    </Auth0Wrapper>
  );
}

export default App;