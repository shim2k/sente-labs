import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Message type definitions
interface InstructionMessage {
  id: string;
  text: string;
}

interface ResponseMessage {
  id: string;
  status: 'success' | 'error' | 'timeout' | 'manual_intervention' | 'manual_intervention_required' | 'needs_clarification';
  executed?: string[];
  error?: string;
  actions?: any[];
  currentUrl?: string;
  pageTitle?: string;
  manualIntervention?: {
    reasoning: string;
    suggestion: string;
    currentUrl: string;
    timestamp: number;
  };
  manualInterventionRequest?: {
    reasoning: string;
    reason: string;
    suggestion: string;
    currentUrl: string;
    timestamp: number;
  };
  clarificationRequest?: {
    confidenceScore: number;
    reasoning: string;
    message: string;
    suggestedQuestions?: string[];
    timestamp: number;
  };
}

interface OutputItem {
  id: string;
  title?: string;
  content: string;
  timestamp: number;
  type?: string;
  url?: string;
  action?: string;
  result?: string;
}

interface LogItem {
  id?: string;
  type: 'system' | 'agent' | 'action' | 'error' | 'llm';
  message: string;
  timestamp: number;
  rawData?: any;
}

export interface ScreenshotData {
  width: number;
  height: number;
  imageData: ArrayBuffer;
}

interface StreamingInfo {
  mode: string;
  fps?: number;
  quality?: number;
}

interface SessionContextType {
  logs: LogItem[];
  messages: any[];
  setMessages: (messages: any[]) => void;
  sendInstruction: (instruction: string) => void;
  sendClarification: (instructionId: string, clarificationText: string, originalInstruction: string) => void;
  sendMouseAction: (actionType: string, x: number, y: number, button?: string, clickCount?: number, deltaX?: number, deltaY?: number) => Promise<void>;
  sendKeyboardAction: (actionType: string, key?: string, text?: string, modifiers?: string[]) => Promise<void>;
  markTaskCompleted: () => void;
  stopCurrentInstruction: (instructionId: string) => Promise<void>;
  markInstructionComplete: (instructionId: string) => Promise<void>;
  isConnected: boolean;
  isProcessingInstruction: boolean;
  screenshotUrl: string | null;
  currentUrl: string;
  pageTitle: string;
  outputItems: any[];
  isManualInterventionRequired: boolean;
  manualInterventionDetails: {
    reasoning: string;
    suggestion: string;
    currentUrl: string;
    timestamp: number;
  } | null;
  dismissManualIntervention: () => Promise<void>;
  streamingInfo: StreamingInfo | null;
}

// Create context with default values
const SessionContext = createContext<SessionContextType>({
  logs: [],
  messages: [],
  setMessages: () => {},
  sendInstruction: () => {},
  sendClarification: () => {},
  sendMouseAction: async () => {},
  sendKeyboardAction: async () => {},
  markTaskCompleted: () => {},
  stopCurrentInstruction: async () => {},
  markInstructionComplete: async () => {},
  isConnected: false,
  isProcessingInstruction: false,
  screenshotUrl: null,
  currentUrl: '',
  pageTitle: '',
  outputItems: [],
  isManualInterventionRequired: false,
  manualInterventionDetails: null,
  dismissManualIntervention: async () => {},
  streamingInfo: null,
});

// API & WebSocket endpoints - will adapt depending on environment
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production'
    ? window.location.origin
    : 'http://localhost:3001'); // API Gateway is on port 3001

console.log('Debug URLs:', { API_BASE_URL });

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, getToken, user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [screenshotWs, setScreenshotWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessingInstruction, setIsProcessingInstruction] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');
  const [outputItems, setOutputItems] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [evtSource, setEvtSource] = useState<EventSource | null>(null);
  
  // Manual intervention state
  const [isManualInterventionRequired, setIsManualInterventionRequired] = useState<boolean>(false);
  const [manualInterventionDetails, setManualInterventionDetails] = useState<{
    reasoning: string;
    suggestion: string;
    currentUrl: string;
    timestamp: number;
  } | null>(null);
  
  // Streaming info state
  const [streamingInfo, setStreamingInfo] = useState<StreamingInfo | null>(null);
  
  // Refs to track current WebSocket state to avoid dependency issues in useEffect
  const screenshotWsRef = useRef<WebSocket | null>(null);
  
  // Refs to track current URL and pageTitle to prevent flickering
  const currentUrlRef = useRef<string>('');
  const pageTitleRef = useRef<string>('');
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  useEffect(() => {
    screenshotWsRef.current = screenshotWs;
  }, [screenshotWs]);
  
  // Update URL and pageTitle refs when they change
  useEffect(() => {
    currentUrlRef.current = currentUrl;
  }, [currentUrl]);
  
  useEffect(() => {
    pageTitleRef.current = pageTitle;
  }, [pageTitle]);
  
  // Optimized URL update function using useCallback with debounce
  const updateUrlAndTitle = useCallback((newUrl: string, newTitle?: string) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce the update to prevent rapid successive changes
    updateTimeoutRef.current = setTimeout(() => {
      if (newUrl && newUrl !== 'about:blank' && newUrl !== currentUrlRef.current) {
        setCurrentUrl(newUrl);
      }
      if (newTitle && newTitle !== pageTitleRef.current) {
        setPageTitle(newTitle);
      }
    }, 50); // 50ms debounce
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Monitor logs for manual intervention requests
  useEffect(() => {
    // Look for the most recent manual intervention log
    const manualInterventionLog = logs
      .filter(log => log.message && log.message.includes('🚨 Manual intervention requested'))
      .sort((a, b) => b.timestamp - a.timestamp)[0]; // Get the most recent one

    if (manualInterventionLog && manualInterventionLog.rawData) {
      const rawData = manualInterventionLog.rawData;
      
      // Check if this is a new manual intervention (not already shown)
      const isNewIntervention = !manualInterventionDetails || 
        manualInterventionLog.timestamp > manualInterventionDetails.timestamp;
      
      if (isNewIntervention) {
        setIsManualInterventionRequired(true);
        setManualInterventionDetails({
          reasoning: rawData.reasoning || 'Manual intervention needed',
          suggestion: rawData.suggestion || 'Please take manual action',
          currentUrl: rawData.currentUrl || 'Unknown URL',
          timestamp: manualInterventionLog.timestamp
        });
      }
    }
  }, [logs, manualInterventionDetails]);

  // Monitor messages for URL and page title updates from agent responses
  useEffect(() => {
    // Get the most recent message with URL data
    const messagesWithUrl = messages
      .filter(msg => msg.currentUrl && msg.currentUrl !== 'about:blank')
      .sort((a, b) => b.timestamp || 0 - (a.timestamp || 0));

    if (messagesWithUrl.length > 0) {
      const latestMessage = messagesWithUrl[0];
      updateUrlAndTitle(latestMessage.currentUrl, latestMessage.pageTitle);
    }
    
    // Also check manual intervention details for URL (fallback)
    if (manualInterventionDetails?.currentUrl && 
        manualInterventionDetails.currentUrl !== currentUrlRef.current &&
        manualInterventionDetails.currentUrl !== 'Unknown URL') {
      updateUrlAndTitle(manualInterventionDetails.currentUrl);
    }
  }, [messages, manualInterventionDetails, updateUrlAndTitle]);

  // Create a session when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      createSession();
    }
    
    return () => {
      // Clean up connections on unmount
      closeConnections();
    };
  }, [isAuthenticated]);

  // Function to create an authenticated session
  const createSession = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping session creation');
      return;
    }
    
    try {
      // Get authentication token
      console.log('🔐 [Session] Getting authentication token...');
      const token = await getToken();
      
      if (!token) {
        console.error('❌ [Session] Failed to get authentication token');
        return;
      }
      
      console.log('✅ [Session] Token acquired, creating session...');
      
      // Get actual user ID from Auth0 user object
      const userId = user?.sub;
      
      if (!userId) {
        console.error('❌ [Session] No user ID available from authentication');
        return;
      }
      
      console.log('👤 [Session] User ID:', userId);
      console.log('🌐 [Session] Creating session at:', `${API_BASE_URL}/api/session`);
      
      // Create or get existing session via API Gateway (handles auth and spawns agent)
      const response = await axios.post(
        `${API_BASE_URL}/api/session`,
        { userId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Extract session info including WebSocket URL
      const { sessionId, wsUrl, httpUrl, status } = response.data;
      console.log(`✅ [Session] Session created with ID: ${sessionId}`);
      console.log(`🔌 [Session] Agent WebSocket URL: ${wsUrl}`);
      console.log(`🌐 [Session] Agent HTTP URL: ${httpUrl}`);
      console.log(`📊 [Session] Agent Status: ${status}`);
      
      setSessionId(sessionId);
      
      // Connect WebSockets with the session ID and dynamic WebSocket URL
      console.log('🔌 [Session] Connecting WebSockets...');
      connectWebSockets(sessionId, token, wsUrl);
      
      // Connect to log stream (directly to agent instance)
      console.log('📊 [Session] Connecting to log stream...');
      connectToLogStream(sessionId, token, httpUrl);
    } catch (error) {
      console.error('💥 [Session] Error creating session:', error);
    }
  };

  // Clean up all connections
  const closeConnections = () => {
    if (screenshotWsRef.current) {
      screenshotWsRef.current.close();
    }
    
    if (evtSource) {
      evtSource.close();
    }
  };

  // Connect to WebSockets with authentication
  const connectWebSockets = (sessionId: string, token: string, wsUrl: string) => {
    // Connection state
    let screenshotReconnectTimer: NodeJS.Timeout | null = null;
    const MAX_RECONNECT_DELAY = 5000;
    const INITIAL_RECONNECT_DELAY = 300;
    
    // Helper to check connection status - only screenshot WebSocket matters
    function updateConnectionStatus() {
      const screenshotConnected = screenshotWsRef.current?.readyState === WebSocket.OPEN;
      setIsConnected(screenshotConnected);
    }

    // Connect to screenshot WebSocket - used for receiving screenshots and sending instructions
    function connectScreenshotWs() {
      if (screenshotWsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }
      
      // Clear any existing reconnection timer
      if (screenshotReconnectTimer) {
        clearTimeout(screenshotReconnectTimer);
        screenshotReconnectTimer = null;
      }
      
      try {
        console.log('🔌 [WebSocket] Connecting to Agent WebSocket...');
        console.log('🔌 [WebSocket] Dynamic wsUrl:', wsUrl);
        console.log('🔌 [WebSocket] sessionId:', sessionId);
        
        // Connect directly to the agent instance WebSocket
        const screenshotConnection = new WebSocket(wsUrl);
        
        screenshotConnection.onopen = () => {
          console.log('✅ [WebSocket] Agent WebSocket connected successfully!');
          setScreenshotWs(screenshotConnection);
          screenshotWsRef.current = screenshotConnection;
          updateConnectionStatus();
        };

        screenshotConnection.onclose = (event) => {
          console.log(`❌ [WebSocket] Agent WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
          setScreenshotWs(null);
          screenshotWsRef.current = null;
          updateConnectionStatus();
          
          // Schedule reconnection attempt
          const delay = Math.min(INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
          console.log(`🔄 [WebSocket] Reconnecting to Agent WebSocket in ${delay}ms...`);
          screenshotReconnectTimer = setTimeout(connectScreenshotWs, delay);
        };
        
        screenshotConnection.onerror = (error) => {
          console.error('💥 [WebSocket] Agent WebSocket error:', error);
        };

        screenshotConnection.onmessage = (event) => {
          if (event.data instanceof Blob) {
            // Handle binary frame data (both CDP frames and legacy screenshots)
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result as ArrayBuffer;
              const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
              
              // Clean up previous URL
              if (screenshotUrl) {
                URL.revokeObjectURL(screenshotUrl);
              }
              
                setScreenshotUrl(url);
            };
            reader.readAsArrayBuffer(event.data);
          } else if (typeof event.data === 'string') {
            try {
              const message = JSON.parse(event.data);
              
              // Handle CDP frame metadata
              if (message.type === 'cdp_frame') {
                // Frame metadata received, binary data will follow
                console.log('📸 [CDP] Frame metadata received:', message);
                // The actual frame data will be processed by the binary handler above
                return;
              }
              
              // Handle DOM updates for smooth interactions
              if (message.type === 'dom_update') {
                console.log('🔄 [DOM] Page updated');
                // Trigger a small UI update to indicate page activity
                setCurrentUrl(prev => prev); // Trigger re-render
                return;
              }
              
              // Handle page lifecycle events
              if (message.type === 'lifecycle') {
                console.log('📄 [Lifecycle]', message.name);
                if (message.name === 'load' || message.name === 'DOMContentLoaded') {
                  // Page finished loading, ensure we have latest state
                  // The frame stream will automatically provide the updated view
                }
                return;
              }
              
              // Handle streaming info updates
              if (message.type === 'streaming_info') {
                console.log('📊 [Streaming] Info received:', message.info);
                setStreamingInfo(message.info);
                return;
              }
              
              // Handle other WebSocket messages (logs, status updates, etc.)
              if (message.type === 'log') {
                console.log('📋 [WebSocket] Received log:', message.log);
                const logEntry = {
                  ...message.log,
                  // Keep the original timestamp from the log, don't override it
                  rawData: message.log.data
                };
                console.log('📋 [WebSocket] Processed log entry:', logEntry);
                setLogs(prevLogs => [...prevLogs, logEntry]);
                return;
              }
              
              // Handle status updates
              if (message.sessionId && message.type === 'connected') {
                setSessionId(message.sessionId);
                setIsConnected(true);
                console.log('✅ [WebSocket] Connected to session:', message.sessionId);
                return;
              }
              
              // Handle instruction responses and other message types
              if (message.type === 'instruction_response') {
                handleInstructionResponse(message.response);
              } else if (message.type === 'output') {
                // Handle output messages
                setOutputItems(prev => [...prev, message.output]);
              } else if (message.type === 'error') {
                console.error('📨 [WebSocket] Server error:', message.error);
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          }
        };
      } catch (error) {
        console.error('Error connecting to Agent WebSocket:', error);
        // Schedule reconnection attempt
        const delay = Math.min(INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
        screenshotReconnectTimer = setTimeout(connectScreenshotWs, delay);
      }
    }

    // Start WebSocket connection
    connectScreenshotWs();
  };

  // Send command via WebSocket
  const sendWebSocketCommand = (command: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!screenshotWsRef.current || screenshotWsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      console.log('📤 [WebSocket] Sending command:', command);
      screenshotWsRef.current.send(JSON.stringify(command));
      resolve({ sent: true });
    });
  };

  // Connect to log stream for monitoring
  const connectToLogStream = (sessionId: string, token: string, httpUrl: string) => {
    // DISABLED: SSE log streaming is redundant since we get logs via WebSocket
    // This was causing duplicate log entries in the UI
    console.log('SSE log stream disabled - using WebSocket logs only');
    
    // Close any existing event source if it exists
    if (evtSource) {
      evtSource.close();
      setEvtSource(null);
    }
    
    return;
  };

  // Send an instruction to the agent
  const sendInstruction = async (instructionText: string) => {
    if (!isConnected || isProcessingInstruction || !sessionId) {
      return;
    }
    
    try {
      setIsProcessingInstruction(true);
      
      // Generate a unique ID for this instruction
      const instructionId = uuidv4();
      
      // Create a new instruction message
      const instruction: InstructionMessage = {
        id: instructionId,
        text: instructionText
      };
      
      // Add to messages with loading state
      setMessages(prev => [...prev, { ...instruction, type: 'instruction', loading: true }]);
      
      // Note: Rich output items are now generated by the agent
      // No need to create basic "instruction start" items here
      
      console.log('Sending instruction via WebSocket:', instructionText);
      
      // Send the instruction via WebSocket
      const message = {
        type: 'instruction',
        data: {
          id: instructionId,
          text: instructionText
        }
      };

      await sendWebSocketCommand(message);
      
    } catch (error) {
      console.error('Error sending instruction:', error);
      setIsProcessingInstruction(false);
      
      // Update messages with error
      setMessages(prev => 
        prev.map(msg => 
          msg.loading 
            ? { ...msg, loading: false, status: 'error', error: 'Failed to send instruction' }
            : msg
        )
      );
    }
  };

  // Helper function to handle instruction response
  const handleInstructionResponse = (response: ResponseMessage) => {
    console.log("Instruction response received:", response);
    setIsProcessingInstruction(false);
    
    // Update the message with the response
    setMessages(prev => 
      prev.map(msg => 
        msg.id === response.id
          ? { ...msg, loading: false, ...response }
          : msg
      )
    );
    
    // Note: Rich output items are now generated by the agent via addOutput actions
    // No need to create basic output items here since the agent provides detailed reports
    
    // Handle clarification request
    if (response.status === 'needs_clarification' && response.clarificationRequest) {
      console.log('Clarification requested:', response.clarificationRequest);
      
      // Add a clarification message to the messages list
      const clarificationMessage = {
        id: response.id + '-clarification',
        type: 'clarification',
        text: response.clarificationRequest.message,
        clarificationData: {
          confidenceScore: response.clarificationRequest.confidenceScore,
          reasoning: response.clarificationRequest.reasoning,
          suggestedQuestions: response.clarificationRequest.suggestedQuestions,
          originalInstruction: messages.find(m => m.id === response.id)?.text || ''
        }
      };
      
      setMessages(prev => [...prev, clarificationMessage]);
    }
    
    // Handle manual intervention (support both status values)
    if ((response.status === 'manual_intervention' || response.status === 'manual_intervention_required') && 
        (response.manualIntervention || response.manualInterventionRequest)) {
      
      setIsManualInterventionRequired(true);
      
      // Handle different response formats
      if (response.manualIntervention) {
        // Legacy format
        setManualInterventionDetails(response.manualIntervention);
        
        const manualInterventionMessage = {
          id: `manual_intervention_${response.manualIntervention.timestamp}`,
          type: 'manual_intervention' as const,
          text: response.manualIntervention.suggestion,
          manualInterventionData: response.manualIntervention,
          status: 'pending' as const,
          timestamp: response.manualIntervention.timestamp
        };
        
        setMessages(prev => [...prev, manualInterventionMessage]);
      } else if (response.manualInterventionRequest) {
        // New format
        setManualInterventionDetails({
          reasoning: response.manualInterventionRequest.reason || response.manualInterventionRequest.reasoning,
          suggestion: response.manualInterventionRequest.suggestion,
          currentUrl: response.manualInterventionRequest.currentUrl || response.currentUrl || 'Unknown URL',
          timestamp: response.manualInterventionRequest.timestamp || Date.now()
        });
        
        const manualInterventionMessage = {
          id: `manual_intervention_${response.manualInterventionRequest.timestamp || Date.now()}`,
          type: 'manual_intervention' as const,
          text: response.manualInterventionRequest.suggestion,
          manualInterventionData: response.manualInterventionRequest,
          status: 'pending' as const,
          timestamp: response.manualInterventionRequest.timestamp || Date.now()
        };
        
        setMessages(prev => [...prev, manualInterventionMessage]);
      }
      
      // The agent will automatically enable manual intervention mode
      console.log('Manual intervention mode should be enabled on agent side');
    }
  };

  // Send clarification response
  const sendClarification = async (instructionId: string, clarificationText: string, originalInstruction: string) => {
    if (!isConnected || isProcessingInstruction || !sessionId) {
      return;
    }
    
    try {
      setIsProcessingInstruction(true);
      
      console.log('Sending clarification via WebSocket:', { instructionId, clarificationText, originalInstruction });
      
      // Send the clarification via WebSocket
      const message = {
        type: 'clarification_response',
        data: {
          instructionId,
          clarificationText,
          originalInstruction
        }
      };

      await sendWebSocketCommand(message);
      
      // Add the clarification response to messages
      const clarificationResponseMsg = {
        id: instructionId,
        type: 'instruction',
        text: clarificationText,
        loading: true
      };
      
      setMessages(prev => [...prev, clarificationResponseMsg]);
      
    } catch (error) {
      console.error('Error sending clarification:', error);
      setIsProcessingInstruction(false);
    }
  };

  // Helper function to handle command response (legacy)
  const handleCommandResponse = (response: any) => {
    console.log("Command response received:", response);
    
    // Handle the new WebSocket response format
    if (response.type === 'command_response') {
      setIsProcessingInstruction(false);
      
      if (response.success) {
        console.log("WebSocket command successful:", response.message);
        
        // For agent commands, we might need to process steps differently
        // Since the new format doesn't include the same action structure
        // we'll mark the message as successful
        setMessages(prev => 
          prev.map(msg => 
            msg.loading 
              ? { ...msg, loading: false, status: 'success' }
              : msg
          )
        );
        
        // If there are steps in the data, we could process them here
        if (response.data?.steps) {
          console.log('Agent execution steps:', response.data.steps);
        }
        
      } else {
        console.error("WebSocket command failed:", response.error);
        
        // Update messages with error
        setMessages(prev => 
          prev.map(msg => 
            msg.loading 
              ? { ...msg, loading: false, status: 'error', error: response.error || 'Command failed' }
              : msg
          )
        );
      }
      
      return; // Exit early for WebSocket responses
    }
    
    // Keep the legacy handling for backward compatibility
    // Add explicit handling for all possible response formats
    if (response.success && response.result) {
      // This is the format we're seeing in the example
      console.log("Direct success response format detected");
      setIsProcessingInstruction(false);
      
      const result = response.result;
      
      // Process actions if available
      if (result.actions && Array.isArray(result.actions)) {
        console.log('Processing actions:', result.actions);
        
        // Process any addOutput actions
        result.actions.forEach((action: any) => {
          if (action.type === 'addOutput' && action.params) {
            // Create a new output item
            const outputItem: OutputItem = {
              id: uuidv4(),
              title: action.params.title || 'Agent Output',
              content: action.params.content || '',
              timestamp: Date.now(),
              type: 'agent'
            };
            
            // Add to output items
            setOutputItems(prev => [...prev, outputItem]);
          }
        });
        
        // Check if any of the actions is a "complete" action
        const hasCompleteAction = result.actions.some(
          (action: any) => action.type === 'complete'
        );
        
        if (hasCompleteAction) {
          console.log('Task completed successfully - updating UI');
          setIsProcessingInstruction(false);
          
          // Find the loading message and mark it as complete
          setMessages(prev => 
            prev.map(msg => 
              msg.loading 
                ? { ...msg, loading: false, status: 'success' }
                : msg
            )
          );
        }
      }
    }
    // Check if we have the commandId format that was in our original handler
    else if (response.commandId && response.data) {
      console.log("CommandId format response detected");
      setIsProcessingInstruction(false);
      
      // Extract the result
      const result = response.data;
      
      // Process result similar to above
      if (result.success && result.actions) {
        console.log('Agent actions:', result.actions);
        
        // Process any addOutput actions
        result.actions.forEach((action: any) => {
          if (action.type === 'addOutput' && action.params) {
            // Create a new output item
            const outputItem: OutputItem = {
              id: uuidv4(),
              title: action.params.title || 'Agent Output',
              content: action.params.content || '',
              timestamp: Date.now(),
              type: 'agent'
            };
            
            // Add to output items
            setOutputItems(prev => [...prev, outputItem]);
          }
        });
        
        // Check if any of the actions is a "complete" action
        const hasCompleteAction = result.actions.some(
          (action: any) => action.type === 'complete'
        );
        
        if (hasCompleteAction) {
          console.log('Task completed successfully');
          setIsProcessingInstruction(false);
          
          // Find the loading message and mark it as complete
          setMessages(prev => 
            prev.map(msg => 
              msg.loading 
                ? { ...msg, loading: false, status: 'success' }
                : msg
            )
          );
        }
      }
    } else {
      // For any other format, make sure we turn off processing
      console.log("Unknown response format - turning off processing state");
      setIsProcessingInstruction(false);
      
      // Mark any loading messages as complete anyway
      setMessages(prev => 
        prev.map(msg => 
          msg.loading 
            ? { ...msg, loading: false, status: 'success' }
            : msg
        )
      );
    }
  };

  // Mark the current task as completed
  const markTaskCompleted = async () => {
    if (!isConnected || !sessionId) {
      return;
    }
    
    try {
      console.log('Marking task as completed via WebSocket');
      
      // Send the command via WebSocket instead of HTTP
      const command = {
        command: 'complete_task'
      };

      await sendWebSocketCommand(command);
      
      console.log('Task marked as completed');
    } catch (error) {
      console.error('Error marking task as completed:', error);
    }
  };

  // Send mouse action for manual control
  const sendMouseAction = async (
    actionType: string, 
    x: number, 
    y: number, 
    button: string = 'left', 
    clickCount: number = 1,
    deltaX: number = 0,
    deltaY: number = 0
  ) => {
    if (!isConnected || !sessionId) {
      console.error('Cannot send mouse action: not connected or no session');
      return;
    }

    try {
      // Handle mouse position updates separately
      if (actionType === 'mouse_position') {
        const message = {
          type: 'mouse_position',
          data: { x, y }
        };
        await sendWebSocketCommand(message);
        return;
      }
      
      // Map UI action types to backend action types
      let backendActionType: 'click' | 'move' | 'scroll' | 'drag';
      
      switch (actionType) {
        case 'mouse_click':
        case 'click':
          backendActionType = 'click';
          break;
        case 'mouse_move':
        case 'move':
          backendActionType = 'move';
          break;
        case 'scroll':
          backendActionType = 'scroll';
          break;
        case 'drag':
        case 'mouse_drag':
          backendActionType = 'drag';
          break;
        default:
          // For mouse_down, mouse_up, etc., we'll use move for now
          backendActionType = 'move';
      }
      
      console.log('Sending mouse action:', { actionType: backendActionType, x, y, button, clickCount, deltaX, deltaY });
      
      // Send mouse action via WebSocket
      const message = {
        type: 'mouse_action',
        data: {
          actionType: backendActionType,
          x,
          y,
          button,
          clickCount,
          deltaX,
          deltaY
        }
      };

      await sendWebSocketCommand(message);
      
    } catch (error) {
      console.error('Error sending mouse action:', error);
    }
  };

  // Send keyboard action for manual control
  const sendKeyboardAction = async (
    actionType: string, 
    key?: string, 
    text?: string, 
    modifiers?: string[]
  ) => {
    if (!isConnected || !sessionId) {
      console.error('Cannot send keyboard action: not connected or no session');
      return;
    }

    try {
      console.log('Sending keyboard action:', { actionType, key, text, modifiers });
      
      // Send keyboard action via WebSocket
      const message = {
        type: 'keyboard_action',
        data: {
          actionType,
          key,
          text,
          modifiers
        }
      };

      await sendWebSocketCommand(message);
      
    } catch (error) {
      console.error('Error sending keyboard action:', error);
    }
  };

  // Dismiss manual intervention notification
  const dismissManualIntervention = async () => {
    console.log('Dismissing manual intervention notification');
    
    // Always clear the local state first
    setIsManualInterventionRequired(false);
    setManualInterventionDetails(null);
    
    // Update any manual intervention messages to show as completed
    setMessages(prev => 
      prev.map(msg => 
        msg.type === 'manual_intervention' && msg.status !== 'success'
          ? { ...msg, status: 'success' as const }
          : msg
      )
    );
    
    // Update any manual intervention output items to show as completed
    setOutputItems(prev => 
      prev.map(item => 
        item.type === 'manual_intervention' && item.result === 'pending'
          ? { 
              ...item, 
              result: 'completed',
              content: item.content + '\n\n**Status:** ✅ Manual action completed by user',
              timestamp: Date.now() // Update timestamp to show when it was completed
            }
          : item
      )
    );
    
    // Try to notify the agent if connected
    if (isConnected && sessionId) {
      try {
        console.log('Notifying agent that manual intervention is complete');
        
        // First disable manual intervention mode
        await sendWebSocketCommand({
          type: 'disable_manual_intervention'
        });
        
        // Then send the command via WebSocket to notify agent that manual intervention is complete
        const command = {
          command: 'manual_intervention_complete'
        };

        await sendWebSocketCommand(command);
        
        console.log('Manual intervention completion sent to agent');
        
        // Add a log entry for the manual intervention completion
        const logItem: LogItem = {
          id: uuidv4(),
          type: 'action',
          message: 'Manual intervention marked as complete',
          timestamp: Date.now(),
          rawData: { command: 'manual_intervention_complete' }
        };
        
        setLogs(prev => [...prev, logItem]);
        
        // Add a completion output item
        const completionOutputItem: OutputItem = {
          id: `manual_intervention_completion_${Date.now()}`,
          title: 'Manual Intervention Completed',
          content: '**Manual intervention has been completed by the user.**\n\nThe agent can now continue with the task execution.',
          timestamp: Date.now(),
          type: 'manual_intervention_completion',
          action: 'manual_intervention_completed',
          result: 'success'
        };
        
        setOutputItems(prev => [...prev, completionOutputItem]);
        
      } catch (error) {
        console.error('Error notifying agent of manual intervention completion:', error);
        
        // Add error log
        const errorLogItem: LogItem = {
          id: uuidv4(),
          type: 'error',
          message: `Failed to notify agent of manual intervention completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        };
        
        setLogs(prev => [...prev, errorLogItem]);
      }
    } else {
      console.warn('Cannot notify agent of manual intervention completion: not connected or no session');
      
      // Add a log entry indicating local dismissal
      const logItem: LogItem = {
        id: uuidv4(),
        type: 'action',
        message: 'Manual intervention dismissed locally (agent not connected)',
        timestamp: Date.now(),
        rawData: { command: 'manual_intervention_dismissed_locally' }
      };
      
      setLogs(prev => [...prev, logItem]);
    }
  };

  // Stop the current instruction
  const stopCurrentInstruction = async (instructionId: string) => {
    if (!isConnected || !sessionId) {
      console.error('Cannot stop instruction: not connected or no session');
      return;
    }

    try {
      console.log('Stopping current instruction:', instructionId);
      
      // Send stop command via WebSocket
      const message = {
        type: 'stop_instruction',
        data: {
          instructionId
        }
      };

      await sendWebSocketCommand(message);
      
      // Update the message state to show it was stopped
      setMessages(prev => 
        prev.map(msg => 
          msg.id === instructionId && msg.loading
            ? { ...msg, loading: false, status: 'stopped', error: 'Instruction stopped by user' }
            : msg
        )
      );
      
      // Stop processing state
      setIsProcessingInstruction(false);
      
      console.log('Instruction stop signal sent');
    } catch (error) {
      console.error('Error stopping instruction:', error);
    }
  };

  // Mark instruction as complete while agent is still processing
  const markInstructionComplete = async (instructionId: string) => {
    if (!isConnected || !sessionId) {
      console.error('Cannot mark instruction complete: not connected or no session');
      return;
    }

    try {
      console.log('Marking instruction as complete:', instructionId);
      
      // Send complete command via WebSocket
      const message = {
        type: 'mark_instruction_complete',
        data: {
          instructionId
        }
      };

      await sendWebSocketCommand(message);
      
      // Update the message state to show it was completed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === instructionId && msg.loading
            ? { ...msg, loading: false, status: 'success', manuallyCompleted: true }
            : msg
        )
      );
      
      // Stop processing state
      setIsProcessingInstruction(false);
      
      console.log('Instruction marked as complete');
    } catch (error) {
      console.error('Error marking instruction complete:', error);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        logs,
        messages,
        setMessages,
        sendInstruction,
        sendClarification,
        sendMouseAction,
        sendKeyboardAction,
        markTaskCompleted,
        stopCurrentInstruction,
        markInstructionComplete,
        isConnected,
        isProcessingInstruction,
        screenshotUrl,
        currentUrl,
        pageTitle,
        outputItems,
        isManualInterventionRequired,
        manualInterventionDetails,
        dismissManualIntervention,
        streamingInfo,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext); 