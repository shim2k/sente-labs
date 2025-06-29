# Security Guidelines - AOE4 Review App

## 🔒 **CRITICAL: Files to NEVER Commit**

The following files contain sensitive information and should **NEVER** be committed to Git:

### 🚨 **High-Risk Files:**
- `*.pem` - SSH private keys
- `*.key` - Any private keys
- `.env` - Environment variables with secrets
- `sente-games.pem` - EC2 SSH key

### 🔧 **AWS Configuration Files:**
- `bucket-policy.json` - S3 bucket policies
- `cloudfront-config*.json` - CloudFront distributions
- `dns-*.json` - Route 53 DNS records

### 📊 **Build Output:**
- `dist/` - Compiled backend code
- `build/` - Compiled frontend code
- `node_modules/` - Dependencies

## ✅ **Safe to Commit:**

### 📝 **Template Files:**
- `.env.example` - Environment variable templates
- `DEPLOYMENT.md` - Deployment documentation
- `SECURITY.md` - This security guide

### 🚀 **Deployment Scripts:**
- `deploy-frontend.sh` - Frontend deployment
- `deploy-backend-update.sh` - Backend deployment
- `deploy-all.sh` - Full deployment

### 💻 **Source Code:**
- All files in `src/` directories
- Configuration files without secrets
- Package files (`package.json`, `tsconfig.json`, etc.)

## 🔐 **Environment Variables Security**

### Backend `.env` contains:
- Database credentials
- OpenAI API key
- AWS credentials
- Auth0 secrets

### Frontend `.env.production` contains:
- API endpoint URL (public, but environment-specific)

## 🛡️ **Git Security Checklist**

Before committing:
- [ ] Check `.gitignore` is working
- [ ] Run `git status` to verify no sensitive files are staged
- [ ] Ensure `.env` files are not listed
- [ ] Verify no `.pem` files are included
- [ ] Check no AWS config files are staged

### Test .gitignore:
```bash
# Check what Git would track
git ls-files --others --ignored --exclude-standard

# Should show ignored files, not track them
```

## 🚨 **If You Accidentally Commit Secrets:**

### Immediate Actions:
1. **DO NOT PUSH** if not pushed yet
2. Remove from Git history:
   ```bash
   git reset --soft HEAD~1  # Undo last commit
   git reset HEAD <file>    # Unstage specific file
   ```

### If Already Pushed:
1. **Rotate all secrets immediately**:
   - Generate new SSH keys
   - Regenerate OpenAI API key
   - Update database passwords
   - Refresh Auth0 credentials

2. **Clean Git history**:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch <sensitive-file>' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push** (⚠️ dangerous):
   ```bash
   git push --force-with-lease origin main
   ```

## 📋 **Production Security**

### Server Security:
- SSH keys stored securely
- Environment variables in EC2 user data or AWS Secrets Manager
- SSL certificates auto-renewed
- Security groups restrict access

### Application Security:
- HTTPS enforced
- CORS properly configured
- Authentication tokens validated
- Input sanitization implemented

## 🔍 **Security Audit Commands**

```bash
# Check for potential secrets in code
grep -r "sk-" . --exclude-dir=node_modules
grep -r "password" . --exclude-dir=node_modules
grep -r "secret" . --exclude-dir=node_modules

# Verify .gitignore is working
git check-ignore .env
git check-ignore *.pem
git check-ignore dist/
```

## 📞 **Security Incident Response**

If secrets are exposed:
1. **Immediate**: Disable/rotate all compromised credentials
2. **Within 1 hour**: Update production systems
3. **Within 24 hours**: Audit access logs
4. **Document**: What happened and prevention measures

---

**Remember: Security is everyone's responsibility. When in doubt, don't commit!** 🔒