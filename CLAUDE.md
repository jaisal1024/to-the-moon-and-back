@AGENTS.md

# Claude Code notes

Everything in AGENTS.md applies. These points are specific to Claude Code sessions.

## Worktrees

- Sessions usually run in a worktree under `.claude/worktrees/<name>`. The git hooks bootstrap node, bun, dependencies, env, and generated types there automatically, so `git push` works without manual setup.
- Never push with `--no-verify`. If a hook fails, read its `hook-env:` message; it names the missing piece (node version, bun version, `.env`).
- `bun run dev` in a worktree needs a `.env`. Symlink it from the main checkout as described in AGENTS.md rather than copying secrets around.
- Do not `cd` into the main checkout or other worktrees. Use `git rev-parse --path-format=absolute --git-common-dir` to locate shared files.

## Database

Local and cloud sessions both have Docker. Run `bun run dev-local` to start Postgres 18 and the dev server, and use the local `DATABASE_URL` from AGENTS.md. Never connect a session to Neon.

## Pull requests

- Keep one commit per branch: amend and rebase rather than stacking fixup commits.
- Open PRs as drafts unless asked otherwise. Titles follow conventional commits; CI enforces it.
- After opening a PR, use the PR status tools to read CI rather than polling `gh`.
