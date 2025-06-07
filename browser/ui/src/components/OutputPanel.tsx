import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OutputItem {
  id: string;
  content: string;
  timestamp: number;
  title?: string;
}

interface OutputPanelProps {
  outputItems: OutputItem[];
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

// Local storage key for saving panel width preference
const PANEL_WIDTH_STORAGE_KEY = 'output-panel-width';

const OutputPanel: React.FC<OutputPanelProps> = ({ outputItems, isCollapsed, toggleCollapse }) => {
  // Initialize width from localStorage or use default
  const [width, setWidth] = useState(() => {
    const savedWidth = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
    return savedWidth ? parseInt(savedWidth, 10) : 450; // Default 450px
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, width.toString());
  }, [width]);

  // Handle mouse down on the drag handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    // Add dragging class to body for cursor changes
    document.body.classList.add('resize-ew');
  };

  // Handle mouse move to resize the panel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !panelRef.current) return;
      
      // Calculate new width (current width minus the distance moved)
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(300, Math.min(window.innerWidth * 0.5, startWidthRef.current - deltaX));
      
      // Directly update the DOM element style for smoother performance
      // Only update React state on mouse up for better performance
      panelRef.current.style.width = `${newWidth}px`;
      
      // Update the width indicator if it exists
      const indicator = panelRef.current.querySelector('.width-indicator');
      if (indicator) {
        (indicator as HTMLElement).textContent = `${Math.round(newWidth)}px`;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging || !panelRef.current) return;
      
      // Get the final width from the element's style
      const currentWidth = parseInt(panelRef.current.style.width, 10);
      
      // Update React state only once at the end of drag
      setWidth(currentWidth);
      setIsDragging(false);
      
      // Remove dragging class from body
      document.body.classList.remove('resize-ew');
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={panelRef}
      className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-700 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'translate-x-full' : ''
      } ${isDragging ? 'select-none will-change-transform will-change-width' : ''}`}
      style={{ 
        width: `${width}px`,
        transform: isCollapsed ? 'translateX(100%)' : `translateX(${isDragging ? '0' : '0'}px)`,
        willChange: isDragging ? 'width' : 'auto',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* Drag handle for resizing */}
      <div 
        className={`absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize transition-colors ${
          isDragging 
            ? 'bg-blue-500 dark:bg-blue-600 w-2' 
            : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-600'
        }`}
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
      
      {/* Toggle collapse button */}
      <button 
        className="absolute -left-12 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-l-lg p-2 border border-gray-200 dark:border-gray-700 border-r-0 shadow-md z-10 group"
        onClick={toggleCollapse}
        title={isCollapsed ? "Open report" : "Close report"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-6 w-6 transition-transform duration-300 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Panel header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center px-6 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Report Document
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {outputItems.length} {outputItems.length === 1 ? 'section' : 'sections'}
        </div>
      </div>
      
      {/* Size indicator - only visible when dragging */}
      {isDragging && (
        <div className="absolute top-4 left-6 bg-blue-500 text-white px-2 py-1 rounded text-xs font-mono z-10 width-indicator">
          {Math.round(width)}px
        </div>
      )}

      {/* Panel content */}
      <div className="h-[calc(100%-4rem)] overflow-auto p-6">
        {outputItems.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">No content in report yet</p>
            <p className="text-sm mt-2 max-w-xs">
              The agent will add content using Markdown format when instructed
            </p>
          </div>
        ) : (
          <div className="markdown-document pb-12">
            {outputItems.map((item) => (
              <div key={item.id} className="mb-10 document-section">
                {item.title && (
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                    {item.title}
                  </h2>
                )}
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.content}
                  </ReactMarkdown>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-right">
                  Added: {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel; 