# gastos-app

Personal expense dashboard — CRUD + SQLite + charts.

## Architecture

- **Backend**: Node.js + Express (CommonJS), entrypoint `server/index.js`
- **Frontend**: Vue 3 + Vue Router 4 SPA served as static files by Express from `client/`. No build step — loaded from CDNs.
- **Database**: SQLite via `sql.js` (WebAssembly, in-memory). Runs in-memory with manual persistence: every write **must** call `saveDB()` to flush to `gastos.db`. The DB file is created automatically on first run.
- **Single process**: server listens on port 3000 and serves both API and frontend.

## Commands

```sh
npm install        # install dependencies
npm run seed       # populate example data (deletes existing first)
npm run dev        # start with nodemon (auto-reload on changes)
npm start          # start without auto-reload
npm run electron   # start as Electron desktop app
npm run dist       # build single portable .exe (output in release/)
```

No test, lint, or typecheck scripts exist. No CI/CD.

## Desktop mode (Electron)

- `electron/main.js` is the Electron entrypoint — starts Express internally, then opens a `BrowserWindow` pointing to `localhost:3000`.
- When run via `ELECTRON_RUN=true`, `server/index.js` exports `startServer()` instead of auto-starting.
- The SQLite DB is stored in `app.getPath('userData')` to survive reinstalls.
- `npm run dist` builds a **portable .exe** (no installer needed) via electron-builder. Output goes to `release/`.
- The CLI mode (`npm run dev` / `npm start`) is **unchanged** — still works as a web app without Electron.

## Key facts

- `PLAN.md` is an historical planning doc — the actual implementation uses `sql.js`, not `better-sqlite3`. Trust `server/` source over `PLAN.md`.
- `migrate_to_deno.md` is a generic copy of Deno migration docs, not project-specific.
- The API serves `client/` statically at `/`. The SPA uses hash-based routing (`#/` and `#!/gerenciamento`).
- Transaction query params: `?month=2024-01`, `?category=Food`, `?search=keyword`.
- Export: `GET /api/export` (optionally `?month=2024-01`). Import: `POST /api/import` (merge — duplicate categories ignored, transactions always added).
- `POST /api/clear` deletes all data.
- `package.json` has no `"type"` field so CommonJS is the default.
