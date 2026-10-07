#!/bin/sh
# Sourced by the husky hooks in .husky/. Makes the repo's pinned toolchain work
# from any checkout, including git worktrees (for example .claude/worktrees/*),
# where there is no node_modules and no .env, and the login
# shell's node/bun may not match .node-version / package.json "packageManager".
#
# Everything here is idempotent and fast when the checkout is already set up.

set -e
cd "$(git rev-parse --show-toplevel)"

# 1. Node: match .node-version. Prefer nvm when it is installed; otherwise just check.
WANT_NODE="$(tr -d ' \n' < .node-version)"
have_node() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null; }
if [ "$(have_node)" != "$WANT_NODE" ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
    nvm use "$WANT_NODE" >/dev/null 2>&1 || true
  fi
fi
if [ "$(have_node)" != "$WANT_NODE" ]; then
  echo "hook-env: need node $WANT_NODE (.node-version), found $(node --version 2>/dev/null || echo none)." >&2
  echo "hook-env: install it (nvm install $WANT_NODE) or activate it before pushing." >&2
  exit 1
fi

# 2. Bun: match package.json "packageManager". Fall back to the npm-distributed
#    binary of the exact version so an older global bun cannot rewrite bun.lock.
WANT_BUN="$(sed -n 's/.*"packageManager": *"bun@\([^"]*\)".*/\1/p' package.json)"
if [ -n "$WANT_BUN" ] && [ "$(command bun --version 2>/dev/null)" != "$WANT_BUN" ]; then
  echo "hook-env: global bun is $(command bun --version 2>/dev/null || echo missing); using bun@$WANT_BUN via npx (run 'bun upgrade' to make this permanent)." >&2
  bun() { npx -y "bun@$WANT_BUN" "$@"; }
  bunx() { npx -y "bun@$WANT_BUN" x "$@"; }
fi

# 3. Dependencies: a no-op install takes about a second when node_modules is current.
bun install --frozen-lockfile >/dev/null

# 4. Env: a worktree has no .env (it is gitignored). Load the main checkout's .env
#    into this process only; nothing is written to disk.
if [ ! -f .env ]; then
  MAIN_CHECKOUT="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
  if [ -f "$MAIN_CHECKOUT/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$MAIN_CHECKOUT/.env"
    set +a
  fi
fi
