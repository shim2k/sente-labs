interface AOE4WorldGamePlayer {
  profile_id: number;
  name: string;
  country: string;
  result: string;
  civilization: string;
  civilization_randomized: boolean;
  rating: number | null;
  rating_diff: number | null;
  mmr: number | null;
  mmr_diff: number | null;
  input_type: string;
}

interface AOE4WorldMatch {
  game_id: number;
  started_at: string;
  updated_at: string;
  duration: number;
  map: string;
  kind: string;
  leaderboard: string;
  mmr_leaderboard: string;
  season: number;
  server: string;
  patch: number;
  average_rating: number;
  average_rating_deviation: number | null;
  average_mmr: number;
  average_mmr_deviation: number;
  ongoing: boolean;
  just_finished: boolean;
  teams: Array<Array<{ player: AOE4WorldGamePlayer }>>;
}

interface AOE4WorldResponse {
  games: AOE4WorldMatch[];
}

interface AOE4WorldPlayer {
  name: string;
  profile_id: number;
  steam_id: string;
  site_url: string;
  avatars: {
    small: string;
    medium: string;
    full: string;
  };
  country: string;
  rating: number;
  rank: number;
  rank_level: string;
  streak: number;
  games_count: number;
  wins_count: number;
  losses_count: number;
  last_game_at: string;
  win_rate: number;
}

interface AOE4WorldAutocompleteResponse {
  query: string;
  leaderboard: string;
  count: number;
  players: AOE4WorldPlayer[];
}

export async function searchAOE4WorldProfile(steamId: string): Promise<AOE4WorldPlayer | null> {
  try {
    const response = await fetch(`https://aoe4world.com/api/v0/players/autocomplete?query=${steamId}&limit=10&leaderboard=rm_1v1`);
    
    if (!response.ok) {
      throw new Error(`AOE4World API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as AOE4WorldAutocompleteResponse;
    
    // Look for exact Steam ID match
    const exactMatch = data.players.find(player => player.steam_id === steamId);
    if (exactMatch) {
      return exactMatch;
    }
    
    // If no exact match, return the first player if any
    return data.players.length > 0 ? data.players[0] : null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search AOE4World profile: ${error.message}`);
    }
    throw new Error('Failed to search AOE4World profile: Unknown error');
  }
}

export async function fetchRecentMatches(profileId: string): Promise<AOE4WorldMatch[]> {
  try {
    const response = await fetch(`https://aoe4world.com/api/v0/players/${profileId}/games?count=20`);
    
    if (!response.ok) {
      throw new Error(`AOE4World API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as AOE4WorldResponse;
    
    // Sort games by started_at descending (most recent first) and take the last 20
    const sortedGames = (data.games || [])
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 20);
    
    return sortedGames;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch AOE4World data: ${error.message}`);
    }
    throw new Error('Failed to fetch AOE4World data: Unknown error');
  }
}

export async function fetchGameSummary(profileId: string, steamId: string, gameId: string): Promise<any> {
  try {
    const response = await fetch(`https://aoe4world.com/players/${profileId}-${steamId}/games/${gameId}/summary`);
    
    if (!response.ok) {
      throw new Error(`AOE4World API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch game summary: ${error.message}`);
    }
    throw new Error('Failed to fetch game summary: Unknown error');
  }
}

// Helper function to determine team size from AOE4World match
export function getTeamSize(match: AOE4WorldMatch): string {
  if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) {
    return '1v1';
  }
  
  const team1Size = match.teams[0]?.length || 1;
  const team2Size = match.teams[1]?.length || 1;
  return `${team1Size}v${team2Size}`;
}

// Helper function to extract all players from match teams
export function extractPlayersFromMatch(match: AOE4WorldMatch): Array<{
  teamNumber: number;
  player: AOE4WorldGamePlayer;
}> {
  const players: Array<{ teamNumber: number; player: AOE4WorldGamePlayer }> = [];
  
  if (match.teams && Array.isArray(match.teams)) {
    match.teams.forEach((team, teamIndex) => {
      team.forEach(playerWrapper => {
        if (playerWrapper.player) {
          players.push({
            teamNumber: teamIndex + 1,
            player: playerWrapper.player
          });
        }
      });
    });
  }
  
  return players;
}

// Helper function to determine the winner from match data
export function getMatchWinner(match: AOE4WorldMatch): {
  winningTeam: number | null;
  winnerNames: string[];
} {
  if (!match.teams || !Array.isArray(match.teams) || match.teams.length < 2) {
    return { winningTeam: null, winnerNames: [] };
  }

  // Check each team for winners
  for (let teamIndex = 0; teamIndex < match.teams.length; teamIndex++) {
    const team = match.teams[teamIndex];
    if (team && team.length > 0) {
      // Check if any player in this team won
      const hasWinner = team.some(playerWrapper => 
        playerWrapper.player && playerWrapper.player.result === 'win'
      );
      
      if (hasWinner) {
        const winnerNames = team
          .filter(playerWrapper => playerWrapper.player && playerWrapper.player.result === 'win')
          .map(playerWrapper => playerWrapper.player.name);
        
        return {
          winningTeam: teamIndex + 1, // 1-indexed team numbers
          winnerNames
        };
      }
    }
  }

  return { winningTeam: null, winnerNames: [] };
}

export { AOE4WorldMatch, AOE4WorldPlayer, AOE4WorldGamePlayer };