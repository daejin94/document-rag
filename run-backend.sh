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

cd "${BACKEND_DIR}"
exec ./gradlew bootRun
