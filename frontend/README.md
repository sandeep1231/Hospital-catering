# Catering Frontend

Angular + Bootstrap scaffold.

Run:
- npm install
- npm start

## API base URL

The app chooses its API base at runtime in `src/app/services/api.service.ts`:
- On `github.io` domains: uses the hosted backend (`https://hospital-catering-2.onrender.com/api`).
- Otherwise (local dev): `http://localhost:4000/api`.

If you deploy the backend elsewhere, update the `renderBase` value accordingly.
