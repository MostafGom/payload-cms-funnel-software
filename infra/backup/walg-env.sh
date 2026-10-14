#!/bin/sh
# WAL-G reads its configuration from the environment (ADR-0019). Required:
#   WALG_S3_PREFIX=s3://fp-backups/pg   AWS_ACCESS_KEY_ID  AWS_SECRET_ACCESS_KEY
# Optional for S3-compatible stores: AWS_ENDPOINT, AWS_S3_FORCE_PATH_STYLE=true, AWS_REGION.
# Backups are encrypted client-side with libsodium when WALG_LIBSODIUM_KEY is set (recommended).
export PGHOST="${PGHOST:-/var/run/postgresql}" PGUSER="${PGUSER:-${POSTGRES_USER:-postgres}}" PGDATABASE="${PGDATABASE:-${POSTGRES_DB:-postgres}}"
export WALG_COMPRESSION_METHOD="${WALG_COMPRESSION_METHOD:-zstd}"
