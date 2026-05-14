# Job Chance Hunter

A full-stack job matching web app for real job seekers. It uses MongoDB Atlas for storage, local JWT auth, PDF resume upload, public job feeds, and OpenRouter-powered ranking to produce a daily list of the best 25 jobs with apply links, match score, and hiring chance.

## Features

- Sign up and sign in with password hashing and JWT sessions.
- Sidebar setup flow for resume PDF, target role, skills, location, experience, salary, work mode, and job type.
- Daily top 25 ranked jobs from live public job feeds.
- OpenRouter LLM scoring with heuristic fallback if the model/API is unavailable.
- MongoDB collections for users, jobs, and daily job matches.
- Game-like dashboard with XP, setup progress, apply quest, bookmarks, skipped jobs, and tracked applications.
- Daily cron sync at 2:15 AM Asia/Kolkata.

## Stack

- Backend: Node.js, Express, Mongoose, Multer, PDF Parse, node-cron
- Frontend: React, Vite, Lucide icons, custom CSS
- Database: MongoDB Atlas
- LLM: OpenRouter Chat Completions API

## Environment

Keep real secrets only in `.env`.

```dotenv
MONGO_URI=mongodb+srv://...
OPENROUTER_API_KEY=sk-or-v1-...
MONGO_DB_NAME=job_apply_bot
PORT=8000
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
OPENROUTER_MODEL=openai/gpt-5.2
```

The backend includes a MongoDB Atlas DNS fallback for Windows/Node environments where `mongodb+srv` lookup fails even though the OS can resolve the SRV record.

## Run

Install backend:

```bash
npm install
```

Install frontend:

```bash
npm run install:frontend
```

Start backend:

```bash
npm run dev
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## API

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/auth/me`
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/resume`
- `GET /api/jobs/today`
- `POST /api/jobs/refresh`
- `PATCH /api/jobs/:matchId/status`
- `POST /api/jobs/:matchId/apply`

## Verification

Run frontend build:

```bash
npm run build --prefix frontend
```

Check backend health after starting the server:

```bash
curl http://localhost:8000/api/health
```
