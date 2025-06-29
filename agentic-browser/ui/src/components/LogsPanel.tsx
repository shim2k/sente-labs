import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';

// Recursive component to render JSON as a table
const JsonTable: React.FC<{ data: any, level?: number }> = ({ data, level = 0 }) => {
  if (!data || typeof data !== 'object') {
    return <span className="text-gray-400">No valid data</span>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return (
      <div className="ml-3">
        {data.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex">
              <span className="text-blue-400 min-w-[60px]">[{index}]</span>
              {typeof item === 'object' && item !== null ? (
                <JsonTable data={item} level={level + 1} />
              ) : (
                <pre className="text-gray-200 m-0 whitespace-pre-wrap font-mono text-xs" style={{ wordBreak: 'break-word' }}>{String(item)}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Handle objects
  return (
    <div className={level > 0 ? "ml-3" : ""} style={{ wordBreak: 'break-word' }}>
      {Object.entries(data).map(([key, value], index) => (
        <div key={key} className="mb-1">
          <div className="flex">
            <span className="text-blue-400 min-w-[60px] truncate">{key}:</span>
            {typeof value === 'object' && value !== null ? (
              <JsonTable data={value} level={level + 1} />
            ) : (
              <pre className="text-gray-200 m-0 whitespace-pre-wrap font-mono text-xs" style={{ wordBreak: 'break-word' }}>{String(value)}</pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const LogsPanel: React.FC = () => {
  const { isConnected, logs } = useSession();
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [textMode, setTextMode] = useState<boolean>(false);
  const [showRawData, setShowRawData] = useState<Record<string, boolean>>({});
  const [showTableView, setShowTableView] = useState<Record<string, boolean>>({});
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [clearTimestamp, setClearTimestamp] = useState<number>(0);
  const [justCleared, setJustCleared] = useState<boolean>(false);
  
  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      const container = document.getElementById('logs-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [logs, autoScroll]);
  
  // Filter logs based on selection and clear timestamp
  const filteredLogs = logs
    .filter(log => log.timestamp > clearTimestamp) // Hide logs older than clear point
    .filter(log => filter === 'all' || log.type === filter); // Apply type filter
  
  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Toggle log expansion
  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };
  
  // Toggle raw data view
  const toggleRawData = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation(); // Prevent triggering the parent's onClick
    setShowRawData(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
    // Disable table view when enabling raw view
    if (!showRawData[logId]) {
      setShowTableView(prev => ({
        ...prev,
        [logId]: false
      }));
    }
  };
  
  // Toggle table view
  const toggleTableView = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation(); // Prevent triggering the parent's onClick
    setShowTableView(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
    // Disable raw view when enabling table view
    if (!showTableView[logId]) {
      setShowRawData(prev => ({
        ...prev,
        [logId]: false
      }));
    }
  };
  
  // Get a preview of the message (first 50 characters)
  const getMessagePreview = (message: string) => {
    if (!message) return '';
    const trimmed = message.trim();
    if (trimmed.length <= 50) return trimmed;
    return trimmed.substring(0, 50) + '...';
  };
  
  // Check if data is valid JSON
  const isJsonObject = (data: any): boolean => {
    return data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
  };
  
  // Test connection to logs endpoint manually
  const testConnection = () => {
    // Extract base URL from the current location
    const baseUrl = window.location.hostname;
    const port = '4000'; // Assuming this is the server port
    const url = `http://${baseUrl}:${port}/monitor/events`;
    
    // Open the URL in a new tab to test
    window.open(url, '_blank');
  };
  
  // Format JSON for display
  const formatJson = (json: any): string => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return String(json);
    }
  };
  
  // Format logs as plain text for copy/paste
  const formatLogsAsText = (logs: any[]): string => {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const type = log.type.toUpperCase();
      const message = log.message || '';
      
      let text = `[${timestamp}] ${type}: ${message}`;
      
      // Add raw data if available, with special formatting for LLM prompts
      if (log.rawData) {
        // Special handling for LLM system and user prompts
        if (log.rawData.type === 'system_prompt') {
          text += '\n\n--- SYSTEM PROMPT ---\n';
          text += log.rawData.content || '';
          text += `\n--- END SYSTEM PROMPT (${log.rawData.characterCount} chars) ---`;
        } else if (log.rawData.type === 'user_prompt') {
          text += '\n\n--- USER PROMPT ---\n';
          text += log.rawData.content || '';
          text += `\n--- END USER PROMPT (${log.rawData.characterCount} chars) ---`;
        } else if (log.rawData.type === 'raw_response') {
          text += '\n\n--- LLM RESPONSE ---\n';
          text += formatJson(log.rawData.response);
          text += `\n--- END LLM RESPONSE (${log.rawData.requestDuration}) ---`;
        } else {
          // Regular raw data formatting
          text += '\n\n--- RAW DATA ---\n';
          text += formatJson(log.rawData);
          text += '\n--- END RAW DATA ---';
        }
      }
      
      return text;
    }).join('\n\n' + '='.repeat(120) + '\n\n');
  };
  
  // Clear logs function - hide logs up to current time
  const handleClearLogs = () => {
    setClearTimestamp(Date.now());
    setJustCleared(true);
    setTimeout(() => setJustCleared(false), 1000); // Show "Cleared!" for 1 second
  };
  
  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#101827' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200">Agent Logs</h2>
        <p className="text-sm text-gray-400">Real-time agent logs</p>
      </div>
      
      {/* Filters */}
      <div className="px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <div className="flex space-x-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded border border-gray-700 px-2 py-1"
          >
            <option value="all">All Logs</option>
            <option value="system">System</option>
            <option value="agent">Agent</option>
            <option value="action">Actions</option>
            <option value="error">Errors</option>
            <option value="llm">LLM</option>
          </select>
          
          <button 
            className="text-sm px-2 py-1 bg-gray-800 rounded border border-gray-700 text-gray-200 hover:bg-gray-700"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          
          <button 
            className={`text-sm px-2 py-1 rounded border border-gray-700 hover:bg-gray-700 ${
              textMode ? 'bg-blue-800 text-blue-200' : 'bg-gray-800 text-gray-200'
            }`}
            onClick={() => setTextMode(!textMode)}
          >
            {textMode ? 'Component View' : 'Text Mode'}
          </button>

          <button 
            className={`text-sm px-2 py-1 rounded border border-gray-700 transition-colors ${
              justCleared ? 'bg-green-700 text-green-200' : 'bg-gray-800 text-gray-200 hover:bg-red-700 hover:text-red-200'
            }`}
            onClick={handleClearLogs}
            disabled={justCleared}
          >
            {justCleared ? 'Cleared!' : 'Clear'}
          </button>
        </div>
        
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="auto-scroll" 
            checked={autoScroll}
            onChange={() => setAutoScroll(!autoScroll)}
            className="mr-2"
          />
          <label 
            htmlFor="auto-scroll" 
            className={`text-sm ${autoScroll ? 'text-green-400' : 'text-gray-400'}`}
          >
            Auto-scroll
          </label>
        </div>
      </div>
      
      {/* Debug info section */}
      {showDebug && (
        <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Connection Debug</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <p>WebSocket Status: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span></p>
            <p>Log Count: {logs.length}</p>
            <p>Filtered Count: {filteredLogs.length}</p>
          </div>
        </div>
      )}
      
      {/* Logs container */}
      <div 
        id="logs-container"
        className="flex-1 overflow-auto p-2"
      >
        {!isConnected ? (
          <div className="text-center text-gray-400 py-8">
            <p>Waiting for connection...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No logs available</p>
            {logs.length === 0 && (
              <p className="mt-2 text-sm">
                The logs endpoint might not be working correctly.<br/>
                Check console for connection errors.
              </p>
            )}
          </div>
        ) : textMode ? (
          // Text Mode - Plain text format for easy copy/paste
          <div className="bg-gray-900 rounded p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Text Mode - Easy Copy/Paste</h3>
              <button
                className="text-xs px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                onClick={async (event) => {
                  try {
                    const textContent = formatLogsAsText(filteredLogs);
                    await navigator.clipboard.writeText(textContent);
                    // Brief visual feedback
                    const button = event.currentTarget as HTMLButtonElement;
                    if (button) {
                      const originalText = button.textContent;
                      button.textContent = 'Copied!';
                      button.className = button.className.replace('bg-gray-700', 'bg-green-700');
                      setTimeout(() => {
                        button.textContent = originalText;
                        button.className = button.className.replace('bg-green-700', 'bg-gray-700');
                      }, 1000);
                    }
                  } catch (err) {
                    console.error('Failed to copy logs:', err);
                    // Fallback: select all text for manual copy
                    const pre = document.querySelector('#text-mode-content') as HTMLPreElement;
                    if (pre) {
                      const range = document.createRange();
                      range.selectNodeContents(pre);
                      const selection = window.getSelection();
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }
                  }
                }}
              >
                Copy All
              </button>
            </div>
            <pre id="text-mode-content" 
                 className="whitespace-pre-wrap text-xs font-mono text-gray-200 overflow-x-auto select-all" 
                 style={{ wordBreak: 'break-word', userSelect: 'all' }}>
              {formatLogsAsText(filteredLogs)}
            </pre>
          </div>
        ) : (
          // Component Mode - Original expandable components
          <div className="space-y-1">
            {filteredLogs.map((log, index) => {
              // Generate a stable ID if none exists
              const logId = log.id || `log_${index}_${log.timestamp}`;
              const isExpanded = expandedLogs[logId] || false;
              const showRaw = showRawData[logId] || false;
              const showTable = showTableView[logId] || false;
              
              // Choose style based on log type
              let logClass = "bg-gray-800 border-gray-700";
              
              if (log.type === 'system') {
                logClass = "bg-blue-900/30 border-blue-800";
              } else if (log.type === 'agent') {
                logClass = "bg-green-900/30 border-green-800";
              } else if (log.type === 'action') {
                logClass = "bg-gray-800 border-gray-700";
              } else if (log.type === 'error') {
                logClass = "bg-red-900/30 border-red-800";
              } else if (log.type === 'llm') {
                logClass = "bg-purple-900/30 border-purple-800";
              }
              
              // Determine if content exists
              const hasContent = Boolean(log.message && log.message.trim());
              
              // Check if raw data is JSON object
              const hasJsonData = isJsonObject(log.rawData);
              
              return (
                <div 
                  key={logId} 
                  className={`rounded text-sm border ${logClass} text-gray-200 transition-all`}
                >
                  {/* Header - always visible */}
                  <div 
                    className={`p-2 flex items-start justify-between ${hasContent ? 'cursor-pointer' : ''}`}
                    onClick={hasContent ? () => toggleExpand(logId) : undefined}
                  >
                    <div className="flex items-start">
                      <span className="text-xs text-gray-400 mr-2">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className="text-xs font-semibold uppercase mr-2">
                        {log.type}
                      </span>
                      <span className="text-xs text-gray-300">
                        {isExpanded ? '' : getMessagePreview(log.message || '')}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {log.rawData && (
                        <>
                          {hasJsonData && (
                            <button
                              className={`text-xs ${showTable ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'} focus:outline-none`}
                              onClick={(e) => toggleTableView(e, logId)}
                              title="View as table"
                            >
                              Table
                            </button>
                          )}
                          <button
                            className={`text-xs ${showRaw ? 'text-green-400' : 'text-blue-400 hover:text-blue-300'} focus:outline-none`}
                            onClick={(e) => toggleRawData(e, logId)}
                            title="View raw data"
                          >
                            Raw
                          </button>
                        </>
                      )}
                      {hasContent && (
                        <span className="text-xs text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Content - only visible when expanded */}
                  {isExpanded && hasContent && !showRaw && !showTable && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-700/50">
                      <pre className="whitespace-pre-wrap text-xs font-mono text-gray-200 overflow-x-auto" style={{ wordBreak: 'break-word' }}>
                        {log.message}
                      </pre>
                    </div>
                  )}
                  
                  {/* Table view - only visible when requested */}
                  {isExpanded && showTable && log.rawData && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-700/50 bg-gray-900/20">
                      <h4 className="text-xs font-semibold text-green-400 mb-2">Table View:</h4>
                      <div className="text-xs font-mono overflow-x-auto">
                        <JsonTable data={log.rawData} />
                      </div>
                    </div>
                  )}
                  
                  {/* Raw data - only visible when requested */}
                  {isExpanded && showRaw && log.rawData && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-700/50 bg-gray-900/30">
                      <h4 className="text-xs font-semibold text-blue-400 mb-1">Raw Data:</h4>
                      <pre className="whitespace-pre-wrap text-xs font-mono text-gray-400 overflow-x-auto" style={{ wordBreak: 'break-word' }}>
                        {formatJson(log.rawData)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPanel; 