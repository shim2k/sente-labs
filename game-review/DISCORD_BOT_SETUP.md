# Discord Bot Setup for Sente

## Bot Creation

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name it "Sente AOE4 Review Bot"
   - Save the Application ID

2. **Create Bot User**
   - Go to "Bot" section in left sidebar
   - Click "Add Bot"
   - Copy the Bot Token (keep this secret!)
   - Enable "Message Content Intent" if needed

3. **Bot Permissions**
   Required permissions:
   - Send Messages
   - Use Slash Commands
   - Send Messages in DMs
   - Embed Links

## Environment Variables

Add to your `.env` file:

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
```

## Bot Commands

The bot supports these slash commands:

### `/review <steam_id>`
- Requests a review for the user's latest AOE4 match
- Creates user account if doesn't exist
- Links Steam profile for game data
- Costs 1 token

### `/status`
- Shows pending review requests
- Displays current processing status

### `/tokens`
- Shows current token balance
- Explains token costs

## Bot Invitation

To invite the bot to your Discord server:

1. Go to OAuth2 > URL Generator in Discord Developer Portal
2. Select scopes: `bot` and `applications.commands`
3. Select permissions listed above
4. Use generated URL to invite bot

## User Flow

1. **User runs `/review <steam_id>`**
   - Bot validates Steam ID
   - Creates/links user account
   - Fetches latest game from AOE4World
   - Queues review request
   - Deducts 1 token
   - Shows confirmation embed

2. **Review Processing**
   - Worker processes review asynchronously
   - AI generates analysis using o3 model
   - Review saved to database

3. **Completion Notification**
   - Bot sends DM to user when review is ready
   - Includes direct link to review page
   - Shows game details and review access button

## Technical Implementation

### Database Integration
- Automatically creates user accounts for Discord users
- Links Discord and Steam identities
- Manages token balances
- Tracks review requests and status

### Security Features
- Input validation for Steam IDs
- Rate limiting through token system
- Error handling for invalid requests
- Secure token management

### Notification System
- Asynchronous notification delivery
- Fallback error handling
- Rich embed formatting
- Direct message delivery

## Development

### Local Testing
```bash
# Start the server with Discord bot
npm run dev

# Bot will connect automatically when server starts
```

### Production Deployment
- Bot runs alongside main server process
- Shares database and environment
- Automatic restart with PM2
- Error logging and monitoring

## Troubleshooting

### Common Issues

1. **Bot not responding to commands**
   - Check DISCORD_BOT_TOKEN is set
   - Verify bot has proper permissions
   - Check console for error messages

2. **Commands not appearing**
   - Commands are registered when bot starts
   - May take a few minutes to propagate
   - Try restarting the bot

3. **DM notifications not working**
   - User must share a server with bot
   - User DMs must be enabled
   - Check Discord privacy settings

### Logs
- Discord bot logs are integrated with main server logs
- Check for connection and command errors
- Monitor SQS queue for review processing

## Future Enhancements

- Server-specific configurations
- Custom review templates
- Team review requests
- Advanced statistics
- Integration with Discord threads