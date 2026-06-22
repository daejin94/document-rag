#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKEND_DIR="${SCRIPT_DIR}/backend"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing .env file: ${ENV_FILE}" >&2
  exit 1
fi

if [ ! -x "${BACKEND_DIR}/gradlew" ]; then
  echo "Missing executable Gradle wrapper: ${BACKEND_DIR}/gradlew" >&2
  echo "Run: chmod +x backend/gradlew" >&2
  exit 1
fi

set -a
. "${ENV_FILE}"
set +a

case "${SPRING_DATASOURCE_URL:-}" in
  jdbc:postgresql://localhost:*|jdbc:postgresql://127.0.0.1:*)
    echo "Ensuring local PostgreSQL container is running..."
    docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d postgres

    i=0
    while [ "${i}" -lt 30 ]; do
      if docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T postgres pg_isready -U rag_user -d rag_db >/dev/null 2>&1; then
        break
      fi
      i=$((i + 1))
      sleep 1
    done

    if [ "${i}" -eq 30 ]; then
      echo "PostgreSQL container did not become ready in time." >&2
      echo "Check: docker compose ps postgres" >&2
      exit 1
    fi
    ;;
esac

echo "Starting backend with RAG_TOP_K=${RAG_TOP_K:-5}, RAG_SIMILARITY_THRESHOLD=${RAG_SIMILARITY_THRESHOLD:-0.70}"

cd "${BACKEND_DIR}"
exec ./gradlew bootRun
