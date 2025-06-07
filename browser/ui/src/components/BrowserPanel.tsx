import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { useSession } from '../context/SessionContext';
import MouseControlOverlay from './MouseControlOverlay';

interface CanvasProps {
  width: number;
  height: number;
  imageData: ArrayBuffer;
  showStatus?: boolean;
}

// Component to render screenshots on a canvas
const ScreenshotCanvas: React.FC<CanvasProps> = ({ 
  width, 
  height, 
  imageData,
  showStatus = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const lastImageRef = useRef<string | null>(null);
  const pendingRenderRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Memoized render function to avoid creating new functions on each render
  const renderImage = useCallback((imageUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      setError('Canvas 2D context not available');
      return;
    }
    
    // Create a new image if we don't have one yet
    if (!imageRef.current) {
      imageRef.current = new Image();
    }
    
    const img = imageRef.current;
    
    img.onload = () => {
      try {
        // Clear the canvas before drawing
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Clear any previous error
        setError(null);
      } catch (e) {
        setError(`Render error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        console.error('Error rendering image:', e);
      } finally {
        // Clean up
        URL.revokeObjectURL(imageUrl);
        pendingRenderRef.current = false;
      }
    };
    
    img.onerror = (e) => {
      // Error fallback
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText('Error loading screenshot', canvas.width / 2, canvas.height / 2);
      
      // Set error state
      setError(`Failed to load image: ${e instanceof Error ? e.message : 'Unknown error'}`);
      console.error('Error loading image:', e);
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
      pendingRenderRef.current = false;
    };
    
    img.src = imageUrl;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions once
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      
      // Clear canvas when dimensions change
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
    }
    
    // Skip if we already have a render in progress
    if (pendingRenderRef.current) return;
    
    try {
      // Create blob URL only when data changes
      const blob = new Blob([imageData], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      
      // Always render the new image
      pendingRenderRef.current = true;
      lastImageRef.current = url;
      renderImage(url);
    } catch (error) {
      console.error('Error preparing image:', error);
      setError(`Image preparation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      pendingRenderRef.current = false;
    }
    
    // Cleanup function
    return () => {
      if (lastImageRef.current) {
        URL.revokeObjectURL(lastImageRef.current);
        lastImageRef.current = null;
      }
    };
  }, [width, height, imageData, renderImage]);

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="mx-auto border border-gray-700 bg-white"
        style={{ 
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 60px)',
          imageRendering: 'crisp-edges' // Improve rendering quality
        }}
      />
      {error && (
        <div className="absolute top-2 left-2 bg-red-500 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          {error}
        </div>
      )}
      {showStatus && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {width} × {height}
        </div>
      )}
    </div>
  );
};

// Enhanced URL bar component with animated gradients and agent status
const URLBar = memo<{ currentUrl: string; pageTitle: string; isConnected: boolean; isProcessing: boolean }>(({ currentUrl, pageTitle, isConnected, isProcessing }) => {
  const { isManualInterventionRequired } = useSession();
  
  return (
    <div className="relative overflow-hidden w-full">
      {/* Manual intervention overlay */}
      {isManualInterventionRequired && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-orange-600/5 to-red-600/5">
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/15 to-transparent"
              style={{
                animation: 'manualInterventionUrlWave 2s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
        </div>
      )}
      
      {/* Animated processing overlay */}
      {isProcessing && !isManualInterventionRequired && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-green-600/5">
          <div className="absolute inset-0 opacity-30">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
              style={{
                animation: 'urlBarWave 3s ease-in-out infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
        </div>
      )}
      
      <div className={`relative bg-white dark:bg-gray-700 rounded-lg p-2 px-4 text-sm text-gray-600 dark:text-gray-300 flex items-center shadow-sm border transition-all duration-300 w-full ${
        isManualInterventionRequired
          ? 'border-red-400/60 shadow-red-400/30 bg-red-50/10 dark:bg-red-900/20'
          : isProcessing 
          ? 'border-blue-400/50 shadow-blue-400/20' 
          : 'border-gray-200 dark:border-gray-600'
      }`}>
        <div className={`w-4 h-4 mr-2 flex-shrink-0 transition-all duration-300 ${
          isManualInterventionRequired
            ? 'text-red-400 animate-pulse'
            : isProcessing 
            ? 'text-blue-400 animate-pulse' 
            : 'text-gray-400 dark:text-gray-500'
        }`}>
          {isManualInterventionRequired ? (
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {currentUrl ? (
            <div className="flex flex-col">
              <span className={`truncate font-medium text-xs transition-all duration-300 ${
                isManualInterventionRequired 
                  ? 'text-red-200 dark:text-red-300' 
                  : 'text-gray-800 dark:text-gray-200'
              }`}>
                {isManualInterventionRequired ? '🚨 Manual Action Required' : pageTitle || 'Loading...'}
              </span>
              <span className={`truncate text-xs transition-all duration-300 ${
                isManualInterventionRequired 
                  ? 'text-red-300/70 dark:text-red-400/70' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {currentUrl}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              No page loaded
            </span>
          )}
        </div>
        
        {/* Agent Active Indicator - integrated into URL bar */}
        {isProcessing && (
          <div className={`ml-3 flex items-center space-x-2 px-2 py-1 rounded-md border shadow-lg ${
            isManualInterventionRequired
              ? 'bg-gradient-to-r from-red-800 to-orange-900 border-red-400/50 shadow-red-500/20'
              : 'bg-gradient-to-r from-gray-800 to-gray-900 border-blue-400/50 shadow-blue-500/20'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
              isManualInterventionRequired
                ? 'bg-gradient-to-r from-red-600 to-orange-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-700'
            }`}>
              <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-semibold whitespace-nowrap ${
                isManualInterventionRequired ? 'text-red-300' : 'text-blue-300'
              }`}>
                {isManualInterventionRequired ? '🚨 Manual Mode' : '🤖 Agent Active'}
              </span>
            </div>
            {/* Pulsing indicator dots */}
            <div className="flex items-center space-x-0.5">
              <div className={`w-1 h-1 rounded-full animate-pulse ${
                isManualInterventionRequired ? 'bg-red-300' : 'bg-blue-300'
              }`}></div>
              <div className={`w-0.5 h-0.5 rounded-full animate-pulse ${
                isManualInterventionRequired ? 'bg-red-200' : 'bg-blue-200'
              }`} style={{ animationDelay: '0.5s' }}></div>
              <div className={`w-0.5 h-0.5 rounded-full animate-pulse ${
                isManualInterventionRequired ? 'bg-red-100' : 'bg-blue-100'
              }`} style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        )}
        
        {/* Connection status */}
        {currentUrl && (
          <div className="ml-2 flex items-center">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isConnected 
                ? isManualInterventionRequired
                  ? 'bg-red-400 animate-pulse'
                  : isProcessing 
                    ? 'bg-blue-400 animate-pulse' 
                    : 'bg-green-400'
                : 'bg-red-400'
            }`} title={isConnected ? 'Connected' : 'Disconnected'}></div>
          </div>
        )}
      </div>
      
      {/* Processing border animation */}
      {isProcessing && (
        <div className={`absolute inset-0 rounded-lg border border-transparent ${
          isManualInterventionRequired
            ? 'bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20'
            : 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20'
        }`}>
          <div 
            className={`absolute inset-0 rounded-lg border-2 border-transparent ${
              isManualInterventionRequired
                ? 'bg-gradient-to-r from-red-400/30 via-orange-400/30 to-red-400/30'
                : 'bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-green-400/30'
            }`}
            style={{
              animation: isManualInterventionRequired ? 'manualInterventionUrlBorder 2s ease-in-out infinite' : 'urlBarBorderMove 4s ease-in-out infinite',
              opacity: 0.6
            }}
          />
        </div>
      )}
    </div>
  );
});

URLBar.displayName = 'URLBar';

const BrowserPanel: React.FC = () => {
  const { screenshotUrl, isConnected, currentUrl, pageTitle, isManualInterventionRequired, isProcessingInstruction, streamingInfo, dismissManualIntervention } = useSession();
  const [scale, setScale] = useState(1);
  const [mouseControlEnabled, setMouseControlEnabled] = useState(false);
  const [userToggledMouseControl, setUserToggledMouseControl] = useState(false);
  
  // Automatically enable mouse control when manual intervention is required
  useEffect(() => {
    if (isManualInterventionRequired && !userToggledMouseControl) {
      setMouseControlEnabled(true);
    } else if (!isManualInterventionRequired && !userToggledMouseControl) {
      setMouseControlEnabled(false);
    }
  }, [isManualInterventionRequired, userToggledMouseControl]);
  
  // Add request screenshot button
  const requestScreenshot = () => {
    console.log('[DEBUG] Manual screenshot request');
    
    // This is a placeholder - currently we can only force a UI refresh
    // A real implementation would need to call a backend endpoint to capture a new screenshot
    // For now we'll just set a temp URL to force a refresh of the UI
    if (screenshotUrl) {
      // This will cause a UI refresh
      const now = Date.now();
      console.log(`[DEBUG] Forcing UI refresh at ${now}`);
    }
  };

  // Toggle mouse control - now tracks user preference
  const toggleMouseControl = () => {
    setMouseControlEnabled(prev => !prev);
    setUserToggledMouseControl(true);
    
    // Reset user toggle flag after a delay to allow auto-management again
    setTimeout(() => {
      setUserToggledMouseControl(false);
    }, 5000); // Allow manual override for 5 seconds
  };

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
              style={{
                animation: 'connectingWave 6s ease-in-out infinite',
                transform: 'translateX(-100%) rotate(-45deg)'
              }}
            />
          </div>
        </div>
        
        <div className="relative text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-3">
            Starting Browser Agent
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            Initializing Playwright browser and loading the welcome experience...
          </p>
          
          {/* Enhanced loading steps */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Launching browser instance</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Setting up browser context</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Loading welcome page</span>
            </div>
          </div>
          
          {/* Pulsing dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!screenshotUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="absolute inset-0 opacity-20">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent"
              style={{
                animation: 'loadingWave 5s ease-in-out infinite',
                transform: 'translateX(-100%) rotate(45deg)'
              }}
            />
          </div>
        </div>
        
        <div className="relative text-center p-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center shadow-lg shadow-green-500/25">
            <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-200 mb-3">
            Browser Connected!
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            Browser is ready and welcome page is loading. You'll see the browser view in just a moment...
          </p>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <p className="text-sm text-gray-300 mb-2">✨ What's loading:</p>
            <div className="text-xs text-gray-400 space-y-1">
              <div>• Beautiful welcome page with instructions</div>
              <div>• Live browser screenshot streaming</div>
              <div>• Interactive controls ready</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 min-w-0 flex flex-col h-full w-full overflow-hidden bg-gray-800 relative ${
      isManualInterventionRequired ? 'manual-intervention-active' : ''
    }`}>
      {/* Manual Intervention Border Animation */}
      {isManualInterventionRequired && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {/* Keep this div for potential future manual intervention indicators if needed */}
        </div>
      )}

      <div className={`p-2 border-b border-gray-700 flex justify-between items-center w-full transition-all duration-300 ${
        isManualInterventionRequired ? 'bg-gradient-to-r from-red-900/20 via-orange-900/20 to-red-900/20 border-red-600/30' : ''
      }`}>
        <div className="flex items-center space-x-2 ml-2">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isManualInterventionRequired ? 'bg-red-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isManualInterventionRequired ? 'bg-orange-500 animate-pulse' : 'bg-yellow-500'
          }`} style={{ animationDelay: '0.3s' }}></div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            isManualInterventionRequired ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`} style={{ animationDelay: '0.6s' }}></div>
        </div>

        <div className="flex-1 mx-4 w-full">
          <URLBar currentUrl={currentUrl} pageTitle={pageTitle} isConnected={isConnected} isProcessing={isProcessingInstruction} />
        </div>

        <div className="flex items-center mr-4">
          <button
            className={`p-1 text-gray-400 hover:text-gray-200 rounded transition-all duration-200 hover:bg-gray-700/50 ${
              isProcessingInstruction ? 'animate-pulse' : ''
            }`}
            onClick={requestScreenshot}
            title="Refresh page"
          >
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          
          <button
            className={`p-1 rounded ml-2 relative transition-all duration-300 ${mouseControlEnabled 
              ? isManualInterventionRequired && !userToggledMouseControl
                ? 'text-orange-400 bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/50 shadow-orange-400/20 shadow-lg' 
                : 'text-green-400 bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-500/50 shadow-green-400/20 shadow-lg'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }`}
            onClick={toggleMouseControl}
            title={
              mouseControlEnabled 
                ? isManualInterventionRequired && !userToggledMouseControl
                  ? "Auto-enabled for manual intervention - Click to disable"
                  : "Disable manual mouse control"
                : "Enable manual mouse control"
            }
          >
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            {/* Enhanced auto-enabled indicator */}
            {mouseControlEnabled && isManualInterventionRequired && !userToggledMouseControl && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 text-sm transition-all duration-200"
          >
            -
          </button>
          <span className="text-sm text-gray-300">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
            className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 text-sm transition-all duration-200"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex w-full">
        <MouseControlOverlay enabled={mouseControlEnabled} scale={scale}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} className="relative w-full min-w-full">
            <img 
              src={screenshotUrl} 
              alt="Browser Screenshot"
              className="border border-gray-700 w-full h-auto max-w-none"
            />
            
            {/* Streaming Info Indicator */}
            {streamingInfo && (
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md border border-gray-600/50 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    streamingInfo.mode === 'CDP High-FPS' 
                      ? 'bg-green-400 animate-pulse' 
                      : 'bg-yellow-400'
                  }`}></div>
                  <span className="font-medium">
                    {streamingInfo.mode === 'CDP High-FPS' ? 'CDP' : 'Screenshot'}
                  </span>
                  {streamingInfo.fps && (
                    <span className="text-gray-300">
                      {streamingInfo.fps} FPS
                    </span>
                  )}
                  {streamingInfo.quality && streamingInfo.mode === 'CDP High-FPS' && (
                    <span className="text-gray-300">
                      Q{streamingInfo.quality}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </MouseControlOverlay>
      </div>
      
      {/* CSS animations */}
      <style>
        {`
          @keyframes urlBarWave {
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
          
          @keyframes urlBarBorderMove {
            0%, 100% {
              opacity: 0.4;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.01);
            }
          }
          
          @keyframes connectingWave {
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
          
          @keyframes manualInterventionUrlWave {
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
          
          @keyframes manualInterventionUrlBorder {
            0%, 100% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 0.9;
              transform: scale(1.02);
            }
          }
        `}
      </style>
    </div>
  );
};

export default BrowserPanel; 