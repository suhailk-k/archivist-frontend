# Archivist

Personal work OS — organisations, projects, planning, docs, meetings, decisions, activity history in one place.

## Live

- **Frontend (prod):** https://archivist-frontend.suhailkk1999.workers.dev
- **Backend:** self-hosted Node process, exposed via a `cloudflared` quick tunnel — **URL changes every restart** (machine reboot, process death). Current tunnel: see backend repo's `DEPLOY_CHECKLIST.md`. When it changes, update `VITE_API_URL` on the frontend deploy and redeploy, or the frontend shows "backend unreachable".

## Repos

- **Frontend:** https://github.com/suhailk-k/my
- **Backend:** https://github.com/suhailk-k/archivist-backend

## Tech Stack

**Frontend** (this repo)
- TanStack Start (React 19) + TanStack Router / Query
- Tailwind CSS + Radix UI primitives
- Vite

**Backend** ([archivist-backend](https://github.com/suhailk-k/archivist-backend))
- Node + TypeScript, `better-sqlite3`
- Exposed locally via `cloudflared` tunnel (not a hosted deploy)

## Setup

```bash
yarn install
yarn dev
```

- `yarn build` — production build
- `yarn preview` — preview production build
- `yarn lint` / `yarn format`

## Environment

| Var | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://<page-hostname>:3001` |

## Roadmap

See [roadmap.md](./roadmap.md).
