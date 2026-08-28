# rabo / lab occupancy

Shared weekly room schedule for a research group. The public schedule is read-only; `/admin` is protected by Auth.js credentials.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` to the pooled Neon connection string and set a strong `AUTH_SECRET`. For the seeded local users, provide these variables only in your shell or an ignored local env file:

```bash
SEED_USER_ONE_EMAIL=person.one@example.invalid
SEED_USER_ONE_PASSWORD=change-me-one
SEED_USER_TWO_EMAIL=person.two@example.invalid
SEED_USER_TWO_PASSWORD=change-me-two
npm run db:push
npm run db:seed
npm run dev
```

`drizzle.config.ts` prefers `DATABASE_URL_UNPOOLED` when it is available for migrations, while the app uses the pooled `DATABASE_URL`.

## Commands

- `npm run dev` — local development
- `npm run build` — production build
- `npm run db:generate` — generate a Drizzle migration
- `npm run db:push` — apply the schema to the configured database
- `npm run db:seed` — add placeholder people, recurring blocks, and env-configured users
