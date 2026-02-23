# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **wallet app backend** built with Node.js, Express, and MongoDB (via Mongoose). It supports dual-currency wallets (NGN and USD) with JWT-based authentication and refresh token session management.

## Commands

- **Start server:** `npm start` (runs `node server.js`)
- **Start dev server (with auto-reload):** `npm run dev` (runs `nodemon server.js`)
- **Install dependencies:** `npm install`

There is no test runner, linter, or build step configured in this project.

## Environment

The server reads from a `.env` file at the project root:

- `MONGO_URI` — MongoDB connection string (defaults to `mongodb://localhost:27017/walletapp`)
- `JWT_SECRET` — Secret for signing access tokens
- `REFRESH_TOKEN_SECRET` — Secret for signing refresh tokens
- `PORT` — Server port (defaults to `5000`)

## Architecture

### Entry Point

`server.js` — Sets up Express with CORS and JSON parsing, connects to MongoDB, and mounts all route handlers.

### Layers

The codebase follows a **routes → controllers → models** pattern:
- **Routes** (`routes/`) — Thin wrappers mapping HTTP verbs/paths to controller functions, applying auth middleware.
- **Controllers** (`controllers/`) — Business logic for each domain (auth, user, wallet, transactions).
- **Models** (`models/`) — Mongoose schemas.
- **Middleware** (`middleware/`) — Shared middleware (auth JWT verification).

### Models

- `User` — `username`, `password` (bcrypt-hashed), `nairaBalance`, `dollarBalance`, `refreshToken`.
- `Transaction` — `user` (ObjectId ref to User), `amount`, `currency` (NGN|USD), `description`, `type` (income|expense), `date`.

### API Endpoints

**Auth** (`/api/auth`):
- `POST /register` — Create account
- `POST /login` — Returns access token (1h) and refresh token (7d)
- `POST /refresh` — Exchange refresh token for new access token
- `POST /logout` — Clears stored refresh token (requires auth)

**User** (`/api/user`, all require auth):
- `GET /` — Get profile (excludes password and refreshToken)
- `PUT /` — Update username and/or password
- `DELETE /` — Delete account and all associated transactions

**Wallet** (`/api/wallet`, all require auth):
- `GET /` — Read balances
- `PUT /` — Overwrite balances directly

**Transactions** (`/api/transactions`, all require auth):
- `GET /` — List user's transactions
- `POST /` — Create transaction (also updates wallet balance)
- `PUT /:id` — Update transaction (reverses old balance effect, applies new)
- `DELETE /:id` — Delete transaction (reverses balance effect)

### Authentication

Shared JWT middleware in `middleware/auth.js`. Reads `Authorization: Bearer <token>` header, verifies with `JWT_SECRET`, and sets `req.userId`. Refresh tokens are stored on the User document and verified with `REFRESH_TOKEN_SECRET`.

### Key Design Notes

- Wallet balance updates happen via direct mutation on the User document (read, modify in JS, then `user.save()`), not atomic MongoDB operations.
- Transaction update and delete now correctly reverse the old transaction's balance effect before applying changes or removing.
- Transaction update/delete verify ownership (`user` field matches `req.userId`).
- The `PUT /api/wallet` endpoint allows overwriting balances directly, independent of transactions.
- There is no input validation middleware (e.g., express-validator); validation relies on Mongoose schema constraints.
