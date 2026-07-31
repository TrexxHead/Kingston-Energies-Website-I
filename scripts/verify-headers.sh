#!/usr/bin/env bash
# Verifies the security headers a deployment actually sends match what
# next.config.js declares. Run against any live URL:
#
#   ./scripts/verify-headers.sh https://kingstonenergies.com
#   ./scripts/verify-headers.sh https://<preview-deployment>.vercel.app
#
# Exits non-zero (and prints every failure) if anything doesn't match, so it
# can gate a CI job against a preview deployment.

set -u

BASE_URL="${1:-http://localhost:3000}"
FAILURES=0

fetch_headers() {
  curl -sSI --max-time 10 "$1"
}

check_present() {
  local path="$1" header="$2"
  local headers
  headers=$(fetch_headers "${BASE_URL}${path}")
  if echo "$headers" | grep -qi "^${header}:"; then
    echo "  OK   ${header} present on ${path}"
  else
    echo "  FAIL ${header} missing on ${path}"
    FAILURES=$((FAILURES + 1))
  fi
}

check_absent() {
  local path="$1" header="$2"
  local headers
  headers=$(fetch_headers "${BASE_URL}${path}")
  if echo "$headers" | grep -qi "^${header}:"; then
    echo "  FAIL ${header} present on ${path} (should be absent)"
    FAILURES=$((FAILURES + 1))
  else
    echo "  OK   ${header} absent on ${path}"
  fi
}

check_value_contains() {
  local path="$1" header="$2" needle="$3"
  local value
  value=$(fetch_headers "${BASE_URL}${path}" | grep -i "^${header}:")
  if echo "$value" | grep -qi "$needle"; then
    echo "  OK   ${header} on ${path} contains '${needle}'"
  else
    echo "  FAIL ${header} on ${path} missing '${needle}' — got: ${value:-<absent>}"
    FAILURES=$((FAILURES + 1))
  fi
}

check_value_not_contains() {
  local path="$1" header="$2" needle="$3"
  local value
  value=$(fetch_headers "${BASE_URL}${path}" | grep -i "^${header}:")
  if echo "$value" | grep -qi "$needle"; then
    echo "  FAIL ${header} on ${path} still contains '${needle}'"
    FAILURES=$((FAILURES + 1))
  else
    echo "  OK   ${header} on ${path} doesn't contain '${needle}'"
  fi
}

echo "Verifying security headers on ${BASE_URL}"
echo ""

echo "-- Home page --"
check_absent "/" "X-Powered-By"
check_present "/" "Content-Security-Policy"
check_present "/" "Strict-Transport-Security"
check_value_contains "/" "Strict-Transport-Security" "max-age=63072000"
check_present "/" "X-Content-Type-Options"
check_present "/" "X-Frame-Options"
check_present "/" "Referrer-Policy"
check_present "/" "Permissions-Policy"
check_present "/" "Cross-Origin-Opener-Policy"
check_value_not_contains "/" "Content-Security-Policy" "unsafe-eval"
check_value_not_contains "/" "Content-Security-Policy" "api.anthropic.com"
check_value_not_contains "/" "Content-Security-Policy" "supabase.co"

echo ""
echo "-- Cache-Control on personalised / order-bearing routes --"
for path in "/track" "/cart" "/hub" "/admin"; do
  check_value_contains "$path" "Cache-Control" "no-store"
done

echo ""
echo "-- Cache-Control on API routes --"
check_value_contains "/api/orders/track?no=KE-0000" "Cache-Control" "no-store"

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo "All checks passed."
  exit 0
else
  echo "${FAILURES} check(s) failed."
  exit 1
fi
