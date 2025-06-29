# AOE4 Review App 🏰⚔️

A comprehensive Age of Empires 4 game review and analysis platform with AI-powered insights.

## 🌟 Features

- **🎮 Game Sync**: Automatic sync with AOE4World for match history
- **🤖 AI Analysis**: OpenAI-powered game review and strategic insights
- **📊 Beautiful UI**: Modern React interface with game cards and civilization flags
- **🔐 Authentication**: Secure Auth0 integration
- **⚡ Real-time Updates**: Live status updates for game analysis
- **🏆 Match Details**: Comprehensive match statistics and player information

## 🏗️ Architecture

```
Frontend (React) → CloudFront → S3
    ↓
Backend (Node.js) → EC2 → Nginx → API (Port 4000)
    ↓
Services: PostgreSQL (RDS) + SQS + OpenAI + Auth0
```

## 🚀 Production URLs

- **Frontend**: https://aoe4.senteai.com
- **Backend API**: https://api-aoe4.senteai.com

## 📁 Project Structure

```
├── ui/                     # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React context providers
│   │   ├── pages/          # Main application pages
│   │   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── db/            # Database schema and connection
├── deploy-*.sh            # Deployment scripts
└── docs/                  # Documentation
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- AWS Account (for SQS)
- Auth0 Account
- OpenAI API Key

### Setup

1. **Clone and install dependencies**:
   ```bash
   # Install backend dependencies
   cd server && npm install
   
   # Install frontend dependencies  
   cd ../ui && npm install
   ```

2. **Environment Configuration**:
   ```bash
   # Backend environment
   cp server/.env.example server/.env
   # Edit server/.env with your actual values
   
   # Frontend environment
   cp ui/.env.example ui/.env.local
   # Edit ui/.env.local with your API URL
   ```

3. **Database Setup**:
   ```bash
   # Create database and run schema
   psql -h localhost -U postgres -c "CREATE DATABASE aoe4_review;"
   psql -h localhost -U postgres -d aoe4_review -f server/src/db/schema.sql
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend  
   cd ui && npm start
   
   # Terminal 3: Worker (optional)
   cd server && npm run worker
   ```

## 🚀 Deployment

### Setup Deployment Scripts
```bash
# Copy example scripts and configure with your values
cp deploy-frontend.example.sh deploy-frontend.sh
cp deploy-backend-update.example.sh deploy-backend-update.sh
cp deploy-all.example.sh deploy-all.sh

# Edit scripts to update domains, AWS resources, etc.
```

### Quick Deploy
```bash
# Deploy everything
./deploy-all.sh

# Deploy frontend only
./deploy-frontend.sh

# Deploy backend only
./deploy-backend-update.sh
```

### Documentation
- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions
- **[Security Guidelines](SECURITY.md)** - Security best practices

## 🔧 Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:pass@host:5432/db
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://your-api
OPENAI_API_KEY=sk-proj-your-key
```

### Frontend (.env.local)
```bash
REACT_APP_API_URL=http://localhost:4000
```

## 🎯 API Endpoints

### Games
- `GET /api/v1/games` - List user's games
- `POST /api/v1/games/sync` - Sync games from AOE4World
- `POST /api/v1/games/:id/review` - Request AI review

### Authentication
- `GET /api/v1/auth/identities` - Get linked accounts
- `POST /api/v1/auth/steam` - Link Steam account
- `POST /api/v1/auth/discord` - Link Discord account

### Reviews
- `GET /api/v1/reviews/:id` - Get review details

## 🧪 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Auth0 React SDK** for authentication
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with raw SQL queries
- **AWS SQS** for job queuing
- **OpenAI API** for game analysis

### Infrastructure
- **AWS EC2** for backend hosting
- **AWS S3 + CloudFront** for frontend
- **AWS RDS** for PostgreSQL
- **Let's Encrypt** for SSL certificates
- **PM2** for process management
- **Nginx** for reverse proxy

## 🔒 Security

- HTTPS enforced on all endpoints
- JWT token validation
- CORS properly configured
- Environment variables secured
- SSH keys not in repository

## 📊 Features Overview

### Game Management
- Automatic sync with AOE4World
- Match history with detailed statistics
- Player information and ratings
- Map and civilization display

### AI Analysis
- OpenAI-powered game reviews
- Strategic insights and recommendations
- Background processing with SQS
- Status tracking and notifications

### User Interface
- Modern, responsive design
- Real-time status updates
- Civilization flags and map images
- Intuitive game cards with statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Test your changes locally
- Update documentation as needed

## 📝 License

This project is private and proprietary.

## 🆘 Support

For issues and questions:
- Check the [Deployment Guide](DEPLOYMENT.md)
- Review [Security Guidelines](SECURITY.md)
- Contact the development team

---

**Built with ❤️ for the AOE4 community** 🏰