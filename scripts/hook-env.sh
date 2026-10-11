#!/bin/sh
# Sourced by the husky hooks in .husky/. Makes the repo's pinned toolchain work
# from any checkout, including git worktrees (for example .claude/worktrees/*),
# where there is no node_modules and no .env, and the login
# shell's node may not match .node-version.
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

# 2. pnpm: corepack (bundled with Node 24) runs the exact version pinned in
#    package.json "packageManager", so a different global pnpm cannot rewrite the lockfile.
if ! command -v pnpm >/dev/null 2>&1; then
  pnpm() { corepack pnpm "$@"; }
fi

# 3. Dependencies: a no-op install takes about a second when node_modules is current.
pnpm install --frozen-lockfile >/dev/null

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
