# Deployment and Environment Guide

This repo has two parts:
- backend: Node.js/Express + MongoDB
- frontend: Angular (deployable to GitHub Pages)

## Backend environment

Required variables (see `backend/.env.example`):
- PORT: default 4000
- MONGO_URI: MongoDB connection string (local or Atlas)
- JWT_SECRET: random secret used to sign JWTs

Do not commit real secrets. For CI/CD, store these as secrets in your platform (e.g., GitHub Actions, Render, Railway, Heroku, etc.).

## Frontend API base URL

The Angular `ApiService` auto-selects the base API URL at runtime:
- If the app is served from a `github.io` domain: `https://hospital-catering-2.onrender.com/api`
- Otherwise (local dev): `http://localhost:4000/api`

If you deploy the backend somewhere else, update `frontend/src/app/services/api.service.ts` to point to your backend. For example, change `renderBase` to your own domain.

## GitHub Pages (frontend)

A workflow exists at `.github/workflows/deploy-gh-pages.yml` that:
- Builds the Angular app with `--base-href "/Hospital-catering/"` (project pages path)
- Publishes `frontend/dist/catering-frontend` to GitHub Pages

If your repository or organization path differs, adjust the `--base-href` accordingly.

## Backend deployment options

You can deploy the backend to any Node hosting provider. Example environment mapping for GitHub Actions (pseudo):

- secrets.MONGO_URI -> process.env.MONGO_URI
- secrets.JWT_SECRET -> process.env.JWT_SECRET

Make sure CORS is allowed for your frontend origin(s), and the API is reachable at the URL configured in the frontend.

## Local development

1) Start backend
- cd backend
- copy `.env.example` to `.env` and fill values (use local Mongo or Atlas)
- npm install
- npm run build; npm start

2) Start frontend
- cd frontend
- npm install
- npm start (serves on http://localhost:4200)

Login and data will work against your backend at `http://localhost:4000/api`.

## Troubleshooting

- CORS errors: ensure backend enables CORS and includes your deployed frontend origin.
- 404s on reload in GitHub Pages: a 404.html SPA fallback is added by the workflow — ensure it exists in the built output.
- API base mismatch: verify `ApiService.base` logic and your deployment domain.
