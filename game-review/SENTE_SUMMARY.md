# Sente - AI-Powered Age of Empires IV Game Review Platform

## Overview

Sente is an AI-powered game review platform specifically designed for Age of Empires IV (AOE4) players. It provides detailed, strategic analysis of ranked matches to help players improve their gameplay through data-driven insights and expert-level recommendations.

## Core Features

### 🎮 Game Analysis & Reviews
- **AI-Powered Reviews**: Uses advanced language models (o3) to generate comprehensive match analysis
- **Strategic Insights**: Focuses on swing moments, macro patterns, and actionable improvements
- **Data-Driven Feedback**: References specific timestamps, metrics, and game events
- **Professional Quality**: Written in the voice of a championship-level strategist

### 🔗 AOE4World Integration
- **Seamless Profile Linking**: Connect your Steam account to automatically sync game data
- **Automatic Game Import**: Fetches recent ranked matches from AOE4World
- **Match History**: Browse and select games for review from your complete match history
- **Player Statistics**: View detailed game metadata including ratings, civilizations, and match outcomes

### 👤 User Managementsh
- **Auth0 Authentication**: Secure login with Steam integration
- **Token System**: Users start with 3 tokens for review requests
- **Multi-Platform Support**: Link Steam and Discord accounts
- **Profile Management**: Manage connected accounts and view token balance

### 📊 Review Types
- **Regular Reviews**: Comprehensive analysis using o3 model (1 token)
- **Elite Reviews**: Currently disabled, planned for advanced analysis with replay data (2 tokens)

## Technical Architecture

### Frontend (React)
- **Modern React**: Built with TypeScript and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Dynamic UI updates for review status
- **Component Library**: Modular design with reusable components

### Backend (Node.js/Express)
- **REST API**: Clean API endpoints for all functionality
- **Queue System**: AWS SQS for asynchronous review processing
- **Database**: PostgreSQL with proper indexing and relationships
- **Authentication**: JWT tokens with Auth0 integration

### Infrastructure
- **Frontend**: Deployed on AWS S3 + CloudFront
- **Backend**: AWS EC2 with PM2 process management
- **Database**: Amazon RDS PostgreSQL
- **Queue**: AWS SQS for job processing

## User Journey

### 1. Account Setup
1. Visit https://aoe4.senteai.com
2. Sign up/login with Auth0
3. Connect Steam account for game data access
4. Profile automatically links to AOE4World

### 2. Game Selection
1. Browse recent ranked matches from AOE4World
2. View game details (map, duration, opponents, result)
3. Select a game for review
4. Confirm review request (costs 1 token)

### 3. Review Generation
1. Review request queued in AWS SQS
2. Worker process fetches detailed game data
3. AI generates comprehensive analysis
4. Review delivered with strategic insights

### 4. Review Consumption
1. View markdown-formatted review
2. Read data-backed recommendations
3. Learn from specific timestamps and metrics
4. Apply insights to improve gameplay

## Data Flow

```
User → Frontend → API → Database
                    ↓
                 SQS Queue
                    ↓
                Worker Process
                    ↓
              AOE4World API
                    ↓
                AI Analysis
                    ↓
              Database Storage
```

## Key Integrations

### AOE4World API
- **Match Data**: Fetches detailed game statistics
- **Player Profiles**: Retrieves user information and ratings
- **Real-time Sync**: Automatically updates with new matches

### Auth0 Authentication
- **Secure Login**: Industry-standard authentication
- **Social Login**: Steam integration for gaming community
- **User Management**: Profile and session management

### OpenAI API
- **o3 Model**: Advanced language model for game analysis
- **Structured Prompts**: Specialized prompts for AOE4 strategy
- **Quality Control**: Consistent, professional review output

## Database Schema

### Core Tables
- **users**: User accounts with token balances
- **identities**: Linked accounts (Steam, Discord)
- **games**: Match data and metadata
- **reviews**: Generated analysis and content
- **review_tasks**: Queue job tracking

### Key Relationships
- Users can have multiple identities
- Games belong to users
- Reviews are generated for specific games
- Review tasks track processing status

## Security & Privacy

### Data Protection
- **Encrypted Communication**: HTTPS everywhere
- **Secure Authentication**: JWT tokens with proper validation
- **Database Security**: Parameterized queries, input validation
- **Access Control**: User-specific data isolation

### Privacy Considerations
- **Public Data Only**: Uses publicly available AOE4World data
- **No Game Files**: Doesn't store or access private replay files
- **User Control**: Users control their data and account connections

## Performance & Scalability

### Current Capacity
- **Concurrent Users**: Optimized for moderate user load
- **Review Processing**: Asynchronous queue system
- **Database**: Indexed for fast queries
- **CDN**: Global content delivery

### Monitoring
- **Health Checks**: API endpoint monitoring
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Response time monitoring

## Deployment

### Production Environment
- **Frontend**: https://aoe4.senteai.com
- **Backend**: https://api-aoe4.senteai.com
- **Database**: AWS RDS PostgreSQL
- **Queue**: AWS SQS

### Development Workflow
- **Local Development**: Full stack development environment
- **Automated Deployment**: Scripts for frontend and backend
- **Database Migrations**: Version-controlled schema changes

## Future Roadmap

### Planned Features
- **Elite Reviews**: Advanced analysis with replay file parsing
- **User Dashboard**: Enhanced statistics and history
- **Team Analysis**: Support for team games
- **Mobile App**: Native mobile experience

### Technical Improvements
- **Caching**: Redis for improved performance
- **Analytics**: User behavior tracking
- **A/B Testing**: Feature experimentation
- **API Rate Limiting**: Enhanced protection

## Getting Started

### For Users
1. Visit https://aoe4.senteai.com
2. Create account and link Steam
3. Select a recent ranked match
4. Request review (1 token)
5. Receive AI-generated analysis

### For Developers
1. Clone the repository
2. Set up environment variables
3. Install dependencies
4. Run local development servers
5. Deploy using provided scripts

## Support & Community

### Contact
- **Website**: https://aoe4.senteai.com
- **API Documentation**: Available in codebase
- **Issue Tracking**: GitHub issues

### Community
- **Target Audience**: Intermediate to advanced AOE4 players
- **Use Cases**: Ranked ladder improvement, strategy learning
- **Value Proposition**: Data-driven gameplay improvement

---

*Sente represents the next generation of esports coaching, bringing AI-powered analysis to the Age of Empires IV community.*