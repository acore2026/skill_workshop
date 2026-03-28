#!/bin/sh
set -eu

if [ -f /app/backend/.env.backend ]; then
  set -a
  . /app/backend/.env.backend
  set +a
fi

API_PORT="${API_PORT:-8082}"

/app/skill-workshop-api &
API_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

trap 'kill $API_PID $NGINX_PID 2>/dev/null || true' INT TERM

while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || true
    kill "$NGINX_PID" 2>/dev/null || true
    exit 1
  fi
  if ! kill -0 "$NGINX_PID" 2>/dev/null; then
    wait "$NGINX_PID" || true
    kill "$API_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done
