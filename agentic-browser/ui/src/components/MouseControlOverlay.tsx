import React, { useRef, useCallback, useEffect } from 'react';
import { useSession } from '../context/SessionContext';

interface MouseControlOverlayProps {
  children: React.ReactNode;
  enabled: boolean;
  scale?: number; // Add scale prop to account for image scaling
}

const MouseControlOverlay: React.FC<MouseControlOverlayProps> = ({ children, enabled, scale = 1 }) => {
  const { sendMouseAction, sendKeyboardAction, isConnected } = useSession();
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPositionSentRef = useRef({ x: 0, y: 0 });
  const positionThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate coordinates relative to the actual image, accounting for scaling
  const getImageCoordinates = useCallback((event: React.MouseEvent) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    
    // Find the img element within the overlay
    const imgElement = overlayRef.current.querySelector('img');
    if (!imgElement) return { x: 0, y: 0 };
    
    // Get the image's bounding rect (this accounts for CSS transforms)
    const imgRect = imgElement.getBoundingClientRect();
    
    // Calculate mouse position relative to the image
    const relativeX = event.clientX - imgRect.left;
    const relativeY = event.clientY - imgRect.top;
    
    // Get the displayed dimensions of the image
    const displayedWidth = imgRect.width;
    const displayedHeight = imgRect.height;
    
    // Get the actual screenshot dimensions (natural dimensions or fallback to viewport)
    // The browser viewport is typically 1280x720 based on config
    const actualWidth = imgElement.naturalWidth || 1280;
    const actualHeight = imgElement.naturalHeight || 720;
    
    // Account for device pixel ratio that might affect coordinate mapping
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Calculate the scaling factors from displayed image to actual screenshot
    const scaleX = actualWidth / displayedWidth;
    const scaleY = actualHeight / displayedHeight;
    
    // Apply scaling and account for the scale prop
    // Note: We don't scale by devicePixelRatio here because the browser coordinates
    // are already in logical pixels, not physical pixels
    const x = Math.round((relativeX * scaleX) / scale);
    const y = Math.round((relativeY * scaleY) / scale);
    
    // Ensure coordinates are within bounds
    const clampedX = Math.max(0, Math.min(x, actualWidth));
    const clampedY = Math.max(0, Math.min(y, actualHeight));
    
    console.log('🖱️ [MouseControl] Coordinate calculation:', {
      // Mouse event data
      clientX: event.clientX,
      clientY: event.clientY,
      
      // Image positioning
      imgRect: { 
        left: imgRect.left, 
        top: imgRect.top, 
        width: imgRect.width, 
        height: imgRect.height 
      },
      
      // Relative positioning
      relativeX,
      relativeY,
      
      // Image dimensions
      displayedWidth,
      displayedHeight,
      naturalWidth: imgElement.naturalWidth,
      naturalHeight: imgElement.naturalHeight,
      actualWidth,
      actualHeight,
      
      // Scaling
      scaleX,
      scaleY,
      scale,
      devicePixelRatio,
      
      // Final coordinates
      rawX: x,
      rawY: y,
      clampedX,
      clampedY,
      
      // Additional diagnostic info
      imgSrc: imgElement.src?.substring(0, 50) + '...',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });
    
    return { x: clampedX, y: clampedY };
  }, [scale]);

  // Send mouse position update (throttled)
  const sendMousePosition = useCallback((x: number, y: number) => {
    // Clear any pending throttle
    if (positionThrottleRef.current) {
      clearTimeout(positionThrottleRef.current);
    }

    // Throttle position updates to every 50ms
    positionThrottleRef.current = setTimeout(() => {
      // Only send if position has changed significantly (more than 2 pixels)
      const dx = Math.abs(x - lastPositionSentRef.current.x);
      const dy = Math.abs(y - lastPositionSentRef.current.y);
      
      if (dx > 2 || dy > 2) {
        console.log('🖱️ [MouseControl] Sending position update:', { x, y });
        sendMouseAction('mouse_position', x, y);
        lastPositionSentRef.current = { x, y };
      }
    }, 50);
  }, [sendMouseAction]);

  // Handle mouse move
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!enabled || !isConnected) return;
    
    const imageCoords = getImageCoordinates(event);
    
    // Send throttled mouse position for hover effects
    sendMousePosition(imageCoords.x, imageCoords.y);
  }, [enabled, isConnected, getImageCoordinates, sendMousePosition]);

  // Handle mouse down
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!enabled || !isConnected) return;
    
    event.preventDefault();
    const coords = getImageCoordinates(event);
    
    const button = event.button === 0 ? 'left' : event.button === 1 ? 'middle' : 'right';
    console.log('🖱️ [MouseControl] Sending mouse_down:', { ...coords, button });
    sendMouseAction('mouse_down', coords.x, coords.y, button);
  }, [enabled, isConnected, getImageCoordinates, sendMouseAction]);

  // Handle mouse up
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!enabled || !isConnected) return;
    
    event.preventDefault();
    const coords = getImageCoordinates(event);
    
    const button = event.button === 0 ? 'left' : event.button === 1 ? 'middle' : 'right';
    console.log('🖱️ [MouseControl] Sending mouse_up:', { ...coords, button });
    sendMouseAction('mouse_up', coords.x, coords.y, button);
  }, [enabled, isConnected, getImageCoordinates, sendMouseAction]);

  // Handle click (for simple clicks without drag)
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!enabled || !isConnected) return;
    
    event.preventDefault();
    const coords = getImageCoordinates(event);
    
    const button = event.button === 0 ? 'left' : event.button === 1 ? 'middle' : 'right';
    const clickCount = event.detail || 1; // Handle double-clicks
    
    console.log('🖱️ [MouseControl] Sending mouse_click:', { ...coords, button, clickCount });
    sendMouseAction('mouse_click', coords.x, coords.y, button, clickCount);
  }, [enabled, isConnected, getImageCoordinates, sendMouseAction]);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (enabled) {
      event.preventDefault(); // Prevent browser context menu when mouse control is enabled
    }
  }, [enabled]);

  // Handle mouse wheel (scroll)
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!enabled || !isConnected) return;
    
    event.preventDefault();
    
    // Get the current mouse position
    const imageCoords = getImageCoordinates(event);
    
    // Send scroll action with deltaX and deltaY
    console.log('🖱️ [MouseControl] Sending scroll:', { 
      x: imageCoords.x, 
      y: imageCoords.y, 
      deltaX: event.deltaX, 
      deltaY: event.deltaY 
    });
    
    // Send scroll action with delta values
    sendMouseAction('scroll', imageCoords.x, imageCoords.y, 'left', 1, event.deltaX, event.deltaY);
  }, [enabled, isConnected, getImageCoordinates, sendMouseAction]);

  // Handle key down
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enabled || !isConnected) return;
    
    // For printable characters, send as text input instead of key events
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      console.log('⌨️ [KeyboardControl] Sending character as text_input:', { text: event.key });
      sendKeyboardAction('text_input', undefined, event.key);
      return;
    }
    
    // Don't prevent default for modifier keys to maintain browser functionality
    const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
    if (!isModifierKey) {
      event.preventDefault();
    }
    
    // Collect active modifiers
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');
    
    console.log('⌨️ [KeyboardControl] Sending key_down:', { 
      key: event.key, 
      code: event.code, 
      modifiers 
    });
    
    sendKeyboardAction('key_down', event.key, undefined, modifiers);
  }, [enabled, isConnected, sendKeyboardAction]);

  // Handle key up
  const handleKeyUp = useCallback((event: React.KeyboardEvent) => {
    if (!enabled || !isConnected) return;
    
    // Don't prevent default for modifier keys
    const isModifierKey = ['Control', 'Shift', 'Alt', 'Meta'].includes(event.key);
    if (!isModifierKey) {
      event.preventDefault();
    }
    
    // Collect active modifiers
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');
    
    console.log('⌨️ [KeyboardControl] Sending key_up:', { 
      key: event.key, 
      code: event.code, 
      modifiers 
    });
    
    sendKeyboardAction('key_up', event.key, undefined, modifiers);
  }, [enabled, isConnected, sendKeyboardAction]);

  // Handle text input (for character input)
  const handleInput = useCallback((event: React.CompositionEvent | React.FormEvent) => {
    if (!enabled || !isConnected) return;
    
    // Get the input text from different event types
    let inputText: string | undefined;
    
    if ('data' in event) {
      // CompositionEvent has data property
      inputText = (event as React.CompositionEvent).data;
    } else if ('target' in event && event.target) {
      // FormEvent with target
      const target = event.target as HTMLInputElement;
      inputText = target.value;
    }
    
    if (inputText && inputText.length > 0) {
      console.log('⌨️ [KeyboardControl] Sending text_input:', { text: inputText });
      sendKeyboardAction('text_input', undefined, inputText);
    }
  }, [enabled, isConnected, sendKeyboardAction]);

  // Handle composition events (for IME input like Chinese, Japanese, etc.)
  const handleCompositionEnd = useCallback((event: React.CompositionEvent) => {
    if (!enabled || !isConnected) return;
    
    if (event.data && event.data.length > 0) {
      console.log('⌨️ [KeyboardControl] Sending composition text:', { text: event.data });
      sendKeyboardAction('text_input', undefined, event.data);
    }
  }, [enabled, isConnected, sendKeyboardAction]);

  // Cleanup throttle on unmount
  useEffect(() => {
    return () => {
      if (positionThrottleRef.current) {
        clearTimeout(positionThrottleRef.current);
      }
    };
  }, []);

  // Auto-focus the overlay when enabled to receive keyboard events
  useEffect(() => {
    if (enabled && overlayRef.current) {
      overlayRef.current.focus();
    }
  }, [enabled]);

  return (
    <div
      ref={overlayRef}
      className={`relative w-full ${enabled ? 'cursor-crosshair' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onInput={handleInput}
      onCompositionEnd={handleCompositionEnd}
      tabIndex={enabled ? 0 : -1} // Make focusable when enabled
      style={{
        userSelect: enabled ? 'none' : 'auto', // Prevent text selection when mouse control is enabled
      }}
    >
      {children}
      
      {/* Status indicator */}
      {enabled && (
        <div className="absolute top-2 right-2 bg-green-600 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          🖱️⌨️ Manual Control Active
        </div>
      )}
      
      {/* Debug info when enabled */}
      {enabled && isConnected && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          Scale: {scale}x | Connected: {isConnected ? '✅' : '❌'}
        </div>
      )}
      
      {/* Disabled overlay */}
      {enabled && !isConnected && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-red-600 text-white px-4 py-2 rounded">
            Manual control disabled - not connected
          </div>
        </div>
      )}
    </div>
  );
};

export default MouseControlOverlay; 