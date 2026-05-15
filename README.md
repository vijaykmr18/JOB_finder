# Job Chance Hunter

AI-powered job discovery and application tracking for job seekers. The app stores user profiles in MongoDB Atlas, parses PDF resumes, ranks live openings, and opens each application through the original apply link.

## Features

- Sign up and sign in with password hashing and JWT sessions.
- Resume PDF parsing for skills, role, phone, location, and experience hints.
- Manual profile fallback when a resume is missing or the PDF cannot provide enough details.
- Daily ranked jobs from public job feeds plus direct company career boards.
- Apply links open the original job page and the app tracks application status.
- OpenRouter ranking with a heuristic fallback if the model/API is unavailable.
- Dashboard with XP, setup progress, apply quest, bookmarks, skipped jobs, and tracked applications.

## Stack

- Backend: Node.js, Express, Mongoose, Multer, PDF Parse, node-cron
- Frontend: React, Vite, Lucide icons, custom CSS
- Database: MongoDB Atlas
- LLM: OpenRouter Chat Completions API

## Environment

Keep real secrets only in `.env` or Vercel environment variables.

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

For Vercel, set `MONGO_URI`, `MONGO_DB_NAME`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `APP_TIMEZONE`, and `OPENROUTER_MODEL`. The frontend uses same-origin `/api` in production, so `VITE_API_URL` is optional when the backend and frontend are deployed together.

## Run

```bash
npm install
npm run install:frontend
npm run build:frontend
npm run dev
```

Open `http://localhost:8000` for the full app after building the frontend. During active frontend development you can also run `npm run dev --prefix frontend` and open `http://localhost:5173`.

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
