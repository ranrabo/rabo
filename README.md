# rabo / lab occupancy

Rabo is a shared lab-room schedule and occupancy log. The public board shows the active team and weekly schedule.

## What the app does

- `/` — public read-only weekly schedule, daily view, calendar navigation, current open sessions, and member highlighting.
- `/login` — sign-in entry point for the private area. On an empty database, the first visit can create the initial account with a password of at least 12 characters. The deployed entry point is `rabo.yangran.org/login`.

The app uses `America/New_York` for “today” and the live clock. Schedule blocks use 15-minute increments between 07:00 and 19:00.

## Local development

Requirements: Node.js and a PostgreSQL-compatible database. Neon is supported and is the current hosted database provider, but any compatible PostgreSQL connection can be used for development.

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run dev
```

Set these values in the ignored `.env.local` file:

```dotenv
DATABASE_URL=
AUTH_SECRET=
```

`DATABASE_URL` is used by the application. For Neon, use the pooled connection string for normal app traffic. `DATABASE_URL_UNPOOLED` is optional; when present, Drizzle Kit uses it for schema operations such as `db:push`. Use a direct, non-pooled URL for schema changes, dumps, restores, and other session-sensitive database work.

Never commit `.env.local`, `.env`, connection strings, authentication secrets, passwords, email addresses, or member contact details.

## Database workflow

The database schema is defined in [src/db/schema.ts](src/db/schema.ts). Generated SQL is stored in [drizzle/](drizzle/). `npm run db:push` synchronizes the configured database with the current TypeScript schema; it does not copy application data between databases.

To use separate local and hosted databases, give each environment its own ignored env file and run the schema command against the intended target:

```bash
# local database
npx drizzle-kit push --config drizzle.config.ts

# another environment, after loading its env file in the current shell
set -a
source .env.production.local
set +a
npm run db:push
```

Verify `DATABASE_URL` points to the intended database before any write operation. Do not echo the loaded variables or commit the environment file.

The repository’s generated SQL describes schema changes; the current package scripts use Drizzle Kit’s push workflow rather than a separate migration-apply script. Keep schema changes in `src/db/schema.ts`, review generated SQL, and test against a non-production database before changing a shared or production database.

## Data model

- `person` — member name, optional private email, color, research area, active flag, display order, and weekly required hours.
- `weekly_block` — recurring schedule blocks with weekday, time range, effective date range, edit version, and audit timestamps.
- `block_attendance` — per-date attendance confirmations for recurring schedule blocks.
- `lab_session` — admin-entered or quick-logged time in the lab.
- `admin_note` — one private admin scratchpad entry for the board.
- `app_user` — bcrypt password hashes and admin display names used by Auth.js credentials authentication.
- `progress_entry` — reserved for future progress tracking.

Public queries use explicit member projections and omit email and other private fields. Private routes are protected by Auth.js middleware and server-side checks.

## Seeding and maintenance scripts

`npm run db:seed` creates placeholder people and recurring blocks only when those tables are empty, then adds users from shell-only variables:

```bash
export SEED_USER_ONE_EMAIL="admin-one@example.invalid"
export SEED_USER_ONE_PASSWORD="use-a-local-password-at-least-12-chars"
export SEED_USER_TWO_EMAIL="admin-two@example.invalid"
export SEED_USER_TWO_PASSWORD="use-another-local-password"
npm run db:seed
```

Use fake/local values while developing. Do not put real credentials in this README or in version control.

Additional scripts are available for controlled maintenance:

```bash
npx tsx src/db/set-person-active.ts "name or id" false
npx tsx src/db/set-team-schedule.ts                 # dry run
npx tsx src/db/set-team-schedule.ts --force         # apply planned schedule replacement
npx tsx src/db/reset-user.ts username password --force
```

`set-team-schedule.ts` can target another env file and supports `--create-missing` and `--deactivate-others`. `reset-user.ts` is destructive for the `app_user` table and requires `--force`; inspect the target environment first.

## Commands

- `npm run dev` — start local development
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run db:generate` — generate a new Drizzle SQL migration from schema changes
- `npm run db:push` — synchronize the configured database schema
- `npm run db:seed` — add placeholder data and env-configured users

## Project layout

- `src/app/` — Next.js routes, login, admin pages, and Auth.js handler
- `src/components/` — public board, controls, UI components, and CSV export
- `src/db/` — schema, seed, and maintenance scripts
- `src/lib/` — data access and date/time helpers
- `drizzle/` — generated PostgreSQL SQL and migration snapshots
