#!/usr/bin/env bash
# Compact verify: typecheck + lint + format + tests, one line per step.
# On failure, prints the relevant error output. Used by the pre-commit hook and CI.

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
RESET='\033[0m'

pass() { printf "${GREEN}✓${RESET} %s${DIM} %s${RESET}\n" "$1" "$2"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }

errors=""
overall=0

# Everything downstream typechecks against @devgym/shared's built .d.ts, so the
# build has to happen first — it can't join the parallel block below.
if ! pnpm --filter @devgym/shared build >/dev/null 2>&1; then
  fail "shared build"
  printf "\n${RED}@devgym/shared failed to build — nothing else can typecheck.${RESET}\n"
  exit 1
fi

# ── Auto-fix (skip in CI — a clean checkout has no changed files) ─────────────
changed=()
if [ -z "$CI" ]; then
  while IFS= read -r f; do
    [[ -n "$f" && -f "$f" ]] && changed+=("$f")
  done < <(
    {
      git diff --name-only HEAD 2>/dev/null
      git diff --name-only --cached 2>/dev/null
      git ls-files --others --exclude-standard 2>/dev/null
    } | sort -u | grep -E '\.(ts|tsx|css)$' | grep -E '^(apps|packages)/'
  )

  if [ ${#changed[@]} -gt 0 ]; then
    pnpm exec eslint --fix "${changed[@]}" >/dev/null 2>&1 || true
    pnpm exec prettier --write "${changed[@]}" >/dev/null 2>&1
  fi
fi

# ── Parallel checks ──────────────────────────────────────────────────────────
tmpdir=$(mktemp -d)

run_check() {
  local name="$1"; shift
  if "$@" >"$tmpdir/$name.out" 2>&1; then
    echo "pass" > "$tmpdir/$name.status"
  else
    echo "fail" > "$tmpdir/$name.status"
  fi
}

run_check "typecheck-server" pnpm --filter @devgym/server typecheck &
run_check "typecheck-web"    pnpm --filter @devgym/web typecheck &
run_check "typecheck-shared" pnpm --filter @devgym/shared typecheck &
run_check "lint"             pnpm exec eslint . &
run_check "format"           pnpm exec prettier --check . &

# SKIP_UNIT_TESTS=1 omits the test run — the pre-commit hook sets it so committing
# stays fast, and pre-push runs the full suite instead.
if [ -z "$SKIP_UNIT_TESTS" ]; then
  run_check "tests"          pnpm --filter @devgym/server test &
  run_check "tests-web"      pnpm --filter @devgym/web test &
fi

wait

# ── Report results ───────────────────────────────────────────────────────────
for name in typecheck-shared typecheck-server typecheck-web lint format tests tests-web; do
  [ -f "$tmpdir/$name.status" ] || continue
  status=$(cat "$tmpdir/$name.status")
  if [ "$status" = "pass" ]; then
    pass "$name"
  else
    fail "$name"
    if [ "$name" = "tests" ] || [ "$name" = "tests-web" ]; then
      filtered=$(grep -E '(FAIL|Error|✗|×|expected|received|AssertionError)' "$tmpdir/$name.out" | head -20)
    else
      # Strip pnpm lifecycle noise, keep the meaningful error lines
      filtered=$(grep -vE '(^[[:space:]]*$|^> |^$|ELIFECYCLE|ERR_PNPM|Exit status|^Scope:)' "$tmpdir/$name.out" | tail -15)
    fi
    if [ -n "$filtered" ]; then
      errors+="$(printf "\n── %s ──\n%s\n" "$name" "$filtered")"
    fi
    overall=1
  fi
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ $overall -eq 0 ]; then
  printf "${GREEN}All checks passed.${RESET}\n"
else
  printf "${RED}Some checks failed:${RESET}\n"
  echo "$errors"
fi

rm -rf "$tmpdir"
exit $overall
