# Food POS (Version Two)

Production-ready food order management app with:
- Node.js + Express API
- SQLite for local development
- PostgreSQL/Supabase for production (recommended for Vercel)

## Admin Menu Management (Latest)

- Admin page route: `GET /menu` (HTML view), with JSON catalog via `GET /menu?format=json`
- Category-first management view with expandable category sections
- Dynamic custom category creation from UI (`+ Add Category` in dropdown)
- Category APIs:
  - `GET /menu/categories` (admin)
  - `POST /menu/categories` (admin) body `{ "name": "Your Category" }`
- Contextual save toasts with inline card highlight and Undo support:
  - Variant price updates (appetizer groups)
  - Item edits (non-image field updates)
  - Availability toggle updates
- Card actions simplified:
  - `View Details`
  - `Edit Item` (includes image update)
  - `Duplicate Item`
  - `Delete Item`

## Database Mode Selection

The server auto-selects DB mode:
- Uses Postgres when `DATABASE_URL` (or `POSTGRES_URL`) is set
- Falls back to SQLite otherwise

You can force Postgres with:
```bash
DB_CLIENT=postgres
```

## Local Run

```bash
npm install
npm run dev
```

Open:
```text
http://localhost:3000
```

## Supabase + Vercel Setup

### 1. Create Supabase database URL
From Supabase project settings, copy the Postgres connection string and set it as:
- `DATABASE_URL`

Recommended SSL setting:
- `PGSSL=true`

### 2. Initialize Postgres schema
Run once (locally, with `DATABASE_URL` pointing to Supabase):
```bash
npm run db:init:postgres
```

### 3. Migrate existing local SQLite data to Supabase
If `data/food_orders.db` has your current data:
```bash
npm run migrate:supabase
```

If target Supabase already has data and you want to overwrite:
```bash
ALLOW_OVERWRITE=1 npm run migrate:supabase
```

### 4. Configure Vercel environment variables
Set these in Vercel Project Settings -> Environment Variables:
- `DATABASE_URL=<supabase_postgres_url>`
- `PGSSL=true`
- `DB_CLIENT=postgres`
- `ADMIN_PIN=<your_admin_pin>`
- `SKIP_DB_INIT=true`

Notes:
- `SKIP_DB_INIT=true` is preferred on Vercel to avoid cold-start schema migrations.
- Run migrations from your local machine/CI instead of at request time.

### 5. Deploy
```bash
vercel --prod
```

## Migration Coverage

`scripts/migrate-sqlite-to-postgres.js` now migrates:
- `users` (username/password/role)
- `categories`
- `menu_items`
- `appetizer_groups`
- `appetizer_variants`
- `orders` including `order_type`, address/notes, owner user, `order_date`
- `order_items`

Also resets Postgres sequences after import.

## Auth Defaults

Default seeded users:
- admin / admin
- user / user

## Helpful Commands

```bash
npm run db:init:postgres
npm run migrate:postgres
npm run migrate:supabase
npm run smoke
```
