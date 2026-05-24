# ProdIntel — Productivity Intelligence Platform

A smart full-stack productivity analytics web app where users track daily activities, view productivity dashboards, and receive AI-like self-improvement recommendations based on behavioral patterns.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/productivity-app run dev` — run the frontend (port 21644)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (bcrypt + jsonwebtoken, token stored in localStorage)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: users, profiles, activities, logs
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + requireAuth middleware
- `artifacts/productivity-app/src/` — React frontend
- `artifacts/productivity-app/src/lib/auth.ts` — token helpers + `setAuthTokenGetter`
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)

## Architecture decisions

- Contract-first: OpenAPI spec gates codegen which gates the frontend — spec changes require re-running codegen
- JWT auth via `Authorization: Bearer` header; token injected via `setAuthTokenGetter` into the Orval-generated fetch layer
- All analytics are computed server-side from the logs table (no separate analytics table)
- Activities are per-user; logs are daily snapshots — logs are upserted (not duplicated) per activity per day
- Profile is auto-created (empty) on registration; updated via PATCH /profile

## Product

- **Auth:** Email/password register + login with persistent JWT sessions
- **Dashboard:** Today's productivity score, streak tracker, BMI card, activity completion checklist
- **Analytics:** Weekly bar charts, monthly trend charts, activity breakdown pie chart
- **Activities:** Full CRUD for custom activities with productive/non-productive toggle
- **AI Recommendations:** Rule-based insights — strengths, weaknesses, prioritized tips, weekly insight
- **History:** Date-range filterable logs grouped by day/week/month with contribution heatmap
- **Profile:** Edit all personal data (profession, height, weight, goals, sleep targets)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run codegen after editing `lib/api-spec/openapi.yaml`
- Body schema names in the OpenAPI spec must NOT match `<OperationIdPascal>Body` — use entity-shaped names to avoid TS2308 collisions
- bcrypt requires native compilation — run `pnpm approve-builds` if it shows a build warning after reinstall
- The `profileData` spread in the profile route uses a type cast — if adding new profile fields, keep the Zod schema and Drizzle table in sync

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
