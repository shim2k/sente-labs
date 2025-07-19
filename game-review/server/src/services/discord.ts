import { Client, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { pool } from '../db/connection';
import { SQS } from 'aws-sdk';

export class DiscordService {
  private client: Client;
  private sqs: SQS;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.sqs = new SQS({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.setupEventHandlers();
    this.setupCommands();
  }

  private setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`Discord bot is ready! Logged in as ${this.client.user?.tag}`);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      try {
        switch (commandName) {
          case 'review':
            await this.handleReviewCommand(interaction);
            break;
          case 'status':
            await this.handleStatusCommand(interaction);
            break;
          case 'tokens':
            await this.handleTokensCommand(interaction);
            break;
          default:
            await interaction.reply('Unknown command!');
        }
      } catch (error) {
        console.error('Error handling Discord command:', error);
        await interaction.reply('An error occurred while processing your command.');
      }
    });
  }

  private setupCommands() {
    const commands = [
      new SlashCommandBuilder()
        .setName('review')
        .setDescription('Request a review for your latest AOE4 match')
        .addStringOption(option =>
          option.setName('steam_id')
            .setDescription('Your Steam ID or profile URL')
            .setRequired(true)
        ),
      
      new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check the status of your pending reviews'),
      
      new SlashCommandBuilder()
        .setName('tokens')
        .setDescription('Check your token balance'),
    ];

    // Register commands when bot is ready
    this.client.once('ready', async () => {
      try {
        console.log('Started refreshing application (/) commands.');
        await this.client.application?.commands.set(commands);
        console.log('Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error('Error registering commands:', error);
      }
    });
  }

  private async handleReviewCommand(interaction: ChatInputCommandInteraction) {
    const steamId = interaction.options.getString('steam_id', true);
    const discordUserId = interaction.user.id;
    const discordUsername = interaction.user.username;

    await interaction.deferReply();

    try {
      // Check if user exists, create if not
      const user = await this.getOrCreateUser(discordUserId, discordUsername, steamId);
      
      if (!user) {
        await interaction.editReply('❌ Could not link your Steam account. Please check your Steam ID.');
        return;
      }

      // Check token balance
      if (user.tokens < 1) {
        await interaction.editReply('❌ You don\'t have enough tokens to request a review. You need 1 token.');
        return;
      }

      // Get latest game for the user
      const latestGame = await this.getLatestGame(user.id);
      
      if (!latestGame) {
        await interaction.editReply('❌ No recent games found. Please make sure your Steam account is linked to AOE4World and you have recent ranked matches.');
        return;
      }

      // Check if game already has a review
      const existingReview = await this.checkExistingReview(latestGame.id);
      
      if (existingReview) {
        const reviewUrl = `https://aoe4.senteai.com/review/${existingReview.id}`;
        await interaction.editReply(`✅ This game already has a review! View it here: ${reviewUrl}`);
        return;
      }

      // Create review request
      const reviewTask = await this.createReviewTask(latestGame.id, user.id, discordUserId);
      
      if (!reviewTask) {
        await interaction.editReply('❌ Failed to create review request. Please try again.');
        return;
      }

      // Deduct token
      await this.deductToken(user.id);

      // Create embed with game info
      const embed = new EmbedBuilder()
        .setTitle('🎮 Review Request Submitted')
        .setDescription(`Review request queued for your latest match!`)
        .addFields(
          { name: 'Map', value: latestGame.map_name, inline: true },
          { name: 'Duration', value: `${Math.floor(latestGame.duration_seconds / 60)}:${(latestGame.duration_seconds % 60).toString().padStart(2, '0')}`, inline: true },
          { name: 'Team Size', value: latestGame.team_size, inline: true },
          { name: 'Tokens Remaining', value: `${user.tokens - 1}`, inline: true },
          { name: 'Status', value: '⏳ Processing...', inline: true }
        )
        .setColor(0x00AE86)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in review command:', error);
      await interaction.editReply('❌ An error occurred while processing your request.');
    }
  }

  private async handleStatusCommand(interaction: ChatInputCommandInteraction) {
    const discordUserId = interaction.user.id;
    
    await interaction.deferReply();

    try {
      const user = await this.getUserByDiscordId(discordUserId);
      
      if (!user) {
        await interaction.editReply('❌ You need to use `/review` command first to link your account.');
        return;
      }

      // Get pending reviews
      const pendingReviews = await this.getPendingReviews(user.id);
      
      if (pendingReviews.length === 0) {
        await interaction.editReply('📋 No pending reviews found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Your Review Status')
        .setDescription('Here are your pending reviews:')
        .setColor(0x0099FF);

      pendingReviews.forEach((review, index) => {
        embed.addFields({
          name: `Review ${index + 1}`,
          value: `Map: ${review.map_name}\nStatus: ${review.job_state}\nRequested: ${new Date(review.created_at).toLocaleString()}`,
          inline: true
        });
      });

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in status command:', error);
      await interaction.editReply('❌ An error occurred while fetching your status.');
    }
  }

  private async handleTokensCommand(interaction: ChatInputCommandInteraction) {
    const discordUserId = interaction.user.id;
    
    await interaction.deferReply();

    try {
      const user = await this.getUserByDiscordId(discordUserId);
      
      if (!user) {
        await interaction.editReply('❌ You need to use `/review` command first to link your account.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🟡 Token Balance')
        .setDescription(`You have **${user.tokens}** tokens remaining.`)
        .addFields(
          { name: 'Token Cost', value: 'Regular Review: 1 token', inline: true },
          { name: 'How to get more', value: 'Contact support for additional tokens', inline: true }
        )
        .setColor(0xFFD700);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in tokens command:', error);
      await interaction.editReply('❌ An error occurred while fetching your token balance.');
    }
  }

  // Database helper methods
  private async getOrCreateUser(discordId: string, discordUsername: string, steamId: string) {
    const client = await pool().connect();
    
    try {
      // Check if user exists by Discord ID
      let userResult = await client.query(
        'SELECT u.*, i.external_id as steam_id FROM users u LEFT JOIN identities i ON u.id = i.user_id WHERE i.provider = $1 AND i.external_id = $2',
        ['discord', discordId]
      );

      if (userResult.rows.length > 0) {
        return userResult.rows[0];
      }

      // Create new user
      const newUserResult = await client.query(
        'INSERT INTO users (auth0_sub, tokens) VALUES ($1, 2) RETURNING *',
        [`discord_${discordId}`]
      );

      const newUser = newUserResult.rows[0];

      // Link Discord identity
      await client.query(
        'INSERT INTO identities (user_id, provider, external_id, username) VALUES ($1, $2, $3, $4)',
        [newUser.id, 'discord', discordId, discordUsername]
      );

      // Link Steam identity (basic, would need AOE4World integration for full data)
      await client.query(
        'INSERT INTO identities (user_id, provider, external_id) VALUES ($1, $2, $3)',
        [newUser.id, 'steam', steamId]
      );

      return newUser;

    } finally {
      client.release();
    }
  }

  private async getUserByDiscordId(discordId: string) {
    const client = await pool().connect();
    
    try {
      const result = await client.query(
        'SELECT u.* FROM users u JOIN identities i ON u.id = i.user_id WHERE i.provider = $1 AND i.external_id = $2',
        ['discord', discordId]
      );

      return result.rows[0] || null;

    } finally {
      client.release();
    }
  }

  private async getLatestGame(userId: string) {
    const client = await pool().connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM games WHERE user_id = $1 ORDER BY played_at DESC LIMIT 1',
        [userId]
      );

      return result.rows[0] || null;

    } finally {
      client.release();
    }
  }

  private async checkExistingReview(gameId: number) {
    const client = await pool().connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM reviews WHERE game_id = $1',
        [gameId]
      );

      return result.rows[0] || null;

    } finally {
      client.release();
    }
  }

  private async createReviewTask(gameId: number, userId: string, discordUserId: string) {
    const client = await pool().connect();
    
    try {
      // Create review task
      const taskResult = await client.query(
        'INSERT INTO review_tasks (game_id, llm_model, job_state) VALUES ($1, $2, $3) RETURNING *',
        [gameId, 'o3', 'queued']
      );

      const task = taskResult.rows[0];

      // Queue the task in SQS
      const sqsParams = {
        QueueUrl: process.env.SQS_QUEUE_URL!,
        MessageBody: JSON.stringify({
          taskId: task.id,
          gameId: gameId,
          userId: userId,
          discordUserId: discordUserId // Include Discord ID for notifications
        })
      };

      await this.sqs.sendMessage(sqsParams).promise();

      return task;

    } finally {
      client.release();
    }
  }

  private async deductToken(userId: string) {
    const client = await pool().connect();
    
    try {
      await client.query(
        'UPDATE users SET tokens = tokens - 1 WHERE id = $1',
        [userId]
      );

    } finally {
      client.release();
    }
  }

  private async getPendingReviews(userId: string) {
    const client = await pool().connect();
    
    try {
      const result = await client.query(`
        SELECT rt.*, g.map_name, g.duration_seconds, g.team_size
        FROM review_tasks rt
        JOIN games g ON rt.game_id = g.id
        WHERE g.user_id = $1 AND rt.job_state IN ('queued', 'running')
        ORDER BY rt.created_at DESC
      `, [userId]);

      return result.rows;

    } finally {
      client.release();
    }
  }

  // Method to send notification when review is complete
  async sendReviewCompleteNotification(discordUserId: string, reviewId: string, gameInfo: any) {
    try {
      const user = await this.client.users.fetch(discordUserId);
      
      if (user) {
        const reviewUrl = `https://aoe4.senteai.com/review/${reviewId}`;
        
        const embed = new EmbedBuilder()
          .setTitle('✅ Review Complete!')
          .setDescription(`Your AOE4 match review is ready!`)
          .addFields(
            { name: 'Map', value: gameInfo.map_name, inline: true },
            { name: 'Duration', value: `${Math.floor(gameInfo.duration_seconds / 60)}:${(gameInfo.duration_seconds % 60).toString().padStart(2, '0')}`, inline: true },
            { name: 'Team Size', value: gameInfo.team_size, inline: true }
          )
          .setColor(0x00FF00)
          .setTimestamp();

        const button = new ButtonBuilder()
          .setLabel('View Review')
          .setStyle(ButtonStyle.Link)
          .setURL(reviewUrl);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        await user.send({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  async start() {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN is not set');
      return;
    }

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
    }
  }

  async stop() {
    await this.client.destroy();
  }
}

// Export singleton instance
export const discordService = new DiscordService();