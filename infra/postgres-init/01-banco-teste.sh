#!/bin/sh
# Banco descartável dos testes de integração (TEST_DATABASE_URL). O teste apaga os schemas dele.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE ${POSTGRES_DB}_teste OWNER \"$POSTGRES_USER\";"
