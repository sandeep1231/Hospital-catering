# Deployment and Environment Guide

This repo has two parts:
- **backend**: Node.js/Express + MongoDB
- **frontend**: Angular SPA

---

## Prerequisites

1. **MongoDB Atlas** — create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Create a database user and note the connection string
   - Under Network Access, add `0.0.0.0/0` (allow all IPs — required for Render)
2. **Render account** — [render.com](https://render.com)
3. **GitHub repo** — push this code to a GitHub repository

---

## Deploy to Render

### Step 1 — Backend (Web Service)

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name**: `dietflow-api` (or your choice)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
4. Environment variables:
   | Variable | Value |
   |---|---|
   | `MONGO_URI` | Your MongoDB Atlas connection string |
   | `JWT_SECRET` | A strong random string (e.g. `openssl rand -hex 32`) |
   | `NODE_ENV` | `production` |
   | `ALLOWED_ORIGINS` | `https://<your-frontend>.onrender.com` (add after creating frontend) |
5. Deploy — note the backend URL (e.g. `https://dietflow-api.onrender.com`)

### Step 2 — Frontend (Static Site)

1. **Before deploying**, update the backend URL in `frontend/src/environments/environment.prod.ts`:
   ```ts
   apiBase: 'https://dietflow-api.onrender.com/api'  // your actual backend URL
   ```
2. Commit and push this change
3. Go to Render Dashboard → **New** → **Static Site**
4. Connect your GitHub repo
5. Configure:
   - **Name**: `dietflow` (or your choice)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npx ng build --configuration production`
   - **Publish Directory**: `dist/catering-frontend`
6. Add a **Rewrite Rule**: Source `/*` → Destination `/index.html` (Action: Rewrite)
   - This enables Angular client-side routing

### Step 3 — Update CORS

Go back to the backend service and update the `ALLOWED_ORIGINS` environment variable to include the frontend URL:
```
https://dietflow.onrender.com
```

---

## Post-Deploy Verification

1. Open `https://<backend>.onrender.com/api/auth/login` — should return a 4xx (no body), confirms the API is alive
2. Check Render logs for: `Connected to MongoDB` and `Seeded super-admin user`
3. Open the frontend URL and log in with:
   - **Email**: `superadmin@dietflow.in`
   - **Password**: `admin123`
4. **Change the super-admin password immediately** after first login

---

## Backend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string (Atlas recommended) |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `NODE_ENV` | No | Set to `production` for Render |
| `PORT` | No | Defaults to `4000` (Render sets this automatically) |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed frontend origins |

See `backend/.env.example` for a template.

---

## Frontend API Configuration

The API base URL is configured via Angular environments:
- **Dev**: `src/environments/environment.ts` → `http://localhost:4000/api`
- **Prod**: `src/environments/environment.prod.ts` → update with your Render backend URL

The production build (`ng build --configuration production`) swaps in `environment.prod.ts` automatically.

---

## Local Development

1. Start backend:
   ```bash
   cd backend
   cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
   npm install
   npm start
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm install
   npm start              # serves on http://localhost:4200
   ```

---

## Troubleshooting

- **CORS errors**: Ensure `ALLOWED_ORIGINS` includes your frontend URL exactly (with `https://`, no trailing slash)
- **404 on page refresh**: Ensure the Render Static Site has a rewrite rule: `/*` → `/index.html`
- **Super-admin not created**: Check Render backend logs for seed output. Ensure `MONGO_URI` is correct.
- **Render free tier spin-down**: Free Render services sleep after 15 min of inactivity. First request takes ~30s to wake up. Upgrade to paid plan for always-on.
