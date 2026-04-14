-- Runs only on fresh postgres data dir via /docker-entrypoint-initdb.d.
-- Creates the dedicated test database. Schema is applied at test-run time by
-- tests/setup/globalSetup.ts, not here.
CREATE DATABASE twofold_test;
