import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { fetchRecentMatches, AOE4WorldMatch, getTeamSize, extractPlayersFromMatch, getMatchWinner } from '../services/aoe4world';

const router = Router();

router.get('/games', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 20); // Max 20 games
    const cursor = req.query.cursor as string;

    const client = await pool().connect();
    try {
      // Create user if they don't exist
      await client.query(`
        INSERT INTO users (auth0_sub) 
        VALUES ($1) 
        ON CONFLICT (auth0_sub) DO NOTHING
      `, [req.auth?.sub]);
      
      // Get the user_id for this auth0_sub
      const userResult = await client.query('SELECT id FROM users WHERE auth0_sub = $1', [req.auth?.sub]);
      const userId = userResult.rows[0].id;
      
      let query = `
        SELECT g.*, r.id as review_id, r.summary_md,
               array_agg(
                 json_build_object(
                   'team_number', gp.team_number,
                   'player_name', gp.player_name,
                   'civilization', gp.civilization,
                   'result', gp.result,
                   'rating', gp.rating,
                   'mmr', gp.mmr,
                   'is_user', gp.is_user
                 ) ORDER BY gp.team_number, gp.player_name
               ) as players
        FROM games g
        LEFT JOIN reviews r ON g.id = r.game_id
        LEFT JOIN game_players gp ON g.id = gp.game_id
        WHERE g.user_id = $1
      `;
      
      const params: any[] = [userId];

      if (cursor) {
        const [played_at, id] = cursor.split('|');
        query += ` AND (g.played_at, g.id) < ($${params.length + 1}, $${params.length + 2})`;
        params.push(played_at, parseInt(id));
      }

      query += ` GROUP BY g.id, r.id, r.summary_md ORDER BY g.played_at DESC, g.id DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await client.query(query, params);
      
      const games = result.rows.map(row => ({
        id: row.id,
        map_name: row.map_name,
        game_mode: row.game_mode,
        duration_seconds: row.duration_seconds,
        season: row.season,
        team_size: row.team_size,
        average_rating: row.average_rating,
        average_mmr: row.average_mmr,
        played_at: row.played_at,
        status: row.status,
        winning_team: row.winning_team,
        winner_names: row.winner_names,
        players: row.players || [],
        review: row.review_id ? {
          id: row.review_id,
          summary_md: row.summary_md
        } : null
      }));

      res.json({ games });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Games fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'GAMES_FETCH_ERROR' });
  }
});

router.post('/games/sync', authenticateToken, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  console.log('🔄 Starting game sync...');
  
  try {
    const client = await pool().connect();
    
    try {
      // Start transaction for better performance
      await client.query('BEGIN');
      
      // Get user's Steam identity with AOE4World profile
      const identityResult = await client.query(`
        SELECT i.external_id as steam_id, i.aoe4world_profile_id, u.id as user_id
        FROM users u
        JOIN identities i ON u.id = i.user_id
        WHERE u.auth0_sub = $1 AND i.provider = 'steam'
      `, [req.auth?.sub]);

      if (identityResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Steam account not linked', 
          code: 'STEAM_NOT_LINKED' 
        });
      }

      const { steam_id, aoe4world_profile_id, user_id } = identityResult.rows[0];
      
      if (!aoe4world_profile_id) {
        return res.status(400).json({ 
          error: 'AOE4World profile not found. Please re-link your Steam account to refresh AOE4World data.', 
          code: 'AOE4WORLD_PROFILE_MISSING' 
        });
      }
      
      // Fetch recent matches from AOE4World using profile_id
      console.log('📡 Fetching matches from AOE4World...');
      const fetchStart = Date.now();
      const matches = await fetchRecentMatches(aoe4world_profile_id);
      console.log(`📦 Fetched ${matches.length} matches in ${Date.now() - fetchStart}ms`);
      
      let syncedCount = 0;
      let newCount = 0;
      
      console.log('💾 Processing matches in database...');
      const dbStart = Date.now();
      
      // Prepare batch data
      let gameValues: any[][] = [];
      let playerValues: any[][] = [];
      const gameIds: number[] = [];
      
      for (const match of matches) {
        const playedAt = new Date(match.started_at);
        const teamSize = getTeamSize(match);
        const players = extractPlayersFromMatch(match);
        const winner = getMatchWinner(match);
        
        gameIds.push(match.game_id);
        
        // Only insert game for the current user
        gameValues.push([
          match.game_id,
          user_id,
          match.map || 'Unknown Map',
          match.kind || 'unknown',
          match.duration || 0,
          match.season || 0,
          match.patch || 0,
          match.server || 'unknown',
          teamSize,
          match.average_rating || null,
          match.average_mmr || null,
          playedAt,
          winner.winningTeam,
          winner.winnerNames
        ]);
        
        // Prepare player data
        for (const { teamNumber, player } of players) {
          const isCurrentUser = player.profile_id === parseInt(aoe4world_profile_id);
          playerValues.push([
            match.game_id,
            teamNumber,
            player.name || 'Unknown Player',
            player.profile_id,
            player.civilization || 'unknown',
            player.result || 'unknown',
            player.rating,
            player.mmr || 0,
            player.rating_diff,
            player.mmr_diff,
            player.input_type || 'unknown',
            player.country || 'unknown',
            isCurrentUser
          ]);
        }
      }
      
      // Check existing games for this user
      if (gameIds.length > 0) {
        const existingGamesResult = await client.query(
          `SELECT id FROM games WHERE id = ANY($1) AND user_id = $2`,
          [gameIds, user_id]
        );
        const existingGameIds = new Set(existingGamesResult.rows.map(row => row.id));
        
        // Filter out games that already exist for this user
        gameValues = gameValues.filter(gameRow => {
          const gameId = gameRow[0];
          return !existingGameIds.has(gameId);
        });
        
        // Also filter playerValues to only include players for games we're inserting
        playerValues = playerValues.filter(playerRow => {
          const gameId = playerRow[0];
          return !existingGameIds.has(gameId);
        });
        
        newCount = gameValues.length;
      }
      
      // Batch upsert games
      if (gameValues.length > 0) {
        const gameValueStrings = gameValues.map((_, i) => {
          const start = i * 14 + 1;
          return `($${start}, $${start+1}, $${start+2}, $${start+3}, $${start+4}, $${start+5}, $${start+6}, $${start+7}, $${start+8}, $${start+9}, $${start+10}, $${start+11}, 'raw', $${start+12}, $${start+13})`;
        }).join(', ');
        
        const flatGameValues = gameValues.flat();
        
        await client.query(`
          INSERT INTO games (
            id, user_id, map_name, game_mode, duration_seconds, season, patch, server,
            team_size, average_rating, average_mmr, played_at, status, winning_team, winner_names
          ) VALUES ${gameValueStrings}
          ON CONFLICT ON CONSTRAINT games_aoe4world_id_user_unique DO UPDATE SET
            map_name = EXCLUDED.map_name,
            game_mode = EXCLUDED.game_mode,
            duration_seconds = EXCLUDED.duration_seconds,
            season = EXCLUDED.season,
            patch = EXCLUDED.patch,
            server = EXCLUDED.server,
            team_size = EXCLUDED.team_size,
            average_rating = EXCLUDED.average_rating,
            average_mmr = EXCLUDED.average_mmr,
            played_at = EXCLUDED.played_at,
            winning_team = EXCLUDED.winning_team,
            winner_names = EXCLUDED.winner_names
        `, flatGameValues);
      }
      
      // Delete existing players for the games we're inserting (batch operation)
      const gamesToInsert = gameValues.map(row => row[0]);
      if (gamesToInsert.length > 0) {
        await client.query('DELETE FROM game_players WHERE game_id = ANY($1)', [gamesToInsert]);
      }
      
      // Batch insert players
      if (playerValues.length > 0) {
        const playerValueStrings = playerValues.map((_, i) => {
          const start = i * 13 + 1;
          return `($${start}, $${start+1}, $${start+2}, $${start+3}, $${start+4}, $${start+5}, $${start+6}, $${start+7}, $${start+8}, $${start+9}, $${start+10}, $${start+11}, $${start+12})`;
        }).join(', ');
        
        const flatPlayerValues = playerValues.flat();
        
        await client.query(`
          INSERT INTO game_players (
            game_id, team_number, player_name, profile_id, civilization, result,
            rating, mmr, rating_diff, mmr_diff, input_type, country, is_user
          ) VALUES ${playerValueStrings}
        `, flatPlayerValues);
      }
      
      syncedCount = matches.length;
      
      console.log(`💾 Database processing completed in ${Date.now() - dbStart}ms`);
      
      // Commit transaction
      await client.query('COMMIT');
      console.log(`✅ Sync completed in ${Date.now() - startTime}ms total`);
      
      res.json({ 
        success: true, 
        synced: syncedCount,
        new: newCount,
        total_matches: matches.length
      });
      
    } catch (error) {
      console.error('Game sync error:', error);
      // Rollback transaction on error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      
      // Check if it's a column error
      if (error instanceof Error && 'code' in error) {
        const pgError = error as any;
        if (pgError.code === '42703') { // undefined_column
          console.error('Missing column:', pgError.message);
          throw new Error(`Database schema is outdated. Missing column: ${pgError.message}`);
        }
      }
      
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Game sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync games', 
      code: 'GAME_SYNC_ERROR' 
    });
  }
});

export default router;