# .gitignore Configuration

## 📁 Monorepo Setup

This project is part of a monorepo. All `.gitignore` rules for the AOE4 Review app have been consolidated into the root `.gitignore` file at `/Users/shimrazilov/sente-labs/.gitignore`.

## 🔒 Protected Files

The following files are ignored by the root `.gitignore`:

### Sensitive Files (Never Committed)
- `game-review/*.pem` - SSH private keys
- `game-review/*.key` - Private keys
- `game-review/bucket-policy.json` - AWS S3 policies
- `game-review/cloudfront-config*.json` - CloudFront configurations
- `game-review/dns-*.json` - Route 53 DNS records

### Deployment Scripts (Contain Sensitive Data)
- `game-review/deploy-frontend.sh`
- `game-review/deploy-backend-update.sh`
- `game-review/deploy-backend.sh`
- `game-review/deploy-all.sh`

### Build Artifacts
- `game-review/server/node_modules`
- `game-review/server/dist`
- `game-review/ui/node_modules`
- `game-review/ui/build`

### Environment Files
- All `.env` files (except `.env.example`)
- Local environment overrides

## ✅ Safe Files (Committed)

- `game-review/deploy-*.example.sh` - Template scripts
- `game-review/server/.env.example` - Environment template
- `game-review/ui/.env.example` - Frontend environment template
- Source code in `src/` directories
- Documentation files
- Configuration files without secrets

## 🧪 Testing .gitignore

To verify the configuration is working:

```bash
# From the monorepo root (/Users/shimrazilov/sente-labs)
git check-ignore game-review/sente-games.pem
git check-ignore game-review/deploy-frontend.sh
git check-ignore game-review/server/node_modules

# Should return the file paths if properly ignored
```

## 📝 Note

Individual `.gitignore` files have been removed from:
- `game-review/.gitignore` (removed)
- `game-review/server/.gitignore` (removed)  
- `game-review/ui/.gitignore` (removed)

All rules are now consolidated in the monorepo root `.gitignore` file.