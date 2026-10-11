---
name: exploratory-qa
description: Explore a running app, verify user flows and visual states, and capture screenshots or recordings for QA or PR evidence. Use when asked for manual exploratory QA, not automated test authoring or repackaging failed-test artifacts.
---

# Exploratory QA

Select features, roles, states, and viewports from the user's request and current
diff. For broader QA, use the project's feature map to plan journeys and identify
coverage gaps. Use synthetic test data and exercise the real UI. This pass does
not replace required automated checks.

## Load project context

Read applicable repository instructions and the repository root's
`.agents/project-context/runtime.md` and `qa-map.md` when present, regardless of
where this skill is installed. Check relevant facts against the current checkout.
If absent, inspect setup docs, manifests, dev scripts, routes/navigation, roles,
and fixtures to learn enough for the requested pass. Do not block focused QA on
a full feature inventory. For initial setup or a durable feature map, use
`setup-project-skills` if installed; otherwise document discovered facts at those
paths when setup is requested. Keep discovered features distinct from tested ones.

## Reach the intended app

Use the project's supported install, migration, seed, and startup workflow, in
the correct app/workspace directory. Check for an existing server and verify
its process or build belongs to the intended checkout before using it as evidence.
A responding port, login redirect, or lock file is not branch identity. Do not
kill another worktree's server. Account for coupled URL/auth settings when
changing ports.

Verify local service and database ownership before running migrations or seeds;
localhost may be a tunnel and worktrees may share resources. Use disposable
synthetic resources for destructive setup. Do not reset unknown data, stamp
migration ledgers, bypass auth, or switch to production to obtain working data.
Report missing prerequisites as blocked coverage.

Keep services in a managed terminal and verify readiness by loading the intended
page. Use the documented synthetic account provisioning and real UI sign-in.
Confirm the final route and visible identity/role before testing; preserve
membership, verification, and permission checks.

## Explore and capture

Use available browser tools or a temporary script with the project's installed
Playwright dependency. Do not assume a particular package manager, login route,
role list, or port. Follow project tooling for browser installation; do not add
an unpinned library merely for this pass.

Keep auth state and artifacts outside the repository in a private directory:

```sh
QA_DIR=$(mktemp -d "${TMPDIR:-/tmp}/exploratory-qa.XXXXXX")
```

Never commit or upload session state, cookies, credentials, private capability
URLs, or real user data. Prefer interactive sign-in; any temporary sign-in script
must use the project's selectors and verify identity before saving private state.

Choose concrete journeys with visible expected outcomes. Exercise affected
actions and relevant empty, loading, error, permission, and responsive states.
For broad QA, record what remains untested instead of implying comprehensive
coverage. Check console/network failures where they explain observed behavior.

The optional [capture helper](scripts/capture.sh) takes a page or element PNG
using `@playwright/test` or `playwright` from the current workspace. Set
`PLAYWRIGHT_DIR` for a different dependency workspace, and `QA_URL` to the verified
app URL. Set `SKILL_DIR` to this installed skill's absolute directory:

```sh
"$SKILL_DIR/scripts/capture.sh" "$QA_URL/some/route" "$QA_DIR/list.png" --storage-state "$QA_DIR/auth.json"
"$SKILL_DIR/scripts/capture.sh" "$QA_URL/some/route" "$QA_DIR/mobile.png" --device "iPhone 15 Pro"
"$SKILL_DIR/scripts/capture.sh" "$QA_URL/some/route" "$QA_DIR/card.png" --element "[data-testid=card]"
```

Omit storage state for public pages; include it in each command needing auth.
The helper supports viewport, color scheme, wait, timeout, and full-page capture.
A snapshot or fixed delay is not proof of hydration or a successful flow. For
async states, assert visible readiness in an interactive script before capturing.
Inspect every image for wrong routes/roles, loading/error pages, clipping, and
sensitive content before using it as evidence.

Record only when motion or multiple steps matter. Copy
[record-template.mjs](references/record-template.mjs) into the private directory,
replace its guard with real actions and visible-state assertions, then run it
from the dependency workspace (or set `PLAYWRIGHT_DIR`):

```sh
RECORD_URL="$QA_URL/some/route" RECORD_OUT="$QA_DIR/video" RECORD_STORAGE_STATE="$QA_DIR/auth.json" node "$QA_DIR/record.mjs"
```

Review the video or representative frames. Convert to a supported format using
available tools only when needed by the evidence destination.

## Report and share

A defect is a valid QA outcome. Report route, role, reproducible steps, expected
and actual behavior, evidence, and coverage gaps. Fix defects only within the
user's existing scope; a QA-only task does not silently expand into fixes. When
maintaining a feature map, record date/revision and actual journey outcomes,
separately from discovery status. Do not publish a clean result that omits defects.

Default to reviewed local artifacts and a concise report. Upload evidence or edit
a PR only when authorized, using an available supported connector, CLI, or UI.
Confirm the destination and access expectations; repository privacy alone does
not establish attachment privacy. If sharing is unavailable, retain local
evidence instead of falling back to a public host.

Preserve an existing PR body and add labeled evidence to its validation section;
use a temporary body file for multiline edits. Read back external edits to verify
the evidence appears once. Replies and reviewer/bot reruns require their own
authorization. Remove temporary auth state when no longer needed. Report tested
journeys, defects, reviewed artifacts, and untested or blocked states.
