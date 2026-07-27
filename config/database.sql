-- Fresh-database bootstrap: applies every migration in order. Keep this list in
-- step with config/migrations/ or a new database will start on an older schema.
\set ON_ERROR_STOP on
\ir migrations/001_initial.sql
\ir migrations/002_platform_features.sql
\ir migrations/003_convoy_features.sql
\ir migrations/004_estuary_features.sql
