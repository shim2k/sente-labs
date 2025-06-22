import React, { useState, useEffect, memo, useMemo } from 'react';
import { useSession } from '../context/SessionContext';

interface LogEntry {
  id?: string;
  type: 'agent' | 'action' | 'system' | 'error' | 'llm';
  message: string;
  timestamp: number;
  rawData?: any;
}

interface InstructionPanelProps {
  instructions: { 
    type: 'instruction' | 'response' | 'clarification' | 'manual_intervention';
    text: string; 
    id?: string; 
    executed?: string[];
    clarificationData?: {
      confidenceScore: number;
      reasoning: string;
      suggestedQuestions?: string[];
      originalInstruction: string;
    };
    manualInterventionData?: {
      reasoning: string;
      suggestion: string;
      currentUrl: string;
      timestamp: number;
    };
    loading?: boolean;
    status?: 'success' | 'error' | 'pending' | 'stopped';
    manuallyCompleted?: boolean;
    completed?: boolean;
    response?: {
      answer?: string;
      message?: string;
      [key: string]: any;
    };
  }[];
  currentInstruction: string;
  setCurrentInstruction: (value: string) => void;
  handleSendInstruction: () => void;
  handleSendClarification?: (instructionId: string, clarificationText: string, originalInstruction: string) => void;
  handleMarkTaskCompleted?: () => void;
  isConnected: boolean;
  isProcessing: boolean;
  width?: number;
}

// Memoized animated log display component
const AgentLogDisplay: React.FC<{ logs: LogEntry[], isProcessing: boolean, taskId?: string }> = memo(({ logs, isProcessing, taskId }) => {
  const [fadeClass, setFadeClass] = useState('opacity-100');
  const [lastTaskId, setLastTaskId] = useState<string | undefined>(taskId);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);

  // Track when processing starts to show immediate feedback
  useEffect(() => {
    if (isProcessing && !processingStartTime) {
      setProcessingStartTime(Date.now());
    } else if (!isProcessing) {
      setProcessingStartTime(0);
    }
  }, [isProcessing, processingStartTime]);

  // Reset when task changes
  useEffect(() => {
    const currentTaskId = taskId;
    const hasTaskChanged = currentTaskId !== lastTaskId;
    
    if (hasTaskChanged && currentTaskId) {
      setLastTaskId(currentTaskId);
      setFadeClass('opacity-100');
    }
  }, [taskId, lastTaskId]);

  // Memoize filtered logs to prevent unnecessary recalculations
  const relevantLogs = useMemo(() => {
    if (!isProcessing) return [];
    
    const now = Date.now();
    const recentTimeThreshold = now - 45000; // 45 seconds ago
    
    return logs.filter(log => {
      // Must be one of the allowed types
      const isValidType = log.type === 'agent' || log.type === 'action' || log.type === 'system' || log.type === 'error' || log.type === 'llm';
      if (!isValidType) return false;
      
      // Must be recent (within last 45 seconds)
      const isRecent = log.timestamp > recentTimeThreshold;
      if (!isRecent) return false;
      
      // Show logs from current processing session (more lenient timing)
      // If we just started processing, show logs from the last 30 seconds
      const sessionThreshold = processingStartTime ? processingStartTime - 30000 : now - 30000;
      const isFromCurrentSession = log.timestamp > sessionThreshold;
      
      return isFromCurrentSession;
    });
  }, [logs, isProcessing, processingStartTime]);

  // Get the most recent relevant log
  const currentLog = useMemo(() => {
    if (relevantLogs.length === 0) {
      return {
        type: 'agent' as const,
        message: 'Processing your request...',
        timestamp: Date.now()
      };
    }

    // Return the most recent log
    return relevantLogs[relevantLogs.length - 1];
  }, [relevantLogs]);

  // Show a default processing message if no logs are available yet
  if (!isProcessing) return null;

  const getLogIcon = (type: string) => {
    if (type === 'agent') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      );
    } else if (type === 'action') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      );
    } else if (type === 'system') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else if (type === 'error') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-red-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else if (type === 'llm') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    }
    return null;
  };

  const getLogLabel = (type: string) => {
    switch (type) {
      case 'agent': return '🧠 Agent Thinking';
      case 'action': return '⚡ Taking Action';
      case 'system': return '⚙️ System';
      case 'error': return '❌ Error';
      case 'llm': return '🤖 LLM Processing';
      default: return type;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'agent': return 'text-blue-400';
      case 'action': return 'text-green-400';
      case 'system': return 'text-blue-300';
      case 'error': return 'text-red-400';
      case 'llm': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const formatLogMessage = (message: string | undefined) => {
    // Clean up common log prefixes and make more readable
    if (!message) return 'Processing...';
    return message
      .replace(/^(agent|action|system|error|llm):\s*/i, '')
      .replace(/^\w+\s*-\s*/, '')
      .trim();
  };

  return (
    <div className="relative bg-gradient-to-r from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-4 overflow-hidden min-h-[120px]">
      {/* Wave-like animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-green-600/5">
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
            style={{
              animation: 'waveMove 4s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      </div>
      
      <div className="relative flex items-start space-x-3 h-full">
        {getLogIcon(currentLog.type)}
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${getLogColor(currentLog.type)}`}>
              {getLogLabel(currentLog.type)}
            </span>
            
            {/* Show pulsing indicator when processing */}
            <div className="flex items-center ml-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse ml-1" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
          
          <div className="min-h-[3rem] flex items-center">
            <p className={`text-gray-200 text-sm leading-relaxed transition-all duration-500 ${fadeClass} break-words`}>
              {formatLogMessage(currentLog.message)}
            </p>
          </div>
          
          {/* Enhanced status indicator */}
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
            <span className="text-xs text-gray-500 whitespace-nowrap">Processing...</span>
            {currentLog.type === 'error' && (
              <span className="text-xs text-red-400 font-medium whitespace-nowrap">⚠️ Issue detected</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Wave-like border animation */}
      <div className="absolute inset-0 rounded-xl border border-transparent bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20">
        <div 
          className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-green-400/30"
          style={{
            animation: 'borderWaveMove 5s ease-in-out infinite',
            opacity: 0.6
          }}
        />
      </div>
      
      {/* CSS animations */}
      <style>
        {`
          @keyframes waveMove {
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
          
          @keyframes borderWaveMove {
            0%, 100% {
              opacity: 0.4;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.01);
            }
          }
        `}
      </style>
    </div>
  );
});

AgentLogDisplay.displayName = 'AgentLogDisplay';

// Simplified integrated agent log display for inline use
const AgentLogDisplayIntegrated: React.FC<{ logs: LogEntry[] }> = memo(({ logs }) => {
  // Get the most recent relevant log
  const currentLog = useMemo(() => {
    const now = Date.now();
    const recentTimeThreshold = now - 30000; // 30 seconds ago

    const relevantLogs = logs.filter(log => {
      const isValidType = log.type === 'agent' || log.type === 'action' || log.type === 'system' || log.type === 'error' || log.type === 'llm';
      const isRecent = log.timestamp > recentTimeThreshold;
      return isValidType && isRecent;
    });

    if (relevantLogs.length === 0) {
      return {
        type: 'agent' as const,
        message: 'Processing your request...',
        timestamp: Date.now()
      };
    }

    return relevantLogs[relevantLogs.length - 1];
  }, [logs]);

  const getLogIcon = (type: string) => {
    if (type === 'action') {
      return (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    } else if (type === 'system') {
      return (
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (type === 'error') {
      return (
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (type === 'llm') {
      return (
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    }
    // Default agent icon
    return (
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    );
  };

  const getLogLabel = (type: string) => {
    switch (type) {
      case 'agent': return 'Thinking';
      case 'action': return 'Taking Action';
      case 'system': return 'System';
      case 'error': return 'Error';
      case 'llm': return 'LLM Processing';
      default: return type;
    }
  };

  const formatLogMessage = (message: string | undefined) => {
    if (!message) return 'Processing...';
    return message
      .replace(/^(agent|action|system|error|llm):\s*/i, '')
      .replace(/^\w+\s*-\s*/, '')
      .trim();
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-600/30">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getLogIcon(currentLog.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-gray-400">
              {getLogLabel(currentLog.type)}
            </span>
            <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed break-words">
            {formatLogMessage(currentLog.message)}
          </p>

          {currentLog.type === 'error' && (
            <span className="text-xs text-red-400 font-medium mt-1 block">⚠️ Issue detected</span>
          )}
        </div>
      </div>
    </div>
  );
});

AgentLogDisplayIntegrated.displayName = 'AgentLogDisplayIntegrated';

// Manual Intervention Card Component
const ManualInterventionCard: React.FC<{
  data: {
    reasoning: string;
    suggestion: string;
    currentUrl: string;
    timestamp: number;
  };
  onComplete: () => void;
}> = memo(({ data, onComplete }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-red-900/40 to-orange-900/30 border border-red-600/50 rounded-xl p-6 overflow-hidden shadow-2xl shadow-red-900/30">
      {/* Animated alert background */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-orange-600/8 to-red-600/5">
        <div className="absolute inset-0 opacity-40">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/15 to-transparent"
            style={{
              animation: 'manualInterventionWave 4s ease-in-out infinite',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="relative flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-400 to-orange-500 flex items-center justify-center shadow-lg shadow-red-400/50 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
            🚨 Manual Intervention Required
          </h3>
          <p className="text-sm text-red-200/70">
            {formatTime(data.timestamp)}
          </p>
        </div>
      </div>

      {/* Action Required Section */}
      <div className="relative space-y-4 mb-6">
        <div className="bg-red-800/30 border border-red-600/40 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-red-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-200 mb-2">What you need to do:</h4>
              <p className="text-white font-medium leading-relaxed">{data.suggestion}</p>
            </div>
          </div>
        </div>

        {/* Current Page Info */}
        <div className="bg-orange-800/20 border border-orange-600/40 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-200 mb-2">Current page:</h4>
              <p className="text-orange-100 text-sm font-mono break-all bg-gray-800/60 p-2 rounded border border-gray-700/50">
                {data.currentUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-800/20 border border-blue-600/40 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-200 mb-2">Instructions:</h4>
              <p className="text-blue-100 text-sm leading-relaxed">
                Complete the manual action described above in the browser window, then click the "Mark as Done" button below to continue automation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="relative">
        <button
          onClick={handleComplete}
          disabled={isCompleting}
          className={`relative w-full px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 overflow-hidden ${isCompleting
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-red-500/30 hover:shadow-red-400/40 hover:shadow-xl transform hover:scale-[1.02]'
            }`}
        >
          {/* Button background animation */}
          {!isCompleting && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-orange-400/20 to-red-400/20">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{
                  animation: 'buttonShimmer 3s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              />
            </div>
          )}

          <div className="relative flex items-center justify-center space-x-2">
            {isCompleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Completing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Mark as Done</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Enhanced border animation */}
      <div className="absolute inset-0 rounded-xl border border-transparent bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20">
        <div
          className="absolute inset-0 rounded-xl border border-transparent bg-gradient-to-r from-red-400/30 via-orange-400/30 to-red-400/30"
          style={{
            animation: 'manualInterventionBorderMove 6s ease-in-out infinite',
            opacity: 0.6
          }}
        />
      </div>
    </div>
  );
});

ManualInterventionCard.displayName = 'ManualInterventionCard';

const InstructionPanel: React.FC<InstructionPanelProps> = ({ 
  instructions, 
  currentInstruction, 
  setCurrentInstruction, 
  handleSendInstruction,
  handleSendClarification,
  handleMarkTaskCompleted,
  isConnected,
  isProcessing,
  width = 350, // Default width
}) => {
  const [showExecutionDetails, setShowExecutionDetails] = useState<Record<string, boolean>>({});
  const [clarificationResponse, setClarificationResponse] = useState<string>('');
  const [activeClarificationId, setActiveClarificationId] = useState<string | null>(null);
  const { isManualInterventionRequired, logs, dismissManualIntervention, stopCurrentInstruction, markInstructionComplete } = useSession();

  const toggleDetails = (id: string) => {
    setShowExecutionDetails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.altKey)) {
      if (activeClarificationId) {
        handleSubmitClarification();
      } else {
        handleSendInstruction();
      }
    }
  };

  const handleSubmitClarification = () => {
    if (activeClarificationId && clarificationResponse.trim() && handleSendClarification) {
      const clarificationMsg = instructions.find(i => i.id === activeClarificationId);
      if (clarificationMsg?.clarificationData) {
        handleSendClarification(
          activeClarificationId, 
          clarificationResponse,
          clarificationMsg.clarificationData.originalInstruction
        );
        setClarificationResponse('');
        setActiveClarificationId(null);
      }
    }
  };

  const handleQuestionClick = (question: string) => {
    setClarificationResponse(question);
  };

  return (
    <div 
      className={`flex flex-col h-full border-t-0 border-l-0 border-b-0 border-r border-gray-700 w-full transition-all duration-300 ${isManualInterventionRequired ? 'manual-intervention-panel' : ''
        }`}
      style={{ backgroundColor: '#101827' }}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-700 transition-all duration-300 ${isManualInterventionRequired
        ? 'bg-gradient-to-r from-red-900/20 via-orange-900/20 to-red-900/20 border-red-600/30'
        : ''
        }`}>
        <h2 className={`text-lg font-semibold transition-all duration-300 ${isManualInterventionRequired ? 'text-red-200' : 'text-gray-200'
          }`}>
          {isManualInterventionRequired ? '🚨 Manual Action Required' : 'Instructions'}
        </h2>
        <p className={`text-sm transition-all duration-300 ${isManualInterventionRequired ? 'text-red-300/70' : 'text-gray-400'
          }`}>
          {isManualInterventionRequired
            ? 'Complete the manual action, then continue with tasks'
            : 'Enter tasks for the browser agent'
          }
        </p>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {instructions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No instructions yet</p>
            <p className="text-sm mt-2">Enter a task below to get started</p>
          </div>
        ) : (
          <>
            {instructions.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`relative p-4 rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:scale-[1.02] ${msg.type === 'instruction'
                  ? msg.loading
                    ? 'bg-gradient-to-br from-blue-900/40 to-purple-800/30 border border-blue-600/60 shadow-lg shadow-blue-900/30'
                    : 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 shadow-lg shadow-blue-900/20'
                    : msg.type === 'clarification'
                    ? 'bg-gradient-to-br from-yellow-900/30 to-orange-800/20 border border-yellow-700/50 shadow-lg shadow-yellow-900/20'
                    : msg.type === 'manual_intervention'
                      ? msg.status === 'success'
                        ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50 shadow-lg shadow-green-900/20'
                        : 'bg-gradient-to-br from-red-900/40 to-orange-900/30 border border-red-600/50 shadow-lg shadow-red-900/30'
                      : 'bg-gradient-to-br from-gray-800/80 to-gray-700/60 border border-gray-600/50 shadow-lg shadow-gray-900/20'
                }`}
              >
                {/* Enhanced animated background for loading state */}
                {msg.loading ? (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-green-600/5">
                    <div className="absolute inset-0 opacity-30">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"
                        style={{
                          animation: 'waveMove 4s ease-in-out infinite',
                          transform: 'translateX(-100%)'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 opacity-30">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-transparent ${msg.type === 'instruction'
                        ? 'via-blue-400/10'
                        : msg.type === 'clarification'
                          ? 'via-yellow-400/10'
                          : msg.type === 'manual_intervention'
                            ? msg.status === 'success'
                              ? 'via-green-400/10'
                              : 'via-red-400/10'
                            : 'via-gray-400/10'
                        } to-transparent`}
                      style={{
                        animation: 'messageCardWave 12s ease-in-out infinite',
                        transform: 'translateX(-100%)',
                        animationDelay: `${index * 0.5}s`
                      }}
                    />
                  </div>
                )}

                <div className="relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {/* Enhanced type indicator with agent log icon when loading */}
                      {msg.loading ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${msg.type === 'instruction'
                          ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                          : msg.type === 'clarification'
                            ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50'
                            : msg.type === 'manual_intervention'
                              ? msg.status === 'success'
                                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                                : 'bg-red-400 shadow-lg shadow-red-400/50'
                              : 'bg-gray-400 shadow-lg shadow-gray-400/50'
                          }`}></div>
                      )}
                      <span className={`text-xs uppercase font-semibold tracking-wider ${msg.type === 'instruction'
                        ? 'text-blue-300'
                        : msg.type === 'clarification'
                          ? 'text-yellow-300'
                          : msg.type === 'manual_intervention'
                            ? msg.status === 'success'
                              ? 'text-green-300'
                              : 'text-red-300'
                            : 'text-gray-300'
                        }`}>
                        {msg.type === 'instruction'
                          ? msg.loading
                            ? '🧠 Agent Processing Task'
                            : msg.status === 'success'
                              ? msg.completed 
                                ? '✅ Task Completed by Agent'
                                : msg.manuallyCompleted 
                                  ? '✅ Task Marked Complete' 
                                  : '✅ Task Completed'
                              : msg.status === 'error'
                                ? '❌ Task Failed'
                                : msg.status === 'stopped'
                                  ? '🛑 Task Stopped'
                                  : '📝 Task'
                          : msg.type === 'clarification'
                            ? '❓ Clarification Needed'
                            : msg.type === 'manual_intervention'
                              ? msg.status === 'success'
                                ? '✅ Manual Action Completed'
                                : '🚨 Manual Action Required'
                              : '✅ Result'}
                  </span>

                      {/* Show pulsing indicator when loading */}
                      {msg.loading && (
                        <div className="flex items-center ml-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse ml-1" style={{ animationDelay: '0.5s' }}></div>
                          <div className="w-1 h-1 bg-blue-200 rounded-full animate-pulse ml-1" style={{ animationDelay: '1s' }}></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Control buttons for loading instructions */}
                    {msg.loading && msg.id && msg.type === 'instruction' && (
                      <div className="flex items-center space-x-0.5 relative z-10">
                        {/* Stop button - minimal design */}
                        <button
                          onClick={() => stopCurrentInstruction(msg.id!)}
                          className="group relative p-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-md transition-all duration-200 flex items-center gap-1"
                          title="Stop the current instruction"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs whitespace-nowrap">Stop</span>
                        </button>

                        {/* Mark Complete button - minimal design */}
                        <button
                          onClick={() => markInstructionComplete(msg.id!)}
                          className="group relative p-1.5 text-xs text-gray-400 hover:text-green-400 hover:bg-green-900/10 rounded-md transition-all duration-200 flex items-center gap-1"
                          title="Mark this instruction as complete"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs whitespace-nowrap">Complete</span>
                        </button>

                        {/* Separator */}
                        <div className="w-px h-4 bg-gray-600/30 mx-1"></div>
                      </div>
                    )}
                    
                    {/* Existing details toggle button */}
                  {msg.executed && msg.executed.length > 0 && !msg.loading && (
                    <button
                      onClick={() => msg.id && toggleDetails(msg.id)}
                        className="relative z-10 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-900/20 transition-all duration-200 flex items-center gap-1"
                    >
                        <svg className={`w-3 h-3 transition-transform duration-200 ${showExecutionDetails[msg.id || ''] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      {showExecutionDetails[msg.id || ''] ? 'Hide Details' : 'Show Details'}
                    </button>
                  )}
                </div>

                  <div className="prose prose-sm prose-invert max-w-none">
                    <p className="text-gray-100 leading-relaxed whitespace-pre-wrap font-medium flex items-center gap-2">
                      {msg.text}
                      {msg.loading && (
                        <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                      )}
                    </p>
                  </div>

                  {/* Agent completion details */}
                  {msg.completed && msg.response && (
                    <div className="relative z-10 mt-3 p-3 bg-green-800/20 border border-green-600/40 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-green-200 mb-2">Agent Result:</h4>
                          <p className="text-green-100 text-sm leading-relaxed">
                            {msg.response.answer || msg.response.message || 'Task completed successfully'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integrated agent log display when loading */}
                  {msg.loading && (
                    <AgentLogDisplayIntegrated logs={logs} />
                  )}
                
                {/* Clarification details */}
                {msg.type === 'clarification' && msg.clarificationData && (
                    <div className="relative z-10 mt-3 space-y-2">
                    <div className="text-xs text-gray-400">
                      <span>Confidence Score: </span>
                        <span className={`font-semibold ${msg.clarificationData.confidenceScore < 4 ? 'text-red-400' :
                        msg.clarificationData.confidenceScore < 7 ? 'text-yellow-400' : 
                        'text-green-400'
                      }`}>
                        {msg.clarificationData.confidenceScore}/10
                      </span>
                    </div>
                    {msg.clarificationData.reasoning && (
                      <p className="text-xs text-gray-400 italic">{msg.clarificationData.reasoning}</p>
                    )}
                    {msg.clarificationData.suggestedQuestions && msg.clarificationData.suggestedQuestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Click a suggestion or write your own:</p>
                        <div className="space-y-1">
                          {msg.clarificationData.suggestedQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuestionClick(question)}
                                className="relative z-10 text-xs text-blue-400 hover:text-blue-300 text-left w-full p-2 rounded hover:bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.id && activeClarificationId === msg.id && (
                      <div className="mt-3 border-t border-gray-700 pt-3">
                        <textarea
                          value={clarificationResponse}
                          onChange={(e) => setClarificationResponse(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Provide more details..."
                            className="relative z-10 w-full min-h-[60px] p-2 text-sm border border-gray-600 rounded focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-gray-800 text-gray-100"
                          autoFocus
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setClarificationResponse('');
                              setActiveClarificationId(null);
                            }}
                              className="relative z-10 px-3 py-1 text-sm rounded font-medium text-gray-300 bg-gray-700 hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitClarification}
                            disabled={!clarificationResponse.trim() || isProcessing}
                              className={`relative z-10 px-3 py-1 text-sm rounded font-medium text-white flex items-center gap-2 ${!clarificationResponse.trim() || isProcessing
                                ? 'bg-gray-700 cursor-not-allowed'
                                : 'bg-yellow-700 hover:bg-yellow-800'
                            }`}
                          >
                            {isProcessing ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Sending
                              </>
                            ) : (
                              'Send Clarification'
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                    {msg.id && activeClarificationId !== msg.id && (
                      <button
                        onClick={() => setActiveClarificationId(msg.id!)}
                          className="relative z-10 mt-2 px-3 py-1 text-sm rounded font-medium text-white bg-yellow-700 hover:bg-yellow-800"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                )}

                  {/* Manual intervention action */}
                  {msg.type === 'manual_intervention' && (
                    <div className="relative z-10 mt-3 space-y-3">
                      {msg.status === 'success' ? (
                        <div className="bg-green-800/20 border border-green-600/40 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-green-300">Manual Action Completed</span>
                          </div>
                          <p className="text-sm text-green-100 mt-2">
                            The manual action has been completed successfully. The agent can now continue with automation.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-800/20 border border-red-600/40 rounded-lg p-3">
                          <button
                            onClick={dismissManualIntervention}
                            className="relative w-full px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-lg shadow-red-500/30 hover:shadow-red-400/40 hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 overflow-hidden flex items-center justify-center gap-2"
                          >
                            {/* Button background animation */}
                            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-orange-400/20 to-red-400/20">
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                style={{
                                  animation: 'buttonShimmer 3s ease-in-out infinite',
                                  transform: 'translateX(-100%)'
                                }}
                              />
                            </div>
                            <div className="relative flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>Mark as Done</span>
                            </div>
                          </button>
                        </div>
                    )}
                  </div>
                )}
                
                {/* Execution details */}
                {msg.id && showExecutionDetails[msg.id] && msg.executed && msg.executed.length > 0 && (
                    <div className="relative z-10 mt-3 border-t border-gray-700 pt-2">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Agent actions:</p>
                    <div className="text-xs space-y-2">
                      {msg.executed.map((line, idx) => {
                        // Skip empty observe actions
                        if (line === "observe: {}" || line === "observe: null") {
                          return null;
                        }
                        
                        // Split action and reasoning
                        const [action, reasoning] = line.split(': ');
                        
                        // Choose action icon/color based on action type
                        let actionClass = "bg-gray-800";
                        if (action === "navigate") {
                          actionClass = "bg-blue-900/30 border-blue-800";
                        } else if (action === "click") {
                          actionClass = "bg-green-900/30 border-green-800";
                        } else if (action === "complete") {
                          actionClass = "bg-purple-900/30 border-purple-800";
                        } else if (action === "type") {
                          actionClass = "bg-yellow-900/30 border-yellow-800";
                        } else if (action === "enter" || action === "pressEnter") {
                          actionClass = "bg-orange-900/30 border-orange-800";
                        }
                        
                        return (
                          <div key={idx} className={`p-2 rounded border ${actionClass} text-gray-200`}>
                            <span className="font-semibold">{action}:</span> {reasoning}
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                )}
              </div>

                {/* Enhanced border animation */}
                <div className={`absolute inset-0 rounded-xl border border-transparent ${msg.type === 'instruction'
                  ? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20'
                  : msg.type === 'clarification'
                    ? 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20'
                    : msg.type === 'manual_intervention'
                      ? msg.status === 'success'
                        ? 'bg-gradient-to-r from-green-500/20 via-green-400/20 to-green-500/20'
                        : 'bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20'
                      : 'bg-gradient-to-r from-gray-500/20 via-gray-400/20 to-gray-500/20'
                  }`}>
                  <div
                    className={`absolute inset-0 rounded-xl border border-transparent ${msg.type === 'instruction'
                      ? 'bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-blue-400/30'
                      : msg.type === 'clarification'
                        ? 'bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-yellow-400/30'
                        : msg.type === 'manual_intervention'
                          ? msg.status === 'success'
                            ? 'bg-gradient-to-r from-green-400/30 via-green-300/30 to-green-400/30'
                            : 'bg-gradient-to-r from-red-400/30 via-orange-400/30 to-red-400/30'
                          : 'bg-gradient-to-r from-gray-400/30 via-gray-300/30 to-gray-400/30'
                      }`}
                    style={{
                      animation: 'messageCardBorderMove 8s ease-in-out infinite',
                      opacity: 0.4,
                      animationDelay: `${index * 0.3}s`
                    }}
              />
                </div>
              </div>
              
            ))}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t border-gray-700 relative overflow-hidden transition-all duration-300 ${isManualInterventionRequired
        ? 'bg-gradient-to-r from-red-900/10 via-orange-900/10 to-red-900/10 border-red-600/30'
        : ''
        }`}>
        {/* Manual intervention background animation */}
        {isManualInterventionRequired && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-orange-600/5 to-red-600/5 opacity-60">
            <div className="absolute inset-0 opacity-40">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/15 to-transparent"
                style={{
                  animation: 'manualInterventionInputWave 4s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              />
            </div>
          </div>
        )}

        {/* Animated background for input area when connected */}
        {isConnected && !isManualInterventionRequired && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/3 via-purple-600/3 to-green-600/3 opacity-50">
            <div className="absolute inset-0 opacity-30">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
                style={{
                  animation: 'inputAreaWave 8s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              />
            </div>
          </div>
        )}

        <div className="relative flex items-center">
          <div className="relative flex-1">
          <textarea
            value={currentInstruction}
            onChange={(e) => setCurrentInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
              placeholder={
                isManualInterventionRequired
                  ? "Enter your next task after completing the manual action..."
                  : "Enter a task for the browser agent..."
              }
              className={`w-full min-h-[80px] p-3 border rounded-lg text-gray-100 transition-all duration-300 ${!isConnected || isProcessing || activeClarificationId !== null
                ? 'border-gray-600 bg-gray-800'
                : isManualInterventionRequired
                  ? currentInstruction.trim()
                    ? 'border-red-500/50 bg-red-900/10 focus:ring-2 focus:ring-red-500/50 focus:border-red-400 shadow-red-400/10 shadow-lg'
                    : 'border-red-600/40 bg-red-900/10 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                  : currentInstruction.trim()
                    ? 'border-blue-500/50 bg-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 shadow-blue-400/10 shadow-lg'
                    : 'border-gray-600 bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }`}
            disabled={!isConnected || isProcessing || activeClarificationId !== null}
          />
            {/* Animated border overlay for focused state */}
            {isConnected && currentInstruction.trim() && (
              <div className={`absolute inset-0 rounded-lg border border-transparent pointer-events-none ${isManualInterventionRequired
                ? 'bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20'
                : 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20'
                }`}>
                <div
                  className={`absolute inset-0 rounded-lg border border-transparent ${isManualInterventionRequired
                    ? 'bg-gradient-to-r from-red-400/30 via-orange-400/30 to-red-400/30'
                    : 'bg-gradient-to-r from-blue-400/30 via-purple-400/30 to-green-400/30'
                    }`}
                  style={{
                    animation: isManualInterventionRequired ? 'manualInterventionTextareaBorder 4s ease-in-out infinite' : 'textareaBorderMove 6s ease-in-out infinite',
                    opacity: 0.4
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="relative mt-2 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Press Ctrl+Enter, Cmd+Enter, or Alt+Enter to send
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSendInstruction}
              disabled={!isConnected || isProcessing || !currentInstruction.trim()}
              className={`relative px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition-all duration-300 overflow-hidden ${!isConnected || isProcessing || !currentInstruction.trim()
                  ? 'bg-gray-700 cursor-not-allowed'
                : isManualInterventionRequired
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-500/20 shadow-lg hover:shadow-red-400/30 hover:shadow-xl transform hover:scale-105'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-blue-500/20 shadow-lg hover:shadow-blue-400/30 hover:shadow-xl transform hover:scale-105'
                }`}
            >
              {/* Animated background for active button */}
              {isConnected && !isProcessing && currentInstruction.trim() && (
                <div className={`absolute inset-0 ${isManualInterventionRequired
                  ? 'bg-gradient-to-r from-red-400/20 via-orange-400/20 to-red-400/20'
                  : 'bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-400/20'
                  }`}>
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    style={{
                      animation: 'buttonShimmer 3s ease-in-out infinite',
                      transform: 'translateX(-100%)'
                    }}
                  />
                </div>
              )}

              <div className="relative flex items-center gap-2">
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing
                </>
              ) : (
                  <>
                    {isManualInterventionRequired ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                    {isManualInterventionRequired ? 'Continue Task' : 'Send Task'}
                  </>
              )}
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Connection Status */}
        <div className="relative mt-2 flex items-center text-sm">
          <div className={`w-2 h-2 rounded-full mr-2 transition-all duration-300 ${isConnected
            ? 'bg-green-500 shadow-green-400/50 shadow-lg animate-pulse'
            : 'bg-red-500 shadow-red-400/50 shadow-lg animate-pulse'
            }`} />
          <span className={`transition-all duration-300 ${isConnected
            ? 'text-green-400'
            : 'text-red-400'
            }`}>
            {isConnected
              ? 'Connected'
              : 'Disconnected'
            }
          </span>
          
          {/* Manual Intervention Status with enhanced styling */}
          {isManualInterventionRequired && (
            <>
              <div className="w-2 h-2  ml-4 mr-2 " />
              <span className="text-red-400 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Action Required in Browser
              </span>
            </>
          )}
        </div>

        {/* CSS animations */}
        <style>
          {`
            @keyframes waveMove {
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
            
            @keyframes inputAreaWave {
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
            
            @keyframes textareaBorderMove {
              0%, 100% {
                opacity: 0.3;
                transform: scale(1);
              }
              50% {
                opacity: 0.6;
                transform: scale(1.01);
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
            
            @keyframes messageCardWave {
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
            
            @keyframes messageCardBorderMove {
              0%, 100% {
                opacity: 0.3;
                transform: scale(1);
              }
              50% {
                opacity: 0.7;
                transform: scale(1.005);
              }
            }
            
            @keyframes manualInterventionWave {
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
            
            @keyframes manualInterventionBorderMove {
              0%, 100% {
                opacity: 0.4;
                transform: scale(1);
              }
              50% {
                opacity: 0.8;
                transform: scale(1.01);
              }
            }
            
            @keyframes manualInterventionInputWave {
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
            
            @keyframes manualInterventionTextareaBorder {
              0%, 100% {
                opacity: 0.3;
                transform: scale(1);
              }
              50% {
                opacity: 0.7;
                transform: scale(1.02);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default InstructionPanel; 