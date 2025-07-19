import React, { useState, useEffect } from 'react';
import ReplayVisualization from '../components/ReplayVisualization';

// Sample replay data structure matching new parser output
const sampleReplayData = {
  metadata: {
    version: "1.0",
    gameMode: "Skirmish",
    mapName: "Sample Map",
    duration: 120.5,
    players: [
      { id: 1, name: "Player 1", civilization: "French", team: 1, color: 0 },
      { id: 2, name: "Player 2", civilization: "English", team: 2, color: 1 }
    ],
    gameSettings: {}
  },
  frames: [
    {
      tick: 0,
      timeSec: 0,
      entities: [
        { entityId: 1, pos: { x: 0, y: 0, z: 0 }, hp: 100, stance: 0 },
        { entityId: 2, pos: { x: 50, y: 30, z: 0 }, hp: 75, stance: 1 },
        { entityId: 3, pos: { x: -30, y: 40, z: 0 }, hp: 150, stance: 0 },
        { entityId: 4, pos: { x: 100, y: -20, z: 0 }, hp: 25, stance: 2 },
        { entityId: 5, pos: { x: -50, y: -60, z: 0 }, hp: 200, stance: 0 },
        { entityId: 10001, pos: { x: 200, y: 100, z: 0 }, hp: 80, stance: 1 },
        { entityId: 10002, pos: { x: 150, y: 80, z: 0 }, hp: 60, stance: 0 },
        { entityId: 10003, pos: { x: 180, y: 120, z: 0 }, hp: 300, stance: 2 },
        { entityId: 10004, pos: { x: 220, y: 90, z: 0 }, hp: 500, stance: 0 },
        { entityId: 10005, pos: { x: 160, y: 110, z: 0 }, hp: 1000, stance: 1 }
      ]
    },
    {
      tick: 240,
      timeSec: 30,
      entities: [
        { entityId: 1, pos: { x: 10, y: 5, z: 0 }, hp: 100, stance: 1 },
        { entityId: 2, pos: { x: 55, y: 35, z: 0 }, hp: 75, stance: 1 },
        { entityId: 3, pos: { x: -25, y: 45, z: 0 }, hp: 150, stance: 0 },
        { entityId: 4, pos: { x: 110, y: -15, z: 0 }, hp: 25, stance: 2 },
        { entityId: 5, pos: { x: -45, y: -55, z: 0 }, hp: 200, stance: 0 },
        { entityId: 6, pos: { x: 20, y: 70, z: 0 }, hp: 100, stance: 0 },
        { entityId: 7, pos: { x: -80, y: 20, z: 0 }, hp: 50, stance: 1 },
        { entityId: 10001, pos: { x: 205, y: 105, z: 0 }, hp: 80, stance: 1 },
        { entityId: 10002, pos: { x: 155, y: 85, z: 0 }, hp: 60, stance: 0 },
        { entityId: 10003, pos: { x: 175, y: 125, z: 0 }, hp: 300, stance: 2 },
        { entityId: 10004, pos: { x: 225, y: 95, z: 0 }, hp: 500, stance: 0 },
        { entityId: 10005, pos: { x: 165, y: 115, z: 0 }, hp: 1000, stance: 1 }
      ]
    },
    {
      tick: 720,
      timeSec: 90,
      entities: [
        { entityId: 1, pos: { x: 20, y: 10, z: 0 }, hp: 90, stance: 1 },
        { entityId: 2, pos: { x: 60, y: 40, z: 0 }, hp: 75, stance: 1 },
        { entityId: 3, pos: { x: -20, y: 50, z: 0 }, hp: 140, stance: 2 },
        { entityId: 4, pos: { x: 120, y: -10, z: 0 }, hp: 25, stance: 2 },
        { entityId: 5, pos: { x: -40, y: -50, z: 0 }, hp: 200, stance: 0 },
        { entityId: 6, pos: { x: 30, y: 75, z: 0 }, hp: 100, stance: 0 },
        { entityId: 7, pos: { x: -70, y: 25, z: 0 }, hp: 50, stance: 1 },
        { entityId: 8, pos: { x: 0, y: 100, z: 0 }, hp: 200, stance: 0 },
        { entityId: 9, pos: { x: -100, y: 0, z: 0 }, hp: 150, stance: 1 },
        { entityId: 10001, pos: { x: 210, y: 110, z: 0 }, hp: 80, stance: 1 },
        { entityId: 10002, pos: { x: 160, y: 90, z: 0 }, hp: 60, stance: 2 },
        { entityId: 10003, pos: { x: 170, y: 130, z: 0 }, hp: 280, stance: 2 },
        { entityId: 10004, pos: { x: 230, y: 100, z: 0 }, hp: 500, stance: 0 },
        { entityId: 10005, pos: { x: 170, y: 120, z: 0 }, hp: 1000, stance: 1 },
        { entityId: 10006, pos: { x: 250, y: 80, z: 0 }, hp: 75, stance: 1 }
      ]
    }
  ]
};

const ReplayViewer: React.FC = () => {
  const [replayData, setReplayData] = useState(sampleReplayData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [availableReplays, setAvailableReplays] = useState<string[]>([]);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Check for available replay files on component mount
  useEffect(() => {
    const checkAvailableReplays = async () => {
      const possibleFiles = [
        'AgeIV_Replay_187705505-parsed.json',
        'AgeIV_Replay_187365187-parsed.json',
        'sample-replay.json'
      ];
      
      const available = [];
      for (const file of possibleFiles) {
        try {
          const response = await fetch(`/${file}`, { method: 'HEAD' });
          if (response.ok) {
            available.push(file);
          }
        } catch (e) {
          // File doesn't exist, skip
        }
      }
      setAvailableReplays(available);
    };
    
    checkAvailableReplays();
  }, []);

  // Calculate advanced statistics
  const getAdvancedStats = () => {
    if (!replayData.frames.length) return {};
    
    let totalEntities = 0;
    let activeEntities = 0;
    let deadEntities = 0;
    let maxEntitiesPerFrame = 0;
    let playerEntityCounts: { [key: number]: number } = {};
    let averageHp = 0;
    let totalHp = 0;
    let hpSamples = 0;
    
    for (const frame of replayData.frames) {
      totalEntities += frame.entities.length;
      maxEntitiesPerFrame = Math.max(maxEntitiesPerFrame, frame.entities.length);
      
      for (const entity of frame.entities) {
        if (entity.hp > 0) {
          activeEntities++;
          totalHp += entity.hp;
          hpSamples++;
        } else {
          deadEntities++;
        }
        
        // Determine player based on entity ID
        const playerId = entity.entityId < 2000 ? 1 : 2;
        playerEntityCounts[playerId] = (playerEntityCounts[playerId] || 0) + 1;
      }
    }
    
    averageHp = hpSamples > 0 ? totalHp / hpSamples : 0;
    
    return {
      totalEntities,
      activeEntities,
      deadEntities,
      maxEntitiesPerFrame,
      averageEntitiesPerFrame: totalEntities / replayData.frames.length,
      playerEntityCounts,
      averageHp,
      activePercentage: totalEntities > 0 ? (activeEntities / totalEntities) * 100 : 0
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Debug logging
      console.log('Loaded data keys:', Object.keys(data));
      console.log('Metadata exists:', !!data.metadata);
      console.log('Frames exists:', !!data.frames);
      
      // Validate the data structure
      if (!data.metadata || !data.frames) {
        throw new Error(`Invalid replay data format - missing metadata (${!!data.metadata}) or frames (${!!data.frames})`);
      }
      
      // Ensure frames is an array
      if (!Array.isArray(data.frames)) {
        throw new Error('Invalid replay data format - frames must be an array');
      }
      
      // Check if frames have the required structure
      if (data.frames.length > 0) {
        const firstFrame = data.frames[0];
        console.log('First frame structure:', Object.keys(firstFrame));
        console.log('First frame entities:', firstFrame.entities);
        
        if (!firstFrame.entities || !Array.isArray(firstFrame.entities)) {
          throw new Error('Invalid replay data format - frames must contain entities array');
        }
        
        // Check entity structure
        if (firstFrame.entities.length > 0) {
          const firstEntity = firstFrame.entities[0];
          console.log('First entity structure:', Object.keys(firstEntity));
          
          if (!firstEntity.entityId || !firstEntity.pos) {
            throw new Error('Invalid replay data format - entities must have entityId and pos properties');
          }
        }
      }
      
      setReplayData(data);
      setSelectedFile(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleData = () => {
    setReplayData(sampleReplayData);
    setError(null);
    setSelectedFile('Sample Data');
  };

  const loadReplayFromList = async (filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`Could not load ${filename}`);
      }
      
      const data = await response.json();
      
      if (!data.metadata || !data.frames) {
        throw new Error('Invalid replay data format');
      }
      
      setReplayData(data);
      setSelectedFile(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay');
    } finally {
      setIsLoading(false);
    }
  };

  const loadParsedReplay = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load the parsed replay file from the server
      const response = await fetch('/AgeIV_Replay_187705505-parsed.json');
      if (!response.ok) {
        throw new Error('Could not load parsed replay file. Make sure the server has parsed replay files available.');
      }
      
      const data = await response.json();
      
      // Validate the parsed data structure
      if (!data.metadata || !data.frames) {
        throw new Error('Invalid parsed replay data format');
      }
      
      setReplayData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parsed replay');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">AOE4 Replay Viewer</h1>
          <p className="text-gray-300">
            Visualize and analyze Age of Empires IV replay data with interactive playback
          </p>
        </div>

        {/* File Upload Controls */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-3">Load Replay Data</h2>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload JSON File</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <button
              onClick={loadSampleData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Load Sample Data
            </button>
            
            <button
              onClick={loadParsedReplay}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Load Parsed Replay
            </button>
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-300">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded-lg">
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Replay Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">Duration</h3>
            <p className="text-2xl font-bold text-white">
              {Math.floor(replayData.metadata.duration / 60)}:{(replayData.metadata.duration % 60).toFixed(0).padStart(2, '0')}
            </p>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">Frames</h3>
            <p className="text-2xl font-bold text-white">
              {replayData.frames.length}
            </p>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">Map</h3>
            <p className="text-lg font-bold text-white">
              {replayData.metadata.mapName || 'Unknown'}
            </p>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">Game Mode</h3>
            <p className="text-lg font-bold text-white">
              {replayData.metadata.gameMode || 'Unknown'}
            </p>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">Version</h3>
            <p className="text-sm font-bold text-white">
              {replayData.metadata.version || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Player Summary */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-3">Players</h2>
          {replayData.metadata.players && replayData.metadata.players.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {replayData.metadata.players.map((player, index) => (
                <div key={player.id} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-red-500' :
                    index === 2 ? 'bg-green-500' :
                    index === 3 ? 'bg-yellow-500' :
                    index === 4 ? 'bg-purple-500' :
                    index === 5 ? 'bg-pink-500' :
                    index === 6 ? 'bg-cyan-500' :
                    'bg-lime-500'
                  }`}></div>
                  <div>
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-sm text-gray-300">{player.civilization}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2].map((playerId) => (
                <div key={playerId} className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    playerId === 1 ? 'bg-blue-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-white font-medium">Player {playerId}</p>
                    <p className="text-sm text-gray-300">Unknown</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Canvas Settings</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Size:</label>
              <select
                value={`${canvasSize.width}x${canvasSize.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setCanvasSize({ width: w, height: h });
                }}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="800x600">800×600 (Standard)</option>
                <option value="1000x700">1000×700 (Large)</option>
                <option value="1200x800">1200×800 (XL)</option>
                <option value="1400x900">1400×900 (XXL)</option>
                <option value="600x600">600×600 (Square)</option>
                <option value="1000x1000">1000×1000 (Large Square)</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Available Replays:</label>
              <select
                value={selectedFile || ''}
                onChange={(e) => e.target.value && loadReplayFromList(e.target.value)}
                className="px-3 py-1 bg-gray-700 text-white rounded border border-gray-600"
                disabled={isLoading}
              >
                <option value="">Select a replay...</option>
                {availableReplays.map(file => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => setShowAdvancedStats(!showAdvancedStats)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
            >
              {showAdvancedStats ? 'Hide' : 'Show'} Stats
            </button>
          </div>
          
          {selectedFile && (
            <div className="mt-3 text-sm text-gray-300">
              Currently viewing: <span className="text-blue-400 font-medium">{selectedFile}</span>
            </div>
          )}
        </div>

        {/* Advanced Statistics */}
        {showAdvancedStats && (() => {
          const stats = getAdvancedStats();
          return (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Advanced Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.totalEntities?.toLocaleString()}</p>
                  <p className="text-sm text-gray-300">Total Entities</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.activeEntities?.toLocaleString()}</p>
                  <p className="text-sm text-gray-300">Active Entities</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{stats.deadEntities?.toLocaleString()}</p>
                  <p className="text-sm text-gray-300">Dead Entities</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.averageEntitiesPerFrame?.toFixed(1)}</p>
                  <p className="text-sm text-gray-300">Avg per Frame</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{stats.maxEntitiesPerFrame}</p>
                  <p className="text-sm text-gray-300">Max per Frame</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{stats.averageHp?.toFixed(0)}</p>
                  <p className="text-sm text-gray-300">Average HP</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-lime-400">{stats.activePercentage?.toFixed(1)}%</p>
                  <p className="text-sm text-gray-300">Active Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{Object.keys(stats.playerEntityCounts || {}).length}</p>
                  <p className="text-sm text-gray-300">Players</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Replay Visualization */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Replay Visualization</h2>
            <div className="text-sm text-gray-300">
              Canvas: {canvasSize.width}×{canvasSize.height}px
            </div>
          </div>
          
          <div className="flex justify-center">
            <ReplayVisualization 
              replayData={replayData}
              width={canvasSize.width}
              height={canvasSize.height}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Instructions</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-medium mb-2">Playback Controls</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Use the play/pause button to control playback</li>
                <li>• Drag the frame slider to jump to specific times</li>
                <li>• Adjust playback speed with the speed control</li>
                <li>• Click and drag on the canvas to pan around</li>
                <li>• Use mouse wheel to zoom in/out</li>
                <li>• Different shapes represent different entity types</li>
                <li>• Colors represent different players</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Loading Replays</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• <strong>Upload JSON File:</strong> Load any parsed replay JSON file</li>
                <li>• <strong>Load Sample Data:</strong> Use demo data to test the viewer</li>
                <li>• <strong>Load Parsed Replay:</strong> Load the latest parsed AOE4 replay</li>
                <li>• Replays show entity positions, health, and movement over time</li>
                <li>• Parser extracts data from AOE4 .rec files</li>
                <li>• Active entities are shown with full opacity</li>
                <li>• Destroyed/inactive entities are shown faded</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplayViewer;