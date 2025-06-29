import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../db/connection';

async function normalizeGamesTable() {
  const client = await pool().connect();
  
  try {
    console.log('Starting games table normalization...');
    
    // 1. Create backup of existing games table
    console.log('Creating backup of existing games table...');
    await client.query(`
      CREATE TABLE games_backup AS 
      SELECT * FROM games
    `);
    
    // 2. Check if new tables already exist
    const tablesExist = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('games_new', 'game_players')
      AND table_schema = 'public'
    `);

    if (tablesExist.rows.length > 0) {
      console.log('New tables already exist, dropping them first...');
      await client.query('DROP TABLE IF EXISTS game_players CASCADE');
      await client.query('DROP TABLE IF EXISTS games_new CASCADE');
    }

    // 3. Create new normalized tables
    console.log('Creating new normalized tables...');
    
    await client.query(`
      CREATE TABLE games_new (
        id BIGINT PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Game metadata
        map_name TEXT NOT NULL,
        game_mode TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        season INTEGER NOT NULL,
        patch INTEGER NOT NULL,
        server TEXT NOT NULL,
        team_size TEXT NOT NULL,
        average_rating INTEGER,
        average_mmr INTEGER,
        
        played_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw', 'reviewing', 'reviewed')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE game_players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        game_id BIGINT NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
        team_number INTEGER NOT NULL CHECK (team_number IN (1, 2)),
        player_name TEXT NOT NULL,
        profile_id INTEGER,
        civilization TEXT NOT NULL,
        result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
        rating INTEGER,
        mmr INTEGER,
        rating_diff INTEGER,
        mmr_diff INTEGER,
        input_type TEXT,
        country TEXT,
        is_user BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. Migrate existing data
    console.log('Migrating existing data...');
    
    const existingGames = await client.query('SELECT * FROM games');
    
    for (const game of existingGames.rows) {
      try {
        const gameData = game.payload_jsonb;
        
        // Extract game metadata with defaults for missing data
        const mapName = gameData.map || 'Unknown Map';
        const gameMode = gameData.kind || 'unknown';
        const duration = gameData.duration || 0;
        const season = gameData.season || 0;
        const patch = gameData.patch || 0;
        const server = gameData.server || 'unknown';
        const averageRating = gameData.average_rating || null;
        const averageMmr = gameData.average_mmr || null;
        
        // Determine team size from teams structure
        let teamSize = '1v1';
        if (gameData.teams && Array.isArray(gameData.teams)) {
          const team1Size = gameData.teams[0]?.length || 1;
          const team2Size = gameData.teams[1]?.length || 1;
          teamSize = `${team1Size}v${team2Size}`;
        }
        
        // Insert game record
        await client.query(`
          INSERT INTO games_new (
            id, user_id, map_name, game_mode, duration_seconds, season, patch, server, 
            team_size, average_rating, average_mmr, played_at, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          game.id,
          game.user_id,
          mapName,
          gameMode,
          duration,
          season,
          patch,
          server,
          teamSize,
          averageRating,
          averageMmr,
          game.played_at,
          game.status,
          game.created_at
        ]);
        
        // Extract and insert player data
        if (gameData.teams && Array.isArray(gameData.teams)) {
          for (let teamIndex = 0; teamIndex < gameData.teams.length; teamIndex++) {
            const team = gameData.teams[teamIndex];
            const teamNumber = teamIndex + 1;
            
            for (const playerWrapper of team) {
              const player = playerWrapper.player;
              if (player) {
                await client.query(`
                  INSERT INTO game_players (
                    game_id, team_number, player_name, profile_id, civilization, result,
                    rating, mmr, rating_diff, mmr_diff, input_type, country, is_user
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                  game.id,
                  teamNumber,
                  player.name || 'Unknown Player',
                  player.profile_id || null,
                  player.civilization || 'unknown',
                  player.result || 'unknown',
                  player.rating || null,
                  player.mmr || null,
                  player.rating_diff || null,
                  player.mmr_diff || null,
                  player.input_type || null,
                  player.country || null,
                  false // We'll need to identify user players separately
                ]);
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`Error migrating game ${game.id}:`, error);
        // Continue with other games
      }
    }

    // 5. Create indexes on new tables
    console.log('Creating indexes...');
    
    const indexes = [
      'CREATE INDEX idx_games_new_user_id ON games_new(user_id)',
      'CREATE INDEX idx_games_new_played_at ON games_new(played_at DESC)',
      'CREATE INDEX idx_games_new_status ON games_new(status)',
      'CREATE INDEX idx_games_new_map_name ON games_new(map_name)',
      'CREATE INDEX idx_games_new_game_mode ON games_new(game_mode)',
      'CREATE INDEX idx_games_new_season ON games_new(season)',
      'CREATE INDEX idx_games_new_team_size ON games_new(team_size)',
      'CREATE INDEX idx_game_players_game_id ON game_players(game_id)',
      'CREATE INDEX idx_game_players_player_name ON game_players(player_name)',
      'CREATE INDEX idx_game_players_civilization ON game_players(civilization)',
      'CREATE INDEX idx_game_players_is_user ON game_players(is_user)',
      'CREATE INDEX idx_game_players_result ON game_players(result)'
    ];
    
    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }

    // 6. Replace old table with new one
    console.log('Replacing old table with new normalized structure...');
    
    await client.query('DROP TABLE games CASCADE');
    await client.query('ALTER TABLE games_new RENAME TO games');
    
    // Update foreign key references in other tables
    await client.query(`
      ALTER TABLE reviews 
      ADD CONSTRAINT reviews_game_id_fkey 
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    `);
    
    await client.query(`
      ALTER TABLE review_tasks 
      ADD CONSTRAINT review_tasks_game_id_fkey 
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    `);

    console.log('Games table normalization completed successfully!');
    console.log('Backup table "games_backup" preserved for safety.');
    
  } catch (error) {
    console.error('Error during normalization:', error);
    
    // Rollback on error
    try {
      console.log('Attempting rollback...');
      await client.query('DROP TABLE IF EXISTS game_players CASCADE');
      await client.query('DROP TABLE IF EXISTS games_new CASCADE');
      console.log('Rollback completed. Original table preserved.');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    
    process.exit(1);
  } finally {
    client.release();
  }
}

normalizeGamesTable();