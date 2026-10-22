#!/usr/bin/env bash
set -euo pipefail

# Disposable local-only test runner. It must fail closed before any destructive command.
readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly CONFIG_FILE="$ROOT_DIR/supabase/config.toml"
readonly EXPECTED_PROJECT_ID="boarvest-local"

fail() { printf 'Refusing to run: %s\n' "$1" >&2; exit 2; }

[[ "${BOARVEST_LOCAL_SUPABASE_CONFIRM:-}" == "yes" ]] || fail "set BOARVEST_LOCAL_SUPABASE_CONFIRM=yes for disposable local test data only"
[[ -f "$CONFIG_FILE" ]] || fail "missing local Supabase configuration"
[[ "$(git -C "$ROOT_DIR" branch --show-current)" == "dev" ]] || fail "the checked-out branch is not dev"
grep -Fxq 'project_id = "boarvest-local"' "$CONFIG_FILE" || fail "Supabase project_id is not boarvest-local"
grep -Eq '^port = (54321|54322|54323|54324)$|^shadow_port = 54320$' "$CONFIG_FILE" || fail "expected local Supabase ports are not configured"

# Reject common remote targeting variables without revealing their values.
for name in SUPABASE_URL SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL POSTGRES_URL POSTGRES_URL_NON_POOLING; do
  [[ -z "${!name-}" ]] || fail "remote configuration variable $name is present"
done
# Reject any explicitly configured Supabase URL, including project-local variants.
while IFS='=' read -r name _; do
  [[ "$name" =~ ^(SUPABASE|POSTGRES|DATABASE).*URL ]] && fail "remote database URL variable $name is present"
done < <(env)

command -v supabase >/dev/null 2>&1 || fail "Supabase CLI is required"
command -v docker >/dev/null 2>&1 || fail "Docker is required"
command -v python3 >/dev/null 2>&1 || fail "python3 is required for endpoint validation"
supabase start --help >/dev/null 2>&1 || fail "Supabase CLI does not support the required start command"
supabase db reset --help >/dev/null 2>&1 || fail "Supabase CLI does not support the required reset command"
supabase db execute --help >/dev/null 2>&1 || fail "Supabase CLI does not support the required execute command"

# Starting the configured local stack is not a database mutation. The endpoint
# is verified immediately afterward and before reset or SQL execution.
supabase start
status="$(supabase status --output json 2>/dev/null)" || fail "unable to verify local Supabase status"
python3 - "$status" <<'PY'
import json, sys
try:
    data = json.loads(sys.argv[1])
except (ValueError, IndexError):
    raise SystemExit("Supabase status was not valid JSON")
urls = []
def walk(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if 'url' in key.lower() and isinstance(child, str): urls.append(child)
            walk(child)
    elif isinstance(value, list):
        for child in value: walk(child)
walk(data)
if not urls or any(not (u.startswith('postgresql://127.0.0.1:') or u.startswith('postgresql://localhost:')) for u in urls):
    raise SystemExit("Supabase status did not prove a loopback database endpoint")
PY

printf '%s\n' 'Verified disposable local Supabase target; starting/resetting local test data only.'
supabase start
supabase db reset --local
supabase db execute --local --file "$ROOT_DIR/supabase/tests/deposit-accounting.sql"
