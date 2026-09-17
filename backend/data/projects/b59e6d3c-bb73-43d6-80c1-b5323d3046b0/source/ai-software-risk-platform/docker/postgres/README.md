# docker/postgres/

Reserved for custom PostgreSQL initialization scripts (e.g. extension
setup, seed data) that would be mounted into the `postgres` service's
`/docker-entrypoint-initdb.d/` directory.

Not needed for Phase 1 -- the `postgres` service in `docker-compose.yml`
uses the stock `postgres:16-alpine` image with no custom initialization.
