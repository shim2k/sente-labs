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

// API & WebSocket endpoints - direct connection to agent
const AGENT_WS_URL = process.env.REACT_APP_AGENT_URL || 
  (process.env.NODE_ENV === 'production'
    ? `ws://${window.location.hostname}:4000`
    : 'ws://localhost:4000'); // Direct connection to agent

console.log('Debug URLs:', { AGENT_WS_URL });

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

  // Create a direct connection when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectDirectly();
    }
    
    return () => {
      // Clean up connections on unmount
      closeConnections();
    };
  }, [isAuthenticated]);

  // Function to connect directly to agent
  const connectDirectly = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping connection');
      return;
    }
    
    try {
      console.log('🔐 [Session] Connecting directly to agent...');
      
      // Generate a session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      setSessionId(newSessionId);
      
      console.log(`✅ [Session] Generated session ID: ${newSessionId}`);
      console.log(`🔌 [Session] Connecting to agent at: ${AGENT_WS_URL}`);
      
      // Connect directly to agent WebSocket
      connectToAgent(newSessionId);
      
    } catch (error) {
      console.error('💥 [Session] Error connecting to agent:', error);
    }
  };

  // Clean up all connections
  const closeConnections = () => {
    if (screenshotWsRef.current) {
      screenshotWsRef.current.close();
    }
  };

  // Connect directly to agent WebSocket
  const connectToAgent = (sessionId: string) => {
    // Connection state
    let reconnectTimer: NodeJS.Timeout | null = null;
    const MAX_RECONNECT_DELAY = 5000;
    const INITIAL_RECONNECT_DELAY = 300;
    
    // Connect to agent WebSocket
    function connectWs() {
      if (screenshotWsRef.current?.readyState === WebSocket.OPEN) {
        return; // Already connected
      }
      
      // Clear any existing reconnection timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      try {
        console.log('🔌 [WebSocket] Connecting to Agent...');
        console.log('🔌 [WebSocket] Agent URL:', AGENT_WS_URL);
        
        // Connect directly to the agent WebSocket
        const connection = new WebSocket(AGENT_WS_URL);
        
        connection.onopen = () => {
          console.log('✅ [WebSocket] Agent connected successfully!');
          setScreenshotWs(connection);
          screenshotWsRef.current = connection;
          setIsConnected(true);
        };

        connection.onclose = (event) => {
          console.log(`❌ [WebSocket] Agent disconnected (code: ${event.code}, reason: ${event.reason})`);
          setScreenshotWs(null);
          screenshotWsRef.current = null;
          setIsConnected(false);
          
          // Schedule reconnection attempt
          const delay = Math.min(INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
          console.log(`🔄 [WebSocket] Reconnecting to Agent in ${delay}ms...`);
          reconnectTimer = setTimeout(connectWs, delay);
        };
        
        connection.onerror = (error) => {
          console.error('💥 [WebSocket] Agent error:', error);
        };

        connection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📨 [WebSocket] Received message:', message.type);
            
            // Handle different message types from agent
            if (message.type === 'connection') {
              console.log('✅ [WebSocket] Connection confirmed:', message.payload);
              setSessionId(message.payload.sessionId);
            } else if (message.type === 'response') {
              console.log('📋 [WebSocket] Instruction response:', message.payload);
              handleAgentResponse(message.payload);
            } else if (message.type === 'agent_complete') {
              console.log('✅ [WebSocket] Agent completed task:', message.payload);
              handleAgentComplete(message.payload);
            } else if (message.type === 'manual_intervention') {
              console.log('🚨 [WebSocket] Manual intervention requested:', message.payload);
              handleManualIntervention(message.payload);
            } else if (message.type === 'manual_intervention_acknowledged') {
              console.log('✅ [WebSocket] Manual intervention acknowledged by agent:', message.payload);
            } else if (message.type === 'frame') {
              // Handle screenshot frames from agent
              console.log('📸 [WebSocket] Received frame data');
              handleFrameData(message.payload);
            } else {
              console.log('📨 [WebSocket] Other message type:', message.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error connecting to Agent:', error);
        // Schedule reconnection attempt
        const delay = Math.min(INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
        reconnectTimer = setTimeout(connectWs, delay);
      }
    }

    // Start WebSocket connection
    connectWs();
  };

  // Send command via WebSocket with agent format
  const sendWebSocketCommand = (type: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!screenshotWsRef.current || screenshotWsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const message = {
        type,
        payload,
        timestamp: new Date().toISOString()
      };

      console.log('📤 [WebSocket] Sending command:', message);
      screenshotWsRef.current.send(JSON.stringify(message));
      resolve({ sent: true });
    });
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
      
      console.log('Sending instruction to agent:', instructionText);
      
      // Send the instruction via WebSocket using agent format
      await sendWebSocketCommand('instruction', {
        id: instructionId,
        text: instructionText,
        sessionId
      });
      
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

  // Helper function to handle agent response
  const handleAgentResponse = (payload: any) => {
    console.log("Agent response received:", payload);
    setIsProcessingInstruction(false);
    
    // Update the message with the response
    setMessages(prev => 
      prev.map(msg => 
        msg.loading
          ? { ...msg, loading: false, status: 'success', response: payload }
          : msg
      )
    );
  };

  // Helper function to handle agent completion
  const handleAgentComplete = (payload: any) => {
    console.log("Agent task completed:", payload);
    setIsProcessingInstruction(false);
    
    // Update the message with completion status
    setMessages(prev => 
      prev.map(msg => 
        msg.loading
          ? { 
              ...msg, 
              loading: false, 
              status: 'success', 
              response: payload,
              text: payload.answer || payload.message || msg.text,
              completed: true
            }
          : msg
      )
    );
  };

  // Helper function to handle manual intervention request from agent
  const handleManualIntervention = (payload: any) => {
    console.log("Manual intervention requested by agent:", payload);
    
    // Set manual intervention state
    setIsManualInterventionRequired(true);
    setManualInterventionDetails({
      reasoning: payload.reasoning || 'Manual intervention needed',
      suggestion: payload.suggestion || 'Please take manual action',
      currentUrl: payload.currentUrl || 'Unknown URL',
      timestamp: payload.timestamp || Date.now()
    });

    // Add manual intervention message to the conversation
    const manualInterventionMessage = {
      id: `manual_intervention_${payload.timestamp || Date.now()}`,
      type: 'manual_intervention' as const,
      text: payload.suggestion || 'Manual intervention required',
      manualInterventionData: payload,
      status: 'pending' as const,
      timestamp: payload.timestamp || Date.now()
    };
    
    setMessages(prev => [...prev, manualInterventionMessage]);
  };

  // Helper function to handle frame data from agent
  const handleFrameData = (payload: any) => {
    try {
      if (payload.data) {
        // Convert base64 frame data to blob URL
        const binaryString = atob(payload.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        // Clean up previous URL
        if (screenshotUrl) {
          URL.revokeObjectURL(screenshotUrl);
        }
        
        setScreenshotUrl(url);
        console.log('📸 [Frame] Screenshot updated');
      }
    } catch (error) {
      console.error('Error processing frame data:', error);
    }
  };

  // Function to dismiss manual intervention and notify agent
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
    
    // Notify the agent that manual intervention is complete
    if (isConnected && sessionId) {
      try {
        console.log('Notifying agent that manual intervention is complete');
        
        await sendWebSocketCommand('manual_intervention_complete', {
          sessionId,
          timestamp: Date.now()
        });
        
        console.log('Manual intervention completion sent to agent');
        
      } catch (error) {
        console.error('Error notifying agent of manual intervention completion:', error);
      }
    } else {
      console.warn('Cannot notify agent of manual intervention completion: not connected or no session');
    }
  };

  // Send mouse action to agent
  const sendMouseAction = async (actionType: string, x: number, y: number, button?: string, clickCount?: number, deltaX?: number, deltaY?: number): Promise<void> => {
    if (!isConnected || !sessionId) {
      console.warn('Cannot send mouse action: not connected or no session');
      return;
    }

    try {
      console.log(`🖱️ [Mouse] Sending ${actionType} at (${x}, ${y})${button ? ` button: ${button}` : ''}${clickCount ? ` count: ${clickCount}` : ''}${deltaX || deltaY ? ` delta: (${deltaX}, ${deltaY})` : ''}`);
      
      await sendWebSocketCommand('mouse_action', {
        actionType,
        x,
        y,
        button,
        clickCount,
        deltaX,
        deltaY,
        sessionId
      });
    } catch (error) {
      console.error('Error sending mouse action:', error);
    }
  };

  // Send keyboard action to agent
  const sendKeyboardAction = async (actionType: string, key?: string, text?: string, modifiers?: string[]): Promise<void> => {
    if (!isConnected || !sessionId) {
      console.warn('Cannot send keyboard action: not connected or no session');
      return;
    }

    try {
      console.log(`⌨️ [Keyboard] Sending ${actionType}${key ? ` key: ${key}` : ''}${text ? ` text: "${text}"` : ''}${modifiers ? ` modifiers: ${modifiers.join(', ')}` : ''}`);
      
      await sendWebSocketCommand('keyboard_action', {
        actionType,
        key,
        text,
        modifiers,
        sessionId
      });
    } catch (error) {
      console.error('Error sending keyboard action:', error);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        logs,
        messages,
        setMessages,
        sendInstruction,
        sendClarification: () => {},
        sendMouseAction,
        sendKeyboardAction,
        markTaskCompleted: () => {},
        stopCurrentInstruction: async () => {},
        markInstructionComplete: async () => {},
        isConnected,
        isProcessingInstruction,
        screenshotUrl,
        currentUrl,
        pageTitle,
        outputItems,
        isManualInterventionRequired,
        manualInterventionDetails,
        dismissManualIntervention,
        streamingInfo: null,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext); 