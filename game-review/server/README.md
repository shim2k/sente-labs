# AOE4 Game Review Backend

Express TypeScript server for AOE4 game review system with Auth0 authentication, SQS job queuing, and OpenAI-powered review generation.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Run database migration:
```bash
npm run build
npm run migrate
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

Or with PM2:
```bash
pm2 start ecosystem.config.js
```

## API Endpoints

- `GET /health` - Health check with DB connectivity
- `POST /api/v1/link/steam` - Link Steam account
- `POST /api/v1/link/discord` - Link Discord account  
- `GET /api/v1/games` - Get user's games with pagination
- `POST /api/v1/games/sync` - Sync recent games from AOE4World (requires Steam account)
- `POST /api/v1/games/:id/review` - Request game review
- `GET /api/v1/reviews/:id` - Get review by ID

All API endpoints (except `/health`) require Auth0 JWT token in Authorization header.

### Game Sync Workflow

1. User links Steam account: `POST /api/v1/link/steam`
2. User syncs games: `POST /api/v1/games/sync` - fetches last 20 matches from AOE4World
3. User views games: `GET /api/v1/games`
4. User requests review: `POST /api/v1/games/:id/review`