import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ModelSelectionModal from '../components/ModelSelectionModal';

interface GamePlayer {
  team_number: number;
  player_name: string;
  civilization: string;
  result: string;
  rating: number | null;
  mmr: number | null;
  is_user: boolean;
}

interface Game {
  id: number;
  map_name: string;
  game_mode: string;
  duration_seconds: number;
  season: number;
  team_size: string;
  average_rating: number | null;
  average_mmr: number | null;
  played_at: string;
  status: 'raw' | 'reviewing' | 'reviewed';
  winning_team: number | null;
  winner_names: string[] | null;
  players: GamePlayer[];
  review?: {
    id: string;
    summary_md: string;
  };
}

interface GamesResponse {
  games: Game[];
}

const Games: React.FC = () => {
  const { getToken, refreshTokens, tokens } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewingGames, setReviewingGames] = useState<Set<number>>(new Set());
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const hasInitialized = useRef(false);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  const autoSyncAndLoadGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();

      // First sync games from AOE4World
      const syncResponse = await fetch(`${apiBase}/api/v1/games/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (syncResponse.ok) {
        console.log('Games synced successfully');
      } else {
        console.warn('Game sync failed, proceeding to load existing games');
      }

      // Then load games (whether sync succeeded or failed)
      const gamesResponse = await fetch(`${apiBase}/api/v1/games`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (gamesResponse.ok) {
        const data: GamesResponse = await gamesResponse.json();
        setGames(data.games);
      } else {
        console.error('Failed to load games');
      }
    } catch (error) {
      console.error('Error syncing and loading games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, getToken]);

  const loadGames = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/games`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: GamesResponse = await response.json();
        setGames(data.games);
      } else {
        console.error('Failed to load games');
      }
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [apiBase, getToken]);


  const handleRequestReview = (gameId: number) => {
    setSelectedGameId(gameId);
    setModelModalOpen(true);
  };

  const handleModelSelection = (type: 'regular' | 'elite') => {
    if (selectedGameId) {
      requestReview(selectedGameId, type);
    }
  };

  const requestReview = async (gameId: number, type: 'regular' | 'elite') => {
    setReviewingGames(prev => new Set(prev).add(gameId));

    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/v1/games/${gameId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        // Update game status to reviewing
        setGames(prev => prev.map(game =>
          game.id === gameId
            ? { ...game, status: 'reviewing' as const }
            : game
        ));

        // Refresh token count after successful request
        console.log('Review request successful, refreshing tokens...');
        refreshTokens();
        setErrorMessage(null);
      } else {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.code === 'INSUFFICIENT_TOKENS') {
          setErrorMessage('Insufficient tokens! You need at least 1 token to request a review.');
        } else {
          setErrorMessage(errorData.error || 'Failed to request review');
        }

        console.error('Failed to request review:', errorData);
      }
    } catch (error) {
      console.error('Error requesting review:', error);
    } finally {
      setReviewingGames(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMapName = (game: Game) => {
    return game.map_name || 'Unknown Map';
  };

  const getMapImage = (mapName: string) => {
    // Real AOE4World map images
    const mapImages: { [key: string]: string } = {
      'Dry Arabia': 'https://static.aoe4world.com/assets/maps/dry_arabia-a38664e3a1140c77c184c56ce6ccc91b83ab9bf9e69f463621bf4acc6e663240.png',
      'Gorge': 'https://static.aoe4world.com/assets/maps/gorge-2957c507ddfc9f5dd65204119a742da12c2e29bb6b462537f88dcc624d1a423d.png',
      'Hideout': 'https://static.aoe4world.com/assets/maps/hideout-844a7defa35996b750bc7ddd26d0ba0bc3185bc407bfb0f07b3d391982c96471.png',
      'Altai': 'https://static.aoe4world.com/assets/maps/altai-9b272a24dce7dfa3a2e60579a801e7152a4a94f041340ee81bef913d9cc70c6c.png',
      'Rocky River': 'https://static.aoe4world.com/assets/maps/rocky_river-b89f84bf6594d401f8c3b3aa2ca4e84bbdd2204047ea84d8d0ee4a46348d6cf2.png',
      'Canal': 'https://static.aoe4world.com/assets/maps/canal-11ab0ebadc68ee8903829b57d072ecb42032ab5fde67fcc05e976ab1cbf5a42d.png',
      'Enlightened Horizon': 'https://static.aoe4world.com/assets/maps/enlightened_horizon-34781d4de7032a57264b8688301c843f23ecc579603ddc33f516750a25f7654a.png',
      'Highwoods': 'https://static.aoe4world.com/assets/maps/highwoods-1d6f265e447792523bc13610877d5bf7b5cde9a3a198d42931a367113db11786.png',
      'Forts': 'https://static.aoe4world.com/assets/maps/forts-46770b9ab10c2ebb50eafa0678cb53bc9aa169719c325334a3d8de883a48846b.png',
      'Wasteland': 'https://static.aoe4world.com/assets/maps/wasteland-35843249b21260d26ae682b58248ee902d5b19e9d1cb5975567b6d0a533dbb4d.png',
      'King of the Hill': 'https://static.aoe4world.com/assets/maps/king_of_the_hill-17717abfb688a8e8ea05bb4a0799dced0c13a3cfc864fa28fb6bf2d010e77180.png',
      'Turtle Ridge': 'https://static.aoe4world.com/assets/maps/turtle_ridge-ec0639f315c99c9a69a540ba9d63e3551408af0809e6d4ea50af07492a325c83.png',
      'Continental': 'https://static.aoe4world.com/assets/maps/continental-7454fffd4e627b4db810724073160f1bdd927c0e560c629e31a3274065c46dda.png',
      'Ancient Spires': 'https://static.aoe4world.com/assets/maps/ancient_spires-f6d4ed2baecb3e883eed7abbb0bc2d0cd9b0ade0b06052886455f9d903064c45.png',
      'Mountain Pass': 'https://static.aoe4world.com/assets/maps/mountain_pass-0b69b081bdb9f8df2c302d3ac3b8847a27f49e75631e2d677fa2f3b730d6ef04.png',
      'African Waters': 'https://static.aoe4world.com/assets/maps/african_waters-6fd00264b0a97fe8acdd8982b9bf95407d332bd03befc7135ed5e50ec2477585.png',
      'Flankwoods': 'https://static.aoe4world.com/assets/maps/flankwoods-94f77a90a2e3b8a77e1698d2eb0d29916d03fa1ba110a4c3ab097fe6e1576ec9.png',
      'Archipelago': 'https://static.aoe4world.com/assets/maps/archipelago-a7d9ad10b053de85fa60aafe2e2d468129aab28b65b7649b9424a9c1ed2e382a.png',
      'Sunkenlands': 'https://static.aoe4world.com/assets/maps/sunkenlands-2cb6fccb7a7532991354b7f4145494efdd581671409ec5203239146b6a71e5ba.png',
      'Cliffside': 'https://static.aoe4world.com/assets/maps/cliffside-02b81ebe7ca8aae7124a42ecdae93f236d62b7cae3f751ca0e4c5437d3b70afe.png',
      'Glade': 'https://static.aoe4world.com/assets/maps/glade-158cc025ccea142d30020d94e38ef780d99a0f5c307e35439d2a1bc607798075.png',
      'Four Lakes': 'https://static.aoe4world.com/assets/maps/four_lakes-eb90c0b139243782a53f6ce4fb4227d1f6827e9e00672d11a1879a58fa2737aa.png',
      'Relic River': 'https://static.aoe4world.com/assets/maps/relic_river-691237e37dc0ab45b9462b29f6661b4540c899baa4601bac41f692cfec889a10.png',
      'Carmel': 'https://static.aoe4world.com/assets/maps/carmel-78bdc24e1ccb991db6e122afb6f021ab2ffcfc57e6721aaf65533988dfc79213.png'
    };

    const normalizedMapName = mapName.trim();

    // Return real image URL or fallback to placeholder
    return mapImages[normalizedMapName] || `https://via.placeholder.com/300x200/374151/6B7280?text=${encodeURIComponent(mapName)}`;
  };

  const getCivFlag = (civName: string) => {
    // Real AOE4World civilization flags
    const civFlags: { [key: string]: string } = {
      'abbasid_dynasty': 'https://static.aoe4world.com/assets/flags/abbasid_dynasty-b722e3e4ee862226395c692e73cd14c18bc96c3469874d2e0d918305c70f8a69.png',
      'ayyubids': 'https://static.aoe4world.com/assets/flags/ayyubids-9ba464806c83e293ac43e19e55dddb80f1fba7b7f5bcb6f7e53b48c4b9c83c9e.png',
      'byzantines': 'https://static.aoe4world.com/assets/flags/byzantines-cfe0492a2ed33b486946a92063989a9500ae54d9301178ee55ba6b4d4c7ceb84.png',
      'chinese': 'https://static.aoe4world.com/assets/flags/chinese-2d4edb3d7fc7ab5e1e2df43bd644aba4d63992be5a2110ba3163a4907d0f3d4e.png',
      'delhi_sultanate': 'https://static.aoe4world.com/assets/flags/delhi_sultanate-7f92025d0623b8e224533d9f28b9cd7c51a5ff416ef3edaf7cc3e948ee290708.png',
      'delhi': 'https://static.aoe4world.com/assets/flags/delhi_sultanate-7f92025d0623b8e224533d9f28b9cd7c51a5ff416ef3edaf7cc3e948ee290708.png',
      'english': 'https://static.aoe4world.com/assets/flags/english-8c6c905d0eb11d6d314b9810b2a0b9c09eec69afb38934f55b329df36468daf2.png',
      'french': 'https://static.aoe4world.com/assets/flags/french-c3474adb98d8835fb5a86b3988d6b963a1ac2a8327d136b11fb0fd0537b45594.png',
      'house_of_lancaster': 'https://static.aoe4world.com/assets/flags/house_of_lancaster-4b590484b88bb49e122c8e7933913f35774fd4d2c5e1505fdc93b628da8b6174.png',
      'holy_roman_empire': 'https://static.aoe4world.com/assets/flags/holy_roman_empire-fc0be4151234fc9ac8f83e10c83b4befe79f22f7a8f6ec1ff03745d61adddb4c.png',
      'hre': 'https://static.aoe4world.com/assets/flags/holy_roman_empire-fc0be4151234fc9ac8f83e10c83b4befe79f22f7a8f6ec1ff03745d61adddb4c.png',
      'japanese': 'https://static.aoe4world.com/assets/flags/japanese-16a9b5bae87a5494d5a002cf7a2c2c5de5cead128a965cbf3a89eeee8292b997.png',
      'jeanne_darc': 'https://static.aoe4world.com/assets/flags/jeanne_darc-aeec47c19181d6af7b08a015e8a109853d7169d02494b25208d3581e38d022eb.png',
      'knights_templar': 'https://static.aoe4world.com/assets/flags/knights_templar-0dc0979a16240ed364b6859ec9aef4cd53f059144ee45b6fd3ea7bfaea209b16.png',
      'malians': 'https://static.aoe4world.com/assets/flags/malians-edb6f54659da3f9d0c5c51692fd4b0b1619850be429d67dbe9c3a9d53ab17ddd.png',
      'mongols': 'https://static.aoe4world.com/assets/flags/mongols-7ce0478ab2ca1f95d0d879fecaeb94119629538e951002ac6cb936433c575105.png',
      'order_of_the_dragon': 'https://static.aoe4world.com/assets/flags/order_of_the_dragon-cad6fa9212fd59f9b52aaa83b4a6173f07734d38d37200f976bcd46827667424.png',
      'ottomans': 'https://static.aoe4world.com/assets/flags/ottomans-83c752dcbe46ad980f6f65dd719b060f8fa2d0707ab8e2ddb1ae5d468fc019a2.png',
      'rus': 'https://static.aoe4world.com/assets/flags/rus-cb31fb6f8663187f63136cb2523422a07161c792de27852bdc37f0aa1b74911b.png',
      'zhu_xis_legacy': 'https://static.aoe4world.com/assets/flags/zhu_xis_legacy-c4d119a5fc11f2355f41d206a8b65bea8bab2286d09523a81b7d662d1aad0762.png'
    };

    const normalizedCivName = civName.toLowerCase().trim().replace(/\s+/g, '_');
    return civFlags[normalizedCivName] || `https://via.placeholder.com/32x24/374151/E2E8F0?text=${civName.charAt(0).toUpperCase()}`;
  };


  const getAllPlayerFlags = (game: Game): { team1: GamePlayer[]; team2: GamePlayer[]; } => {
    if (!game.players || game.players.length === 0) return { team1: [], team2: [] };

    // Group players by team
    const team1 = game.players.filter(p => p.team_number === 1);
    const team2 = game.players.filter(p => p.team_number === 2);

    return { team1, team2 };
  };


  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  const getUserResult = (game: Game) => {
    const userPlayer = game.players?.find(p => p.is_user);
    return userPlayer?.result || 'unknown';
  };


  // Start polling when there are games in reviewing status
  const startPolling = useCallback(() => {
    if (pollingInterval) return; // Already polling

    const interval = setInterval(() => {
      loadGames(false); // Reload without showing loading spinner
    }, 5000); // Poll every 5 seconds

    setPollingInterval(interval);
  }, [pollingInterval, loadGames]);

  // Stop polling when no games are reviewing
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Effect to manage polling based on game status
  useEffect(() => {
    const hasReviewingGames = games.some(game => game.status === 'reviewing');

    if (hasReviewingGames && !pollingInterval) {
      startPolling();
    } else if (!hasReviewingGames && pollingInterval) {
      stopPolling();
    }
  }, [games, pollingInterval, startPolling, stopPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      autoSyncAndLoadGames();
    }
  }, []); // Run only once on mount

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Hero Header */}
        <div className="mb-8 sm:mb-12 text-center">
          <div className="inline-flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-ping"></div>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Battle Archive
            </h1>
          </div>
          <p className="text-sm sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-4">
            Your legendary AOE4 conquests await analysis. Discover strategic insights from every battle.
          </p>
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Sync Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-500"></div>
              <span>AI Analysis Ready</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 mx-auto max-w-2xl">
            <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-200 text-sm font-medium">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-500/50 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">Syncing Battle Data</h3>
                <p className="text-gray-400">Fetching your latest conquests...</p>
                <div className="flex items-center justify-center space-x-1 mt-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`w-2 h-2 bg-orange-400 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.2}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : games.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center mx-auto shadow-2xl border border-gray-700">
                <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500/20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Ready for Battle</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">Link your Steam account and start playing AOE4 matches to see your epic battles here</p>
            <button
              onClick={() => navigate('/settings')}
              className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/25"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span>Connect Steam Account</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        ) : (
          /* Games List */
          <div className="space-y-6">
            {games.map((game) => (
              <div
                key={game.id}
                className="group relative bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-700/60 hover:border-orange-500/30 transition-all duration-200 hover:shadow-xl hover:shadow-orange-500/5 overflow-hidden transform hover:scale-[1.01]"
              >
                {/* Subtle glow effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 via-purple-500/2 to-blue-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl pointer-events-none"></div>

                <div className="relative flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6">
                  {/* Left Section - Enhanced Map Image */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <div className="relative w-full h-32 sm:w-40 sm:h-28 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 group-hover:ring-orange-400/30 transition-all duration-300">
                      <img
                        src={getMapImage(getMapName(game))}
                        alt={getMapName(game)}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                        onError={(e) => {
                          e.currentTarget.src = `https://via.placeholder.com/160x112/374151/6B7280?text=${encodeURIComponent(getMapName(game))}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-xs sm:text-sm font-bold truncate drop-shadow-lg">{getMapName(game)}</p>
                      </div>
                      {/* Enhanced Status Indicator */}
                      <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white/80 ${game.status === 'reviewed'
                          ? 'bg-green-400 shadow-lg shadow-green-400/60'
                          : game.status === 'reviewing'
                            ? 'bg-orange-400 animate-pulse shadow-lg shadow-orange-400/60'
                            : 'bg-gray-400 shadow-lg shadow-gray-400/60'
                        }`}>
                        <div className={`absolute inset-0.5 rounded-full ${game.status === 'reviewed'
                            ? 'bg-green-300'
                            : game.status === 'reviewing'
                              ? 'bg-orange-300'
                              : 'bg-gray-300'
                          }`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Center Section - Enhanced Game Info */}
                  <div className="flex-1 min-w-0">
                    {/* Header with all player flags */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 sm:space-x-4 overflow-hidden flex-1 h-[50px]">
                        {(() => {
                          const { team1, team2 } = getAllPlayerFlags(game);
                          return (
                            <div className="flex items-center space-x-3 sm:space-x-6">
                              {/* Team 1 */}
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                {team1.map((player: GamePlayer, index: number) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={getCivFlag(player.civilization)}
                                      alt={player.civilization}
                                      className="w-6 h-4 sm:w-8 sm:h-6 object-cover rounded-md border-2 border-blue-400/60 shadow-lg hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        e.currentTarget.src = `https://via.placeholder.com/32x24/374151/E2E8F0?text=${player.civilization.charAt(0).toUpperCase()}`;
                                      }}
                                    />
                                    {player.is_user && (
                                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full border border-white/50"></div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* VS Divider */}
                              <div className="flex items-center">
                                <span className="mx-1 sm:mx-1 text-sm sm:text-lg font-bold text-orange-400">VS</span>
                              </div>

                              {/* Team 2 */}
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                {team2.map((player: GamePlayer, index: number) => (
                                  <div key={index} className="relative">
                                    <img
                                      src={getCivFlag(player.civilization)}
                                      alt={player.civilization}
                                      className="w-6 h-4 sm:w-8 sm:h-6 object-cover rounded-md border-2 border-red-400/60 shadow-lg hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        e.currentTarget.src = `https://via.placeholder.com/32x24/374151/E2E8F0?text=${player.civilization.charAt(0).toUpperCase()}`;
                                      }}
                                    />
                                    {player.is_user && (
                                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full border border-white/50"></div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-right bg-gray-800/50 px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-gray-700/50">
                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Status</p>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${game.status === 'reviewed' ? 'bg-green-400' :
                              game.status === 'reviewing' ? 'bg-orange-400 animate-pulse' : 'bg-gray-400'
                            }`}></div>
                          <span className={`text-sm font-bold ${game.status === 'reviewed' ? 'text-green-400' :
                              game.status === 'reviewing' ? 'text-orange-400' : 'text-gray-400'
                            }`}>
                            {game.status === 'reviewed' ? 'Reviewed' :
                              game.status === 'reviewing' ? 'Reviewing...' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Game Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-2 sm:p-3 border border-blue-500/20">
                        <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide mb-1">⚔️ Mode</p>
                        <p className="text-sm sm:text-lg font-bold text-white">{game.team_size}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-2 sm:p-3 border border-purple-500/20">
                        <p className="text-xs text-purple-300 font-semibold uppercase tracking-wide mb-1">🏆 Result</p>
                        <span className={`text-sm sm:text-lg font-bold ${getUserResult(game) === 'win' ? 'text-green-400' :
                            getUserResult(game) === 'loss' ? 'text-red-400' : 'text-gray-400'
                          }`}>
                          {getUserResult(game) === 'unknown' ? 'TBD' : getUserResult(game).toUpperCase()}
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-lg p-2 sm:p-3 border border-orange-500/20">
                        <p className="text-xs text-orange-300 font-semibold uppercase tracking-wide mb-1">⏱️ Duration</p>
                        <p className="text-sm sm:text-lg font-bold text-white">{formatDuration(game.duration_seconds)}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-2 sm:p-3 border border-green-500/20 col-span-2 sm:col-span-1">
                        <p className="text-xs text-green-300 font-semibold uppercase tracking-wide mb-1">📅 Played</p>
                        <p className="text-sm sm:text-lg font-bold text-white">{formatDate(game.played_at).split(',')[0]}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Enhanced Actions */}
                  <div className="flex-shrink-0 flex flex-col sm:justify-center space-y-2 sm:space-y-3 mt-4 sm:mt-0">
                    {game.status === 'raw' && (
                      <button
                        onClick={() => handleRequestReview(game.id)}
                        disabled={reviewingGames.has(game.id)}
                        className={`group/btn relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 transform hover:scale-105 ${reviewingGames.has(game.id)
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-xl hover:shadow-blue-500/30'
                          }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                          <span>{reviewingGames.has(game.id) ? 'Processing...' : 'Review Battle'}</span>
                        </span>
                      </button>
                    )}

                    {game.status === 'reviewing' && (
                      <div className="relative px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-600/20 to-orange-500/20 border-2 border-orange-500/40 rounded-xl text-orange-300 text-xs sm:text-sm font-bold text-center">
                        <div className="absolute inset-0 bg-orange-400/10 rounded-xl animate-pulse"></div>
                        <span className="relative flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Reviewing Battle...</span>
                        </span>
                      </div>
                    )}

                    {game.review && (
                      <button
                        onClick={() => navigate(`/review/${game.review!.id}`)}
                        className="group/btn relative px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-green-500/30"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-green-600/20 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>View Analysis</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Player Details */}
                {game.players && game.players.length > 0 && (
                  <div className="border-t border-gray-700/50 px-4 sm:px-5 py-3 sm:py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {[1, 2].map(teamNum => {
                        const teamPlayers = game.players.filter(p => p.team_number === teamNum);
                        if (teamPlayers.length === 0) return null;

                        return (
                          <div key={teamNum}>
                            <h6 className={`text-xs font-bold uppercase tracking-wide mb-2 ${teamNum === 1 ? 'text-blue-400' : 'text-red-400'
                              }`}>Team {teamNum}</h6>
                            <div className="space-y-1">
                              {teamPlayers.map((player, idx) => (
                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                  <img
                                    src={getCivFlag(player.civilization)}
                                    alt={player.civilization}
                                    className="w-4 h-3 object-cover rounded shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://via.placeholder.com/16x12/374151/E2E8F0?text=${player.civilization.charAt(0).toUpperCase()}`;
                                    }}
                                  />
                                  <span className={`font-medium truncate ${player.is_user ? 'text-blue-300' : 'text-gray-300'
                                    }`}>
                                    {player.player_name}
                                  </span>
                                  {player.rating && (
                                    <span className="text-xs text-orange-400 font-bold">
                                      {player.rating}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Review Summary */}
                {game.review && (
                  <div className="border-t border-gray-700/50 px-4 sm:px-5 py-3 sm:py-4 bg-green-900/10">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-bold text-green-400">✨ AI Analysis Available</h5>
                      <button
                        onClick={() => navigate(`/review/${game.review!.id}`)}
                        className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors duration-200"
                      >
                        View Full Analysis →
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {game.review.summary_md.split('\n')[0] || 'Strategic analysis completed with tactical insights.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        isOpen={modelModalOpen}
        onClose={() => {
          setModelModalOpen(false);
          setSelectedGameId(null);
        }}
        onConfirm={handleModelSelection}
        userTokens={tokens}
      />
    </div>
  );
};

export default Games;