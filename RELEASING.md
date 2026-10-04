# Releases

[Release-please](https://github.com/googleapis/release-please-action) manages this site's changelog, version, release PRs, and GitHub releases. This follows `jaisal1024/skills`: the `simple` strategy tracks `version.txt` and `.release-please-manifest.json`, with tags such as `v0.1.0`. The initial `0.0.0` is a bootstrap baseline, not a published release. The private application does not need a package version or npm publication.

## GitHub setup

Install a dedicated GitHub App on `jaisal1024/to-the-moon-and-back`, with **Contents**, **Issues**, and **Pull requests** read/write permissions. An existing release app can be used if it is installed on this repository and has these permissions. Webhooks and user authorization are unnecessary.

1. Set the repository Actions variable `RELEASE_APP_CLIENT_ID` to the app's Client ID.
2. Set the repository Actions secret `RELEASE_APP_PRIVATE_KEY` to its PEM private key. Enter it in GitHub settings; never commit it or paste it in chat.
3. The **Release app version tag creation** ruleset restricts `v*` creation to this App (Integration actor ID 5187976). Keep its creation-only bypass separate from **Immutable release version tags**, which blocks updates and deletion without any bypass actors.
4. Enable repository auto-merge and squash merging. Require pull requests and **CI - gate** in the `main` branch ruleset, with zero required approvals to permit fully automatic releases. Keep the build and E2E jobs in the gate, and preserve the existing code-quality, code-scanning, history, force-push, deletion, and administrator-bypass settings. Use squash merging with the PR title as the squash commit title. The gate checks the PR title, release configuration, production build, lint, type-checking, unit tests, Knip, and browser E2E tests. Failed, cancelled, or unexpectedly skipped checks fail the gate. PR-title validation reruns on title edits and checks only the title, not individual commits.

The App token creates release PRs and enables squash auto-merge so normal CI runs and the eventual merge triggers the next push-to-main publication run. `GITHUB_TOKEN` stays read-only; no PR approval permission, status exemptions, check bypasses, or publication dispatch is needed. No application environment variables are needed for release automation. Release App authentication and release-please retain the commit pins used by the `skills` template.

CI needs the existing `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL` Actions secrets to generate real GraphQL types and exercise the site. Both app jobs select Node 24 and the Bun version declared in `package.json` and install from the frozen lockfile. The E2E job generates types before starting the development server; the build script generates them before the production build. Release configuration is validated against the upstream schema, and the manifest must match `version.txt`. These metadata checks run for every CI invocation and before release-please runs.

## Workflow

1. Merge changes into `main` using Conventional Commit messages. When squash merging, preserve the PR title as the squash commit title: `feat: ...` proposes a minor release, `fix: ...` proposes a patch, and `feat!: ...` marks a breaking change. Before 1.0, breaking changes bump the minor version. Maintenance commits such as `chore:` and `docs:` do not independently trigger a release.
2. **Release please** creates or updates a PR containing `CHANGELOG.md`, `version.txt`, and `.release-please-manifest.json`. Existing release-worthy history can be included in the first release.
3. The workflow verifies the dedicated App author, same-repository release branch, `main` target, pending-release label, and metadata-only diff. Only added or modified `CHANGELOG.md`, `version.txt`, and `.release-please-manifest.json` are eligible. It rechecks the head SHA and enables squash auto-merge for that exact commit. Existing pending release PRs are also processed when a run is retried.
4. GitHub waits for the real required CI gate, code-quality and security checks, and an up-to-date branch before merging. Vercel previews continue running normally; they are not listed as required checks in the current ruleset. No manual approval is required. Unexpected files, renames, deletions, changed heads, conflicts, and unmet requirements block automation. The script never marks checks successful or uses administrator bypass.
5. The release App merge triggers the normal push to `main`; release-please then creates the version tag and GitHub release. Unlike the Skills workflow, this repository keeps its application checks and uses an App-token merge instead of `GITHUB_TOKEN` check exemptions and explicit publication dispatch.

Use **Run workflow** on `main` to retry after correcting configuration or access failures. Do not manually bump version files or move published tags. Vercel continues deploying merges to `main`; GitHub releases do not deploy the site or publish an npm package.
