import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Entity {
  entityId: number;
  name?: string;
  pos: { x: number; y: number; z: number };
  hp: number;
  stance: number;
}

interface Frame {
  tick: number;
  timeSec: number;
  entities: Entity[];
}

interface Player {
  id: number;
  name: string;
  civilization: string;
  team: number;
  color: number;
}

interface ReplayData {
  metadata: {
    version?: string;
    gameMode?: string;
    mapName?: string;
    duration: number;
    frameCount?: number;
    tickRate?: number;
    players?: Player[];
    gameSettings?: any;
  };
  frames: Frame[];
}

interface ReplayVisualizationProps {
  replayData: ReplayData;
  width?: number;
  height?: number;
}

const ReplayVisualization: React.FC<ReplayVisualizationProps> = ({
  replayData,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<Entity | null>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  const { frames } = replayData;

  // Enhanced player colors with better contrast
  const playerColors = {
    0: '#9CA3AF', // Neutral/Gaia - Light Gray
    1: '#2563EB', // Player 1 - Strong Blue
    2: '#DC2626', // Player 2 - Strong Red
    3: '#059669', // Player 3 - Strong Green
    4: '#D97706', // Player 4 - Strong Orange
    5: '#7C3AED', // Player 5 - Strong Purple
    6: '#DB2777', // Player 6 - Strong Pink
    7: '#0891B2', // Player 7 - Strong Cyan
    8: '#65A30D', // Player 8 - Strong Lime
  };

  // Enhanced entity visualization with better team detection and unit types
  const getEntityVisualization = (entity: Entity) => {
    // Better player detection based on entity ID ranges
    let playerId = 0; // Default to neutral
    if (entity.entityId >= 1000 && entity.entityId < 2000) {
      playerId = 1; // Player 1
    } else if (entity.entityId >= 2000 && entity.entityId < 3000) {
      playerId = 2; // Player 2
    } else if (entity.entityId >= 3000 && entity.entityId < 4000) {
      playerId = 3; // Player 3
    } else if (entity.entityId >= 4000 && entity.entityId < 5000) {
      playerId = 4; // Player 4
    }
    
    const baseColor = playerColors[playerId as keyof typeof playerColors] || playerColors[0];
    
    // Determine entity type based on name and HP
    let size = 4;
    let shape = 'circle';
    let color = baseColor;
    let unitType = 'unknown';
    
    if (entity.hp === 0) {
      size = 3;
      shape = 'cross';
      color = '#6B7280'; // Gray for dead units
      unitType = 'dead';
    } else if (entity.name) {
      const name = entity.name.toLowerCase();
      
      // Villagers/Workers
      if (name.includes('villager') || name.includes('worker')) {
        size = 3;
        shape = 'circle';
        unitType = 'villager';
      }
      // Military units
      else if (name.includes('knight') || name.includes('cavalry') || name.includes('horseman')) {
        size = 5;
        shape = 'triangle';
        unitType = 'cavalry';
      }
      else if (name.includes('archer') || name.includes('crossbow') || name.includes('longbow')) {
        size = 4;
        shape = 'diamond';
        unitType = 'archer';
      }
      else if (name.includes('spear') || name.includes('pike') || name.includes('man-at-arms') || name.includes('infantry')) {
        size = 4;
        shape = 'square';
        unitType = 'infantry';
      }
      // Buildings
      else if (name.includes('center') || name.includes('castle') || name.includes('keep')) {
        size = 10;
        shape = 'hexagon';
        color = baseColor;
        unitType = 'major_building';
      }
      else if (name.includes('house') || name.includes('mill') || name.includes('blacksmith') || 
               name.includes('barracks') || name.includes('stable') || name.includes('range')) {
        size = 7;
        shape = 'rectangle';
        unitType = 'building';
      }
      // Siege
      else if (name.includes('trebuchet') || name.includes('catapult') || name.includes('cannon') || name.includes('bombard')) {
        size = 6;
        shape = 'star';
        unitType = 'siege';
      }
      // Ships
      else if (name.includes('ship') || name.includes('galley') || name.includes('cog')) {
        size = 6;
        shape = 'boat';
        unitType = 'ship';
      }
    } else {
      // Fallback based on HP for unnamed entities
      if (entity.hp <= 25) {
        size = 3; shape = 'circle'; unitType = 'light';
      } else if (entity.hp <= 75) {
        size = 4; shape = 'square'; unitType = 'medium';
      } else if (entity.hp <= 200) {
        size = 5; shape = 'triangle'; unitType = 'heavy';
      } else if (entity.hp <= 1000) {
        size = 6; shape = 'diamond'; unitType = 'very_heavy';
      } else {
        size = 8; shape = 'hexagon'; unitType = 'building';
      }
    }
    
    // Add some visual distinction for damaged units
    if (entity.hp > 0 && entity.hp < 50) {
      // Slightly dimmer color for damaged units
      color = color + '88'; // Add transparency
    }
    
    return { color, size, shape, playerId, unitType };
  };


  // Convert world coordinates to canvas coordinates
  const worldToCanvas = useCallback((worldX: number, worldY: number) => {
    // In AOE4, (0,0) is typically the center of the map
    // Canvas (0,0) is top-left, so we put world (0,0) at canvas center
    
    const canvasX = (worldX + panOffset.x) * zoom + width / 2;
    // Flip Y axis since game Y might increase upward, but canvas Y increases downward
    const canvasY = (-worldY + panOffset.y) * zoom + height / 2;
    return { x: canvasX, y: canvasY };
  }, [zoom, panOffset, width, height]);

  // Enhanced entity drawing with more shapes and better visuals
  const drawEntity = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, visualization: any) => {
    const { color, size, shape } = visualization;
    
    ctx.fillStyle = color;
    ctx.strokeStyle = color.includes('#') ? color : '#FFFFFF';
    ctx.lineWidth = 1.5;
    
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // Add border for better visibility
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
        
      case 'square':
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
        break;
        
      case 'rectangle':
        // Wider rectangle for buildings
        const rectWidth = size * 1.5;
        const rectHeight = size;
        ctx.fillRect(x - rectWidth, y - rectHeight, rectWidth * 2, rectHeight * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - rectWidth, y - rectHeight, rectWidth * 2, rectHeight * 2);
        break;
        
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.lineTo(x + size, y + size);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
        
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
        
      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
        
      case 'star':
        // 5-pointed star for siege units
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const outerRadius = size;
          const innerRadius = size * 0.5;
          
          // Outer point
          const x1 = x + outerRadius * Math.cos(angle);
          const y1 = y + outerRadius * Math.sin(angle);
          
          // Inner point
          const x2 = x + innerRadius * Math.cos(angle + Math.PI / 5);
          const y2 = y + innerRadius * Math.sin(angle + Math.PI / 5);
          
          if (i === 0) ctx.moveTo(x1, y1);
          else ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
        
      case 'boat':
        // Boat shape for ships
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Add mast
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.6);
        ctx.lineTo(x, y + size * 0.6);
        ctx.stroke();
        break;
        
      case 'cross':
        ctx.strokeStyle = '#EF4444'; // Red for dead units
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - size, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y - size);
        ctx.lineTo(x - size, y + size);
        ctx.stroke();
        break;
        
      default:
        // Fallback to circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }, []);

  // Render current frame
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#1F2937'; // Dark gray background
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    const gridSize = 50 * zoom;
    const startX = (-panOffset.x * zoom) % gridSize;
    const startY = (-panOffset.y * zoom) % gridSize;
    
    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw center axes (world origin, not map center)
    const worldOriginCanvas = worldToCanvas(0, 0);
    const centerX = worldOriginCanvas.x;
    const centerY = worldOriginCanvas.y;
    
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    
    if (centerX >= 0 && centerX <= width) {
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
    }
    
    if (centerY >= 0 && centerY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }
    
    // Draw entities
    const currentFrame = frames[currentFrameIndex];
    if (currentFrame) {
      // Separate entities into active and inactive
      const activeEntities = currentFrame.entities.filter(e => 
        e.hp > 0 && (Math.abs(e.pos.x) > 0.1 || Math.abs(e.pos.y) > 0.1)
      );
      const inactiveEntities = currentFrame.entities.filter(e => 
        e.hp === 0 || (Math.abs(e.pos.x) <= 0.1 && Math.abs(e.pos.y) <= 0.1)
      );
      
      // Draw inactive entities first (smaller, more transparent)
      for (const entity of inactiveEntities) {
        const canvasPos = worldToCanvas(entity.pos.x, entity.pos.y);
        
        // Only draw if entity is visible on canvas
        if (canvasPos.x >= -20 && canvasPos.x <= width + 20 && 
            canvasPos.y >= -20 && canvasPos.y <= height + 20) {
          const visualization = getEntityVisualization(entity);
          
          // Make inactive entities smaller and more transparent
          ctx.globalAlpha = 0.3;
          const smallerVisualization = { ...visualization, size: Math.max(1, visualization.size / 2) };
          drawEntity(ctx, canvasPos.x, canvasPos.y, smallerVisualization);
          ctx.globalAlpha = 1.0;
        }
      }
      
      // Draw active entities on top (normal size, full opacity)
      for (const entity of activeEntities) {
        const canvasPos = worldToCanvas(entity.pos.x, entity.pos.y);
        
        // Only draw if entity is visible on canvas
        if (canvasPos.x >= -20 && canvasPos.x <= width + 20 && 
            canvasPos.y >= -20 && canvasPos.y <= height + 20) {
          const visualization = getEntityVisualization(entity);
          
          // Highlight selected entity
          if (selectedEntity && entity.entityId === selectedEntity.entityId) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(canvasPos.x, canvasPos.y, visualization.size + 5, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // Highlight hovered entity
          if (hoveredEntity && entity.entityId === hoveredEntity.entityId && 
              (!selectedEntity || entity.entityId !== selectedEntity.entityId)) {
            ctx.strokeStyle = '#FCD34D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(canvasPos.x, canvasPos.y, visualization.size + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          drawEntity(ctx, canvasPos.x, canvasPos.y, visualization);
          
          // Draw entity name if it exists and entity is selected or hovered
          if ((selectedEntity && entity.entityId === selectedEntity.entityId) ||
              (hoveredEntity && entity.entityId === hoveredEntity.entityId)) {
            if (entity.name) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(canvasPos.x - 30, canvasPos.y - visualization.size - 20, 60, 16);
              ctx.fillStyle = '#FFFFFF';
              ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(entity.name, canvasPos.x, canvasPos.y - visualization.size - 8);
              ctx.textAlign = 'left';
            }
          }
        }
      }
    }
    
    // Draw info overlay
    const overlayWidth = Math.min(300, width - 20);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, overlayWidth, 200);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    
    // Frame and time info
    ctx.fillText(`Frame: ${currentFrameIndex + 1}/${frames.length}`, 20, 35);
    const timeDisplay = currentFrame ? `${Math.floor(currentFrame.timeSec / 60)}:${(currentFrame.timeSec % 60).toFixed(0).padStart(2, '0')}` : '0:00';
    ctx.fillText(`Time: ${timeDisplay}`, 20, 55);
    
    if (currentFrame) {
      const activeEntities = currentFrame.entities.filter(e => 
        e.hp > 0 && (Math.abs(e.pos.x) > 0.1 || Math.abs(e.pos.y) > 0.1)
      );
      const inactiveEntities = currentFrame.entities.filter(e => 
        e.hp === 0 || (Math.abs(e.pos.x) <= 0.1 && Math.abs(e.pos.y) <= 0.1)
      );
      
      // Entity counts with better formatting
      ctx.fillStyle = '#10B981'; // Green for active
      ctx.fillText(`Active: ${activeEntities.length.toLocaleString()}`, 20, 80);
      ctx.fillStyle = '#6B7280'; // Gray for inactive
      ctx.fillText(`Inactive: ${inactiveEntities.length.toLocaleString()}`, 20, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`Total: ${currentFrame.entities.length.toLocaleString()}`, 20, 120);
      
      // Player distribution using the same logic as visualization
      const player1Entities = currentFrame.entities.filter(e => 
        e.entityId >= 1000 && e.entityId < 2000 && e.hp > 0
      );
      const player2Entities = currentFrame.entities.filter(e => 
        e.entityId >= 2000 && e.entityId < 3000 && e.hp > 0
      );
      
      ctx.fillStyle = playerColors[1]; // Player 1 color
      ctx.fillText(`Player 1: ${player1Entities.length}`, 170, 80);
      ctx.fillStyle = playerColors[2]; // Player 2 color
      ctx.fillText(`Player 2: ${player2Entities.length}`, 170, 100);
    }
    
    // View controls info
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, 20, 145);
    ctx.fillText(`Pan: (${panOffset.x.toFixed(0)}, ${panOffset.y.toFixed(0)})`, 20, 165);
    
    // Controls hint
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Drag to pan • Scroll to zoom • Click entities for info`, 20, 185);
    
    // Coordinate system indicator
    ctx.fillStyle = '#FCD34D';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`World origin (0,0) at canvas center`, 20, 200);
    
  }, [currentFrameIndex, frames, zoom, panOffset, width, height, worldToCanvas, drawEntity, getEntityVisualization]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;
    
    const animate = (currentTime: number) => {
      if (currentTime - lastFrameTimeRef.current >= (1000 / playbackSpeed)) {
        setCurrentFrameIndex(prev => {
          const next = prev + 1;
          if (next >= frames.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
        lastFrameTimeRef.current = currentTime;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, frames.length]);

  // Render frame whenever state changes
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Find entity at canvas position
  const findEntityAtPosition = useCallback((canvasX: number, canvasY: number): Entity | null => {
    const currentFrame = frames[currentFrameIndex];
    if (!currentFrame) return null;
    
    for (const entity of currentFrame.entities) {
      const canvasPos = worldToCanvas(entity.pos.x, entity.pos.y);
      const visualization = getEntityVisualization(entity);
      const distance = Math.sqrt(
        Math.pow(canvasPos.x - canvasX, 2) + Math.pow(canvasPos.y - canvasY, 2)
      );
      
      if (distance <= visualization.size + 3) { // 3px tolerance
        return entity;
      }
    }
    return null;
  }, [frames, currentFrameIndex, worldToCanvas, getEntityVisualization]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Check if clicking on an entity
    const clickedEntity = findEntityAtPosition(canvasX, canvasY);
    if (clickedEntity) {
      setSelectedEntity(clickedEntity);
      return;
    }
    
    setIsDragging(true);
    setDragStart({ x: canvasX, y: canvasY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    if (isDragging) {
      const deltaX = (canvasX - dragStart.x) / zoom;
      const deltaY = (canvasY - dragStart.y) / zoom;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setDragStart({ x: canvasX, y: canvasY });
    } else {
      // Check for hover
      const hoveredEntity = findEntityAtPosition(canvasX, canvasY);
      setHoveredEntity(hoveredEntity);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
  };

  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Canvas */}
      <div className="relative border border-gray-600 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={hoveredEntity ? "cursor-pointer" : "cursor-move"}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800 rounded-lg">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <button
            onClick={() => setCurrentFrameIndex(0)}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
        
        {/* Frame Scrubber */}
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-sm text-gray-300">Frame:</span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentFrameIndex}
            onChange={(e) => setCurrentFrameIndex(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-300 min-w-[60px]">
            {currentFrameIndex + 1}/{frames.length}
          </span>
        </div>
        
        {/* Speed Control */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
            <option value={8}>8x</option>
          </select>
        </div>
        
        {/* View Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">Zoom:</span>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-300 min-w-[40px]">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={resetView}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Reset View
          </button>
        </div>
      </div>
      
      {/* Entity Selection Panel */}
      {selectedEntity && (
        <div className="p-4 bg-gray-800 rounded-lg border border-blue-500">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Selected Entity</h3>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-300">ID:</span>
              <span className="text-white ml-2">{selectedEntity.entityId}</span>
            </div>
            <div>
              <span className="text-gray-300">Name:</span>
              <span className="text-white ml-2">{selectedEntity.name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-300">HP:</span>
              <span className={`ml-2 ${selectedEntity.hp > 50 ? 'text-green-400' : 
                selectedEntity.hp > 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                {selectedEntity.hp.toFixed(0)}
              </span>
            </div>
            <div>
              <span className="text-gray-300">Stance:</span>
              <span className="text-white ml-2">{selectedEntity.stance}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-300">Position:</span>
              <span className="text-white ml-2">
                ({selectedEntity.pos.x.toFixed(1)}, {selectedEntity.pos.y.toFixed(1)})
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-300">Player:</span>
              <span className={`ml-2 ${selectedEntity.entityId >= 1000 && selectedEntity.entityId < 2000 ? 'text-blue-400' : 
                selectedEntity.entityId >= 2000 && selectedEntity.entityId < 3000 ? 'text-red-400' : 'text-gray-400'}`}>
                {selectedEntity.entityId >= 1000 && selectedEntity.entityId < 2000 ? 'Player 1' : 
                 selectedEntity.entityId >= 2000 && selectedEntity.entityId < 3000 ? 'Player 2' : 'Neutral'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-300">Unit Type:</span>
              <span className="text-white ml-2 capitalize">
                {(() => {
                  const viz = getEntityVisualization(selectedEntity);
                  return viz.unitType.replace('_', ' ');
                })()}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white font-semibold mb-2">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {replayData.metadata.players && replayData.metadata.players.length > 0 ? (
            replayData.metadata.players.map((player, index) => (
              <div key={player.id} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-blue-500' :
                  index === 1 ? 'bg-red-500' :
                  index === 2 ? 'bg-green-500' :
                  index === 3 ? 'bg-yellow-500' :
                  index === 4 ? 'bg-purple-500' :
                  index === 5 ? 'bg-pink-500' :
                  index === 6 ? 'bg-cyan-500' :
                  'bg-lime-500'
                }`}></div>
                <span className="text-gray-300">{player.name} ({player.civilization})</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-300">Player 1</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Player 2</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Player 3</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">Player 4</span>
              </div>
            </>
          )}
        </div>
        <div className="mt-4">
          <h4 className="text-white font-medium mb-2">Unit Types & Shapes</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">●</span>
              <span>Villagers/Workers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-400">■</span>
              <span>Infantry/Spears</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">▲</span>
              <span>Cavalry/Knights</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-400">♦</span>
              <span>Archers/Ranged</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">⬢</span>
              <span>Major Buildings</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400">▬</span>
              <span>Small Buildings</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-pink-400">★</span>
              <span>Siege Weapons</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-teal-400">⛵</span>
              <span>Ships/Naval</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-400">✕</span>
              <span>Destroyed Units</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            <strong>Team Colors:</strong> Blue = Player 1, Red = Player 2, Gray = Neutral/Dead
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayVisualization;