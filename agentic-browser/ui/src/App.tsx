import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { Auth0Wrapper, useAuth } from './context/AuthContext';
import ControlPanel from './components/ControlPanel';
import BrowserPanel from './components/BrowserPanel';
import TopBar from './components/TopBar';
import './App.css';

// Login component for unauthenticated users
function LoginPage() {
  const { login } = useAuth();
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-blue-600/5">
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
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 3L4 14h7v7l9-11h-7V3z"/>
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-200 bg-clip-text text-transparent">
          Sente Browser
        </h1>
        <p className="mb-8 text-gray-400 text-lg leading-relaxed">
          A secure, multi-tenant browser automation platform powered by AI.
      </p>
        
      <button 
        onClick={login}
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25 hover:shadow-blue-400/40 overflow-hidden"
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
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
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
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-blue-600/5">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent"
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin">
            <div className="absolute inset-2 rounded-full bg-gray-900"></div>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-ping"></div>
        </div>
        
        <h2 className="text-xl font-semibold mb-2 text-gray-200">Loading Sente</h2>
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

// Content component that uses the session context
function AppContent() {
  const { isAuthenticated, loading, login } = useAuth();
  const [currentInstruction, setCurrentInstruction] = useState('');
  const { 
    messages, 
    sendInstruction, 
    sendClarification, 
    isConnected, 
    isProcessingInstruction, 
    outputItems,
    isManualInterventionRequired,
    manualInterventionDetails
  } = useSession();
  const [instructionWidth, setInstructionWidth] = useState(600); // Increased width for better usability
  const [isDragging, setIsDragging] = useState(false);
  const [enhancedInstructions, setEnhancedInstructions] = useState<any[]>([]);

  // Auto-login effect
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      login();
    }
  }, [loading, isAuthenticated, login]);

  // Enhanced instructions effect - automatically add manual intervention messages
  useEffect(() => {
    // Simply use the messages array as-is, since manual intervention messages
    // are now properly added to the messages array in SessionContext
    setEnhancedInstructions(messages);
  }, [messages]);

  const handleSendInstruction = () => {
    if (currentInstruction.trim() && isConnected && !isProcessingInstruction) {
      sendInstruction(currentInstruction);
      setCurrentInstruction('');
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const stopResize = () => {
    setIsDragging(false);
  };

  const resize = (e: React.MouseEvent) => {
    if (isDragging) {
      const newWidth = e.clientX;
      // Set min/max constraints
      if (newWidth >= 250 && newWidth <= window.innerWidth * 0.7) {
        setInstructionWidth(newWidth);
      }
    }
  };

  // Add event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      // Add class to body to change cursor during dragging
      document.body.classList.add('resize-ew');
      
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = e.clientX;
        if (newWidth >= 250 && newWidth <= window.innerWidth * 0.7) {
          setInstructionWidth(newWidth);
        }
      };
      
      const handleMouseUp = () => {
        setIsDragging(false);
        document.body.classList.remove('resize-ew');
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.classList.remove('resize-ew');
      };
    }
  }, [isDragging]);

  // If Auth0 is still initializing
  if (loading) {
    return <LoadingPage />;
  }

  // Auto-login instead of showing login page
  if (!isAuthenticated) {
    return <LoadingPage />;
  }

  return (
    <div className="flex flex-col h-full transition-colors duration-200 relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      {/* Enhanced background with subtle gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        {isConnected && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/3 via-purple-600/3 to-blue-600/3">
            <div className="absolute inset-0 opacity-20">
              <div 
                className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-400/5 to-transparent"
                style={{
                  animation: 'appBackgroundWave 20s ease-in-out infinite',
                  transform: 'translateX(-100%) rotate(-45deg)'
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="relative z-10">
      <TopBar />
      <div 
        className="flex flex-1 min-h-0 overflow-hidden" 
          style={{ height: 'calc(100vh - 4rem)' }}
        onMouseMove={isDragging ? resize : undefined}
      >
        <ControlPanel 
            instructions={enhancedInstructions}
          currentInstruction={currentInstruction}
          setCurrentInstruction={setCurrentInstruction}
          handleSendInstruction={handleSendInstruction}
          handleSendClarification={sendClarification}
          isConnected={isConnected}
          isProcessing={isProcessingInstruction}
          outputItems={outputItems}
          width={instructionWidth}
        />
        
          {/* Enhanced Resize handle */}
        <div 
            className={`group relative w-1 flex-shrink-0 transition-all duration-300 cursor-ew-resize ${
              isDragging ? 'bg-blue-500 w-1.5' : 'bg-gray-800 hover:bg-blue-500'
            }`}
          onMouseDown={startResize}
          onMouseUp={stopResize}
        >
            {/* Enhanced grab handle */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-all duration-300 ${
              isDragging 
                ? 'w-3 h-12 bg-blue-400 shadow-lg shadow-blue-400/50' 
                : 'w-2 h-8 bg-gray-700 group-hover:bg-blue-400 group-hover:w-3 group-hover:h-12 group-hover:shadow-lg group-hover:shadow-blue-400/50'
            } rounded-full opacity-70 group-hover:opacity-100`}></div>
            
            {/* Resize indicator lines */}
            <div className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 transition-all duration-300 ${
              isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <div className="flex space-x-0.5">
                <div className="w-0.5 h-3 bg-white/60 rounded-full"></div>
                <div className="w-0.5 h-3 bg-white/60 rounded-full"></div>
              </div>
            </div>
            
            {/* Animated border when dragging */}
            {isDragging && (
              <div className="absolute inset-0 bg-gradient-to-b from-blue-400/50 via-purple-400/50 to-blue-400/50">
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-300/80 to-transparent"
                  style={{
                    animation: 'resizeIndicator 2s ease-in-out infinite'
                  }}
                />
              </div>
            )}
        </div>
        
        <BrowserPanel />
      </div>
      </div>
      
      {/* CSS animations for enhanced layout */}
      <style>
        {`
          @keyframes appBackgroundWave {
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
          
          @keyframes resizeIndicator {
            0% {
              transform: translateY(-100%);
              opacity: 0;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateY(100%);
              opacity: 0;
            }
          }
          
          .resize-ew {
            cursor: ew-resize !important;
          }
          
          .resize-ew * {
            cursor: ew-resize !important;
          }
        `}
      </style>
    </div>
  );
}

function App() {
  return (
    <Auth0Wrapper>
      <ThemeProvider>
        <SessionProvider>
          <AppContent />
        </SessionProvider>
      </ThemeProvider>
    </Auth0Wrapper>
  );
}

export default App;
