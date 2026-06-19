# Assam Tea Co — Blend ERP + CRM

A production-ready Tea Blend ERP built with **Next.js 15 (App Router) + Prisma + PostgreSQL**.
Manage tea types, standard & customer-specific blends, the blend costing engine, customers,
and immutable recipe logs — designed to deploy to **Railway** in minutes.

## Features
- **Standard blends** — house recipes; each has a worker production card that scales ratios to any batch size in kg, printable.
- **Customer blends** — customised recipes linked to a customer, optionally derived from a standard blend (master is never overwritten).
- **Blend costing engine** — weighted-average cost from tea prices + ratios, live margin.
- **Recipe logs** — every production run is frozen as an immutable snapshot (ratios + tea costs at that moment), auto lot numbers `LOT-YYYY-00001`, searchable by customer / lot / blend.
- **Tea types** and **Customer CRM** with revenue + order rollups.
- **Dashboard** with live metrics.

## Deploy to Railway (fastest path)

1. Push this folder to a GitHub repo.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**, pick the repo.
3. In the project, **+ New → Database → Add PostgreSQL**. Railway auto-injects `DATABASE_URL`.
4. Open your service → **Variables** and confirm `DATABASE_URL` is referenced
   (if needed add a variable `DATABASE_URL = ${{Postgres.DATABASE_URL}}`).
5. The first deploy runs `prisma migrate deploy` automatically (see `railway.json`).
6. **Seed demo data once** (optional): in the service shell / Railway CLI run:
   ```
   npx prisma db push   # if you skipped migrations
   npm run db:seed
   ```
7. Open the generated URL. Done.

> The build uses `output: 'standalone'` and Node 22 (see `nixpacks.toml`).

## Local development

```bash
npm install
cp .env.example .env          # paste a Postgres URL into .env
npx prisma migrate dev --name init
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:3000
```

## First-time database setup

This repo ships without a migrations folder so you control the first migration:

```bash
npx prisma migrate dev --name init    # local: creates migration + applies
# or, simplest:
npx prisma db push                     # pushes schema directly, no migration files
```

On Railway, `railway.json` runs `prisma migrate deploy`. If you used `db push` locally
and have no migrations, either generate one with `prisma migrate dev --name init` and commit it,
**or** change the Railway start command to `npx prisma db push && npm run start`.

## Project structure

```
prisma/
  schema.prisma        # data model (tea types, blends, items, customers, recipe logs)
  seed.mjs             # demo data
src/
  lib/
    prisma.ts          # singleton client
    costing.ts         # blend costing engine
  app/
    api/               # REST routes: teas, blends, customers, logs, dashboard
    blends/standard    # standard blends tab
    blends/customer    # customer blends tab
    teas, customers, logs, page.tsx (dashboard)
  components/
    BlendsView.tsx     # shared blends UI: builder, worker view, produce→log
    Sidebar.tsx, Toast.tsx
```

## Data model highlights

`RecipeLog` + `RecipeLogItem` store `costSnapshot`, `priceSnapshot`, and per-tea
`teaCostSnapshot` / `ratio` captured at production time. Updating a tea's price later
never alters historical logs — full traceability for reorders and audits.

## Roadmap hooks (schema already supports)
Inventory & stock consumption, purchase orders/suppliers, batch manufacturing & yield,
GST invoices, warehouse transfers, and an AI blend-recommendation layer.
