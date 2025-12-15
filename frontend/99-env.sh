#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV = {
  VIETMAP_API_KEY: "${VIETMAP_API_KEY:-}",
  GEMINI_API_KEY: "${GEMINI_API_KEY:-}",
  AUTH_TOKEN: "${AUTH_TOKEN:-}",
};
EOF
