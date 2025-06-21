import React, { useState, useEffect } from 'react';
import InstructionPanel from './InstructionPanel';
import OutputPanel from './OutputPanel';
import LogsPanel from './LogsPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession } from '../context/SessionContext';

// Icon components
const InstructionsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
    <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
  </svg>
);

const OutputIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5V3Z" clipRule="evenodd" />
  </svg>
);

const LogsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z" clipRule="evenodd" />
  </svg>
);

type PanelType = 'instructions' | 'report' | 'logs';

interface ControlPanelProps {
  instructions: any[];
  currentInstruction: string;
  setCurrentInstruction: (value: string) => void;
  handleSendInstruction: () => void;
  handleSendClarification?: (instructionId: string, clarificationText: string, originalInstruction: string) => void;
  isConnected: boolean;
  isProcessing: boolean;
  outputItems: any[];
  width: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  instructions,
  currentInstruction,
  setCurrentInstruction,
  handleSendInstruction,
  handleSendClarification,
  isConnected,
  isProcessing,
  outputItems,
  width
}) => {
  const [activePanel, setActivePanel] = useState<PanelType>('instructions');
  const { isManualInterventionRequired } = useSession();

  // Automatically switch to manual intervention panel when needed
  useEffect(() => {
    if (isManualInterventionRequired) {
      setActivePanel('instructions');
    }
  }, [isManualInterventionRequired]);

  return (
    <div className="flex h-full" style={{ width: `${width}px` }}>
      {/* Enhanced Icon Sidebar */}
      <div className="w-20 relative overflow-hidden border-r border-gray-700/50" style={{ backgroundColor: '#0f1419' }}>
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-gray-900 to-slate-900">
          {/* Animated connection indicator background */}
          {isConnected && (
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/4 via-purple-600/4 to-blue-600/4 opacity-60">
              <div className="absolute inset-0 opacity-40">
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/8 to-transparent"
                  style={{
                    animation: 'sidebarWave 15s ease-in-out infinite',
                    transform: 'translateY(-100%)'
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Processing state overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/6 via-purple-600/6 to-green-600/6 opacity-80">
              <div className="absolute inset-0 opacity-50">
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/12 to-transparent"
                  style={{
                    animation: 'sidebarProcessing 6s ease-in-out infinite',
                    transform: 'translateY(-100%)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Connection status indicator */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isConnected 
              ? 'bg-green-400 shadow-lg shadow-green-400/60 animate-pulse' 
              : 'bg-red-400 shadow-lg shadow-red-400/60 animate-pulse'
          }`}></div>
        </div>
        
        <div className="relative flex flex-col items-center pt-8 pb-4 space-y-1">
          {/* Instructions Button */}
          <div className="relative group mb-3">
          <button
            onClick={() => setActivePanel('instructions')}
              className={`relative w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
              activePanel === 'instructions' 
                  ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-400/40 shadow-xl shadow-blue-500/25 text-blue-300' 
                  : 'bg-gray-800/40 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 hover:border-gray-600/70 hover:shadow-lg hover:shadow-blue-500/10'
            }`}
            title="Instructions"
          >
              {/* Active state background animation */}
              {activePanel === 'instructions' && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-purple-400/10 to-blue-400/10">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-300/20 to-transparent"
                    style={{
                      animation: 'buttonActiveWave 4s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              {/* Hover animation background */}
              {activePanel !== 'instructions' && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-400/15 to-transparent opacity-0 group-hover:opacity-100"
                    style={{
                      animation: 'buttonHoverWave 3s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              <div className="relative transform group-hover:scale-110 transition-transform duration-300">
            <InstructionsIcon />
              </div>
              
              {/* Active indicator */}
              {activePanel === 'instructions' && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-l-full shadow-lg shadow-blue-400/50"></div>
            )}
          </button>
          
            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700">
                Instructions
              </div>
            </div>
          </div>

          {/* Report Button */}
          <div className="relative group mb-3">
          <button
            onClick={() => setActivePanel('report')}
              className={`relative w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
              activePanel === 'report' 
                  ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-400/40 shadow-xl shadow-purple-500/25 text-purple-300' 
                  : 'bg-gray-800/40 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 hover:border-gray-600/70 hover:shadow-lg hover:shadow-purple-500/10'
            }`}
            title="Report"
          >
              {/* Active state background animation */}
              {activePanel === 'report' && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-indigo-400/10 to-purple-400/10">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-300/20 to-transparent"
                    style={{
                      animation: 'buttonActiveWave 4s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              {/* Hover animation background */}
              {activePanel !== 'report' && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-400/15 to-transparent opacity-0 group-hover:opacity-100"
                    style={{
                      animation: 'buttonHoverWave 3s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              <div className="relative transform group-hover:scale-110 transition-transform duration-300">
                <OutputIcon />
              </div>
              
              {/* Activity indicator for reports */}
              {outputItems.length > 0 && activePanel !== 'report' && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 animate-pulse"></div>
              )}
              
              {/* Active indicator */}
              {activePanel === 'report' && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-400 to-purple-600 rounded-l-full shadow-lg shadow-purple-400/50"></div>
              )}
          </button>
          
            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700">
                Report
                {outputItems.length > 0 && (
                  <div className="text-purple-400 text-xs">{outputItems.length} items</div>
                )}
              </div>
            </div>
          </div>

          {/* Logs Button */}
          <div className="relative group">
          <button
            onClick={() => setActivePanel('logs')}
              className={`relative w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
              activePanel === 'logs' 
                  ? 'bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-400/40 shadow-xl shadow-green-500/25 text-green-300' 
                  : 'bg-gray-800/40 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 hover:border-gray-600/70 hover:shadow-lg hover:shadow-green-500/10'
            }`}
            title="Logs"
          >
              {/* Active state background animation */}
              {activePanel === 'logs' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 via-emerald-400/10 to-green-400/10">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-green-300/20 to-transparent"
                    style={{
                      animation: 'buttonActiveWave 4s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              {/* Hover animation background */}
              {activePanel !== 'logs' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-transparent via-green-400/15 to-transparent opacity-0 group-hover:opacity-100"
                    style={{
                      animation: 'buttonHoverWave 3s ease-in-out infinite',
                      transform: 'translate(-100%, -100%)'
                    }}
                  />
                </div>
              )}
              
              <div className="relative transform group-hover:scale-110 transition-transform duration-300">
            <LogsIcon />
              </div>
              
              {/* Activity indicator for logs when processing */}
              {isProcessing && activePanel !== 'logs' && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50 animate-pulse"></div>
              )}
              
              {/* Active indicator */}
              {activePanel === 'logs' && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-l-full shadow-lg shadow-green-400/50"></div>
              )}
          </button>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700">
                Logs
                {isProcessing && (
                  <div className="text-green-400 text-xs">🔄 Active</div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom connection status */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className={`text-xs transition-all duration-300 ${
            isConnected ? 'text-green-400' : 'text-red-400'
          }`}>
            <div className="flex flex-col items-center space-y-1">
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isConnected 
                  ? 'bg-green-400 shadow-lg shadow-green-400/60' 
                  : 'bg-red-400 shadow-lg shadow-red-400/60'
              }`}></div>
              <div className="text-[10px] text-center leading-none">
                {isConnected ? 'LIVE' : 'OFF'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Enhanced CSS animations */}
        <style>
          {`
            @keyframes sidebarWave {
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
            
            @keyframes sidebarProcessing {
              0% {
                transform: translateY(-100%);
                opacity: 0;
              }
              30% {
                opacity: 1;
              }
              70% {
                opacity: 1;
              }
              100% {
                transform: translateY(100%);
                opacity: 0;
              }
            }
            
            @keyframes buttonHoverWave {
              0% {
                transform: translate(-100%, -100%);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: translate(100%, 100%);
                opacity: 0;
              }
            }
            
            @keyframes buttonActiveWave {
              0% {
                transform: translate(-100%, -100%);
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                transform: translate(100%, 100%);
                opacity: 0;
              }
            }
          `}
        </style>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full" style={{ backgroundColor: '#101827' }}>
        {/* Remove left border from content panels when they're showing to create seamless blend */}
        {activePanel === 'instructions' && (
          <div className="h-full border-r-0">
            <InstructionPanel
              instructions={instructions}
              currentInstruction={currentInstruction}
              setCurrentInstruction={setCurrentInstruction}
              handleSendInstruction={handleSendInstruction}
              handleSendClarification={handleSendClarification}
              isConnected={isConnected}
              isProcessing={isProcessing}
            />
          </div>
        )}
        
        {activePanel === 'report' && (
          <div className="h-full flex flex-col border-r-0">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-200">Execution Report</h2>
              <p className="text-sm text-gray-400">
                {outputItems.length === 0 
                  ? 'No execution data yet' 
                  : `${outputItems.length} execution ${outputItems.length === 1 ? 'step' : 'steps'}`
                }
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {outputItems.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5V3Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2">No execution data yet</p>
                  <p className="text-sm">Start a task to see execution reports here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Display all output items in chronological order */}
                  {outputItems.map((item, index) => (
                    <div key={item.id || index} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-4 rounded-lg border border-gray-700/50 shadow-lg">
                      {/* Header with step number and timestamp */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {index + 1}
                          </div>
                          <h3 className="text-sm font-semibold text-gray-200">
                            {item.title || `Execution Step ${index + 1}`}
                          </h3>
                          {item.type && (
                            <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                              {item.type}
                            </span>
                          )}
                        </div>
                        {item.timestamp && (
                          <div className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="prose prose-invert prose-sm max-w-none">
                        {item.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.content}
                          </ReactMarkdown>
                        ) : item.text ? (
                          <p className="text-gray-300 leading-relaxed">{item.text}</p>
                        ) : (
                          <p className="text-gray-500 italic">No content available</p>
                        )}
                      </div>
                      
                      {/* Additional metadata if available */}
                      {(item.url || item.action || item.result) && (
                        <div className="mt-3 pt-2 border-t border-gray-700/50">
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            {item.url && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">URL:</span>
                                <span className="text-blue-400 font-mono">{item.url}</span>
                              </div>
                            )}
                            {item.action && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">Action:</span>
                                <span className="text-green-400">{item.action}</span>
                              </div>
                            )}
                            {item.result && (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">Result:</span>
                                <span className="text-yellow-400">{item.result}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Processing indicator when task is running */}
                  {isProcessing && (
                    <div className="bg-gradient-to-br from-blue-800/40 to-blue-900/40 p-4 rounded-lg border border-blue-600/30 shadow-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-blue-300">Task in Progress</h3>
                          <p className="text-xs text-blue-400">Executing instructions...</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activePanel === 'logs' && (
          <div className="h-full border-r-0">
            <LogsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel; 