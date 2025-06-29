# AOE4 Game Review – Backend Technical Specification (AWS EC2 + Auth0)

**Version 0.3 — 2025‑06‑28**\
*Revised: API & worker run on a single EC2 instance (Node 18 + Express) instead of Lambda/Fargate.*

---

## 1 · High‑Level Architecture

| Layer                  | Technology                                                                   | Responsibility                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Reverse Proxy**      | NGINX (Amazon Linux 2023 AMI)                                                | TLS termination, static file caching, forwards `/api/*` → Express.                    |
| **Application Server** | Node 18 + Express (TypeScript) running under **PM2** on an **m7g.large EC2** | Serves REST API, validates Auth0 JWT, enqueues review jobs, exposes health endpoints. |
| **Job Queue**          | Amazon SQS (`aoe4-review-jobs`)                                              | Buffers long‑running “generate review” tasks.                                         |
| **Worker Process**     | Same EC2 instance, separate PM2 process (`worker.js`)                        | Consumes SQS messages, calls AOE4World + OpenAI, writes Postgres, sends Discord DM.   |
| **Database**           | Amazon RDS PostgreSQL (Serverless v2)                                        | Persistent storage. Row Level Security via `pgjwt` extension.                         |
| **Game Data Sync**     | On-demand via API endpoint                                                    | User-triggered sync of recent matches from AOE4World.                                 |
| **Secrets**            | AWS Secrets Manager                                                          | OpenAI key, Discord bot token, DB creds.                                              |

All state lives in Postgres and SQS; the EC2 instance is stateless (reprovisionable via **CloudFormation** or **Terraform**).

---

##  2 · Authentication & Authorization

- **Auth0**:
  - SPA obtains RS256 JWT.
  - Express middleware uses `jwks‑rsa` to fetch Auth0 JWKS and verify tokens.
- `req.auth.sub` (Auth0 `sub` claim) is mapped to `users.auth0_sub`.
- **RLS** in Postgres: Policies compare `current_setting('jwt.claims.sub')` (set by `SET LOCAL`) against row owner.

---

## 3 · Data Model (unchanged)

| Table           | Key Columns                                                                                                                         | Purpose |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `users`         | `id uuid PK`, `auth0_sub text UNIQUE`, `email`, `created_at`                                                                        |         |
| `identities`    | `id uuid PK`, `user_id`, `provider text CHECK (provider IN ('steam','discord'))`, `external_id`, `username`                         |         |
| `games`         | `id bigint PK`, `user_id`, `payload_jsonb`, `played_at timestamptz`, `status text CHECK (status IN ('raw','reviewing','reviewed'))` |         |
| `reviews`       | `id uuid PK`, `game_id`, `llm_model`, `summary_md`, `score_jsonb`, `generated_at`                                                   |         |
| `review_tasks`  | `id uuid PK`, `game_id`, `job_state text`, `retries int`, `error text`                                                              |         |
| `notifications` | `id uuid PK`, `user_id`, `channel text`, `payload_jsonb`, `status text`, `sent_at`                                                  |         |

---

## 4 · REST API (Express)

### Base

- Prefix `/api/v1`.
- **Auth**: `Authorization: Bearer <JWT>`.

| Method & Path            | Body / Params             | Response          | Notes                             |
| ------------------------ | ------------------------- | ----------------- | --------------------------------- |
| `POST /link/steam`       | `{ steamId }`             | 200               | Insert/update `identities`.       |
| `POST /link/discord`     | `{ discordId, username }` | 200               | Store Discord identity.           |
| `GET /games`             | `?limit&cursor`           | `{ games:[...] }` | Pagination by `(played_at,id)`.   |
| `POST /games/sync`       | –                         | `{ synced, new }` | Fetch recent games from AOE4World.|
| `POST /games/:id/review` | –                         | 202               | Send SQS message if not existing. |
| `GET /reviews/:id`       | –                         | `Review`          | Markdown + JSON scores.           |

Errors ⇒ `{ error, code }`.

---

## 5 · Workflow Details

1. **User Syncs Games**

   - UI calls `POST /api/v1/games/sync` to fetch recent matches from AOE4World.
   - Requires user to have linked Steam account.
   - Returns count of synced/new games.

2. **User Initiates Review**

   - Express handler pushes SQS message `{ taskId, gameId, userId }` and creates `review_tasks` row (`queued`).

3. **Worker**

```bash
pm2 start dist/worker.js --name aoe4-worker -i 2  # 2 threads
```

- Long‑poll SQS (batch=10).
- For each task → mark `running` → fetch `/api/game/{gameId}`.
- Build prompt, call `openai.chat.completions.create` (model `gpt-4o-mini`).
- Persist review, update `games.status='reviewed'`.
- Send Discord DM via REST; insert `notifications` row.
- Delete SQS message on success; otherwise let it retry (maxReceiveCount=3 + DLQ alert).

---

## 6 · Prompt (same as v0.2)

```
SYSTEM: You are an elite Age of Empires IV coach…
USER: <gzip+base64 game JSON>
```

---

## 7 · Deployment Pipeline

1. **CI** (GitHub Actions):
   - `pnpm test` (Vitest).
   - Build Docker image; push to **Amazon ECR**.
   - Trigger **AWS CodeDeploy** in‑place update on EC2 via **CodeDeploy agent**.
2. **EC2 bootstrap** (cloud‑init or Ansible):
   - Install Node 18, PM2, Docker (optional).
   - Fetch secrets from AWS Secrets Manager → `.env`.
   - `pm2 start ecosystem.config.js`.
3. Zero‑downtime reload via PM2 `gracefulReload`.

---

## 8 · Observability & Ops

- **Logs**: PM2 → CloudWatch Logs via `pm2-cloudwatch`.
- **Metrics**: CloudWatch Agent (+ custom `SQSApproximateAgeOfOldestMessage`).
- **Alerts**: CloudWatch Alarms → SNS → Slack.
- **Healthcheck**: `GET /api/health` returns DB + SQS connectivity.

---

## 9 · Security & Quotas

- SQS rate‑limit: 5 concurrent workers, 10 req/s OpenAI throttle.
- Express rate‑limit: `express-rate-limit` 100 req/min per IP.
- Postgres connection pool via `pg` (max 20 connections).

---

## 10 · Future Extensions

- Horizontal scaling: move worker to **separate auto‑scaling EC2 ASG**.
- GraphQL layer for front‑end flexibility.
- Include Twitch VOD moment detection and embed clips in Discord DM.

