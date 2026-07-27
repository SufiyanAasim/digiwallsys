# Docker assets

The root `Dockerfile` builds the API, while `docker-compose.yml` starts the API
and a PostgreSQL 16 database initialized from `config/database.sql`.

```bash
docker compose up --build
```

The API listens on `http://localhost:5000` and the database on `localhost:5432`.

## Schema initialization

`config/database.sql` is mounted as `/docker-entrypoint-initdb.d/001-schema.sql`
and `\ir`-includes every file in `config/migrations/` in order, so a fresh
database lands on the current schema. Add each new migration to that file — the
Postgres entrypoint only executes scripts sitting directly in
`/docker-entrypoint-initdb.d`, so files added to the mounted `migrations/`
subdirectory are never picked up on their own.

That entrypoint **only runs against an empty data directory**. After the first
`up`, the `digiwallsys-data` volume persists and new migrations are ignored. To
pick them up, either apply them by hand or recreate the volume:

```bash
docker compose down -v && docker compose up --build
```

`down -v` deletes the local database and everything in it.

## Configuration

Compose sets the API environment inline; `.env.example` documents the full set
of variables. The values there are local placeholders — `JWT_SECRET` and
`FUNDING_WEBHOOK_SECRET` must be replaced with real secrets before any
deployment, and no real credential belongs in this file, which is tracked in Git.

`NODE_ENV` is set back to `development` for the local stack. The image itself
defaults to `production`; under that setting `emailService` withholds the
verification token from the API response, and because no mail provider is wired
up locally, no account could be verified and no one could sign in.
