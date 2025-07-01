import { Router } from 'express';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { searchAOE4WorldProfile } from '../services/aoe4world';

const router = Router();

router.get('/identities', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const client = await pool().connect();
    try {
      // Get user identities
      const result = await client.query(`
        SELECT i.provider, i.external_id, i.username, i.aoe4world_profile_id, i.aoe4world_username
        FROM identities i
        JOIN users u ON i.user_id = u.id
        WHERE u.auth0_sub = $1
      `, [req.auth?.sub]);

      const identities: {
        steam: any;
        discord: any;
      } = {
        steam: null,
        discord: null
      };

      result.rows.forEach(row => {
        if (row.provider === 'steam') {
          identities.steam = {
            steamId: row.external_id,
            aoe4world_profile_id: row.aoe4world_profile_id,
            aoe4world_username: row.aoe4world_username
          };
        } else if (row.provider === 'discord') {
          identities.discord = {
            discordId: row.external_id,
            username: row.username
          };
        }
      });

      res.json({ identities });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Identities fetch error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'IDENTITIES_FETCH_ERROR' });
  }
});

router.post('/link/steam', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { steamId } = req.body;
    
    if (!steamId) {
      return res.status(400).json({ error: 'Steam ID required', code: 'MISSING_STEAM_ID' });
    }

    // Search for AOE4World profile
    let aoe4worldProfile;
    try {
      aoe4worldProfile = await searchAOE4WorldProfile(steamId);
    } catch (error) {
      console.error('AOE4World search error:', error);
      return res.status(400).json({ 
        error: 'Failed to find Steam ID in AOE4World. Please check your Steam ID and make sure you have played AOE4 matches.',
        code: 'AOE4WORLD_SEARCH_ERROR' 
      });
    }

    if (!aoe4worldProfile) {
      return res.status(404).json({ 
        error: 'Steam ID not found in AOE4World. Please check your Steam ID and make sure you have played AOE4 matches.',
        code: 'AOE4WORLD_PROFILE_NOT_FOUND' 
      });
    }

    const client = await pool().connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Upsert user
      await client.query(`
        INSERT INTO users (auth0_sub) 
        VALUES ($1) 
        ON CONFLICT (auth0_sub) DO NOTHING
      `, [req.auth?.sub]);

      // Get user ID
      const userResult = await client.query('SELECT id FROM users WHERE auth0_sub = $1', [req.auth?.sub]);
      const userId = userResult.rows[0].id;

      // Delete any existing Steam identities for this user AND any other user with this Steam ID
      const deleteResult = await client.query(`
        DELETE FROM identities 
        WHERE (user_id = $1 AND provider = 'steam') OR (provider = 'steam' AND external_id = $2)
      `, [userId, steamId]);
      
      console.log(`Deleted ${deleteResult.rowCount} existing Steam identities for user ${userId} or Steam ID ${steamId}`);

      // Insert new Steam identity with AOE4World data
      await client.query(`
        INSERT INTO identities (user_id, provider, external_id, aoe4world_profile_id, aoe4world_username) 
        VALUES ($1, 'steam', $2, $3, $4)
      `, [userId, steamId, aoe4worldProfile.profile_id.toString(), aoe4worldProfile.name]);

      // Commit transaction
      await client.query('COMMIT');

      res.json({ 
        success: true,
        aoe4world_profile: {
          profile_id: aoe4worldProfile.profile_id,
          username: aoe4worldProfile.name,
          rating: aoe4worldProfile.rating,
          rank_level: aoe4worldProfile.rank_level
        }
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Steam link error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'STEAM_LINK_ERROR' });
  }
});

router.post('/link/discord', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { discordId, username } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID required', code: 'MISSING_DISCORD_ID' });
    }

    const client = await pool().connect();
    try {
      
      // Upsert user
      await client.query(`
        INSERT INTO users (auth0_sub) 
        VALUES ($1) 
        ON CONFLICT (auth0_sub) DO NOTHING
      `, [req.auth?.sub]);

      // Get user ID
      const userResult = await client.query('SELECT id FROM users WHERE auth0_sub = $1', [req.auth?.sub]);
      const userId = userResult.rows[0].id;

      // Delete any existing Discord identities for this user
      await client.query(`
        DELETE FROM identities 
        WHERE user_id = $1 AND provider = 'discord'
      `, [userId]);

      // Insert new Discord identity
      await client.query(`
        INSERT INTO identities (user_id, provider, external_id, username) 
        VALUES ($1, 'discord', $2, $3)
      `, [userId, discordId, username]);

      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Discord link error:', error);
    res.status(500).json({ error: 'Internal server error', code: 'DISCORD_LINK_ERROR' });
  }
});

export default router;