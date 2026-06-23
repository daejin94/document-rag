#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

if [ ! -f "${FRONTEND_DIR}/package.json" ]; then
  echo "Missing frontend project: ${FRONTEND_DIR}/package.json" >&2
  exit 1
fi

cd "${FRONTEND_DIR}"

# 의존성이 미설치이거나 package-lock.json이 마지막 설치 이후 바뀌었을 때만 설치한다
# (npm이 설치 상태로 기록하는 node_modules/.package-lock.json과 비교 — 매번 npm ci 하는 비용 회피)
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "Installing frontend dependencies..."
  npm ci
else
  echo "Dependencies up to date, skipping install."
fi

echo "Starting frontend dev server on http://localhost:5173"
exec npm run dev
