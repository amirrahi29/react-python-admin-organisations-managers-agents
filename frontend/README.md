# AI Outbound Sales — Frontend

Next.js 16 app for the **Admin**, **Manager**, and **Agent** portals.

## Run

```bash
# Terminal 1 — backend (port 8000)
cd backend && source .venv/bin/activate && python app.py

# Terminal 2 — frontend (port 3000)
cd frontend && npm install && npm run dev
```

Copy env files before first run:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Set `BACKEND_URL=http://127.0.0.1:8000` in `frontend/.env.local`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `node scripts/capture-readme-screenshots.mjs` | Regenerate README screenshots (requires backend + dev server) |

See the [root README](../README.md) for portal URLs, features, and screenshot list.
