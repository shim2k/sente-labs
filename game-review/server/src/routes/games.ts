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
        SELECT g.*, latest_review.review_id, latest_review.summary_md, g.players
        FROM games g
        LEFT JOIN (
          SELECT r.game_db_id, r.id as review_id, r.summary_md,
                 ROW_NUMBER() OVER (PARTITION BY r.game_db_id ORDER BY r.generated_at DESC) as rn
          FROM reviews r
        ) latest_review ON g.db_id = latest_review.game_db_id AND latest_review.rn = 1
        WHERE g.user_id = $1
      `;
      
      const params: any[] = [userId];

      if (cursor) {
        const [played_at, id] = cursor.split('|');
        query += ` AND (g.played_at, g.id) < ($${params.length + 1}, $${params.length + 2})`;
        params.push(played_at, parseInt(id));
      }

      query += ` ORDER BY g.played_at DESC, g.id DESC LIMIT $${params.length + 1}`;
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

      const { aoe4world_profile_id, user_id } = identityResult.rows[0];
      
      if (!aoe4world_profile_id) {
        return res.status(400).json({ 
          error: 'AOE4World profile not found. Please re-link your Steam account to refresh AOE4World data.', 
          code: 'AOE4WORLD_PROFILE_MISSING' 
        });
      }
      
      // Fetch recent matches from AOE4World
      console.log('📡 Fetching matches from AOE4World...');
      const fetchStart = Date.now();
      const matches = await fetchRecentMatches(aoe4world_profile_id);
      console.log(`📦 Fetched ${matches.length} matches in ${Date.now() - fetchStart}ms`);
      
      console.log('💾 Processing matches in database...');
      const dbStart = Date.now();
      
      // Prepare batch data for games with embedded players
      const gameValues: any[][] = [];
      
      console.log(`📦 Processing ${matches.length} matches for sync`);
      
      // Use a transaction for better performance and consistency
      await client.query('BEGIN');
      
      try {
        // Remove all non-reviewed games for this user to keep only the latest 20 + reviewed ones
        const deleteResult = await client.query(
          `DELETE FROM games WHERE user_id = $1 AND status = 'raw'`,
          [user_id]
        );
        console.log(`🗑️ Removed ${deleteResult.rowCount} unreviewed games for user`);
        
        for (const match of matches) {
          const playedAt = new Date(match.started_at);
          const teamSize = getTeamSize(match);
          const players = extractPlayersFromMatch(match);
          const winner = getMatchWinner(match);
          
          // Convert players to JSON format
          const playersJson = players.map(({ teamNumber, player }) => {
            const isCurrentUser = player.profile_id === parseInt(aoe4world_profile_id);
            return {
              team_number: teamNumber,
              player_name: player.name || 'Unknown Player',
              profile_id: player.profile_id,
              civilization: player.civilization || 'unknown',
              result: player.result || 'unknown',
              rating: player.rating,
              mmr: player.mmr,
              rating_diff: player.rating_diff,
              mmr_diff: player.mmr_diff,
              input_type: player.input_type || 'unknown',
              country: player.country || 'unknown',
              is_user: isCurrentUser
            };
          });
          
          console.log(`🎯 Processing game ${match.game_id} with ${players.length} players`);
          
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
            winner.winnerNames,
            JSON.stringify(playersJson)
          ]);
        }
        
        console.log(`🏆 Total gameValues collected: ${gameValues.length}`);
        
        // Batch insert games with players
        if (gameValues.length > 0) {
          const gameValueStrings = gameValues.map((_, i) => {
            const start = i * 15 + 1;
            return `($${start}, $${start+1}, $${start+2}, $${start+3}, $${start+4}, $${start+5}, $${start+6}, $${start+7}, $${start+8}, $${start+9}, $${start+10}, $${start+11}, 'raw', $${start+12}, $${start+13}, $${start+14})`;
          }).join(', ');
          
          const flatGameValues = gameValues.flat();
          
          await client.query(`
            INSERT INTO games (
              id, user_id, map_name, game_mode, duration_seconds, season, patch, server,
              team_size, average_rating, average_mmr, played_at, status, winning_team, winner_names, players
            ) VALUES ${gameValueStrings}
            ON CONFLICT (id, user_id) DO UPDATE SET
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
              winner_names = EXCLUDED.winner_names,
              players = EXCLUDED.players
          `, flatGameValues);
          
          console.log(`✅ Successfully inserted ${gameValues.length} games with embedded players`);
        }
        
        await client.query('COMMIT');
        console.log(`✅ Batch inserted ${gameValues.length} games with embedded players`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
      console.log(`💾 Database processing completed in ${Date.now() - dbStart}ms`);
      console.log(`✅ Sync completed in ${Date.now() - startTime}ms total`);
      
      res.json({ 
        success: true, 
        synced: matches.length,
        new: gameValues.length,
        total_matches: matches.length
      });
      
    } catch (error) {
      console.error('Game sync error:', error);
      
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