# Releases

[Release-please](https://github.com/googleapis/release-please-action) manages this site's changelog, version, release PRs, and GitHub releases. This follows `jaisal1024/skills`: the `simple` strategy tracks `version.txt` and `.release-please-manifest.json`, with tags such as `v0.1.0`. The initial `0.0.0` is a bootstrap baseline, not a published release. The private application does not need a package version or npm publication.

## GitHub setup

Install a dedicated GitHub App on `jaisal1024/to-the-moon-and-back`, with **Contents**, **Issues**, and **Pull requests** read/write permissions. An existing release app can be used if it is installed on this repository and has these permissions. Webhooks and user authorization are unnecessary.

1. Set the repository Actions variable `RELEASE_APP_CLIENT_ID` to the app's Client ID.
2. Set the repository Actions secret `RELEASE_APP_PRIVATE_KEY` to its PEM private key. Enter it in GitHub settings; never commit it or paste it in chat.
3. If tag-creation rules restrict `v*`, allow this app to create version tags. Preserve any rules preventing tag updates and deletion.
4. Require **CI - gate** in the `main` branch ruleset and require pull requests before merging. Use squash merging with the PR title as the squash commit title. The gate checks the PR title, release configuration, production build, lint, type-checking, unit tests, Knip, and browser E2E tests. Failed, cancelled, or unexpectedly skipped checks fail the gate. PR-title validation reruns on title edits and checks only the title, not individual commits.

The app token allows release PRs and merges to trigger the normal CI workflow. No application environment variables are needed for release automation. The workflow actions use the same commit pins as the `skills` template.

CI needs the existing `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_GRAPHQL_SCHEMA_URL` Actions secrets to generate real GraphQL types and exercise the site. Both app jobs select Node 24 and Bun 1.3.10 and install from the frozen lockfile. The E2E job generates types before starting the development server; the build script generates them before the production build. Release configuration is validated against the upstream schema, and the manifest must match `version.txt`. These metadata checks run for every CI invocation and before release-please runs.

OpenSSF Scorecard runs separately on pushes to `main` and weekly. Its publication job has the required OIDC permission and no workflow-level environment variables, as required by Scorecard. It publishes a security posture report and retains the SARIF artifact; it is not a PR release gate or an enforced vulnerability threshold.

## Workflow

1. Merge changes into `main` using Conventional Commit messages. When squash merging, preserve the PR title as the squash commit title: `feat: ...` proposes a minor release, `fix: ...` proposes a patch, and `feat!: ...` marks a breaking change. Before 1.0, breaking changes bump the minor version. Maintenance commits such as `chore:` and `docs:` do not independently trigger a release.
2. **Release please** creates or updates a PR containing `CHANGELOG.md`, `version.txt`, and `.release-please-manifest.json`. Existing release-worthy history can be included in the first release.
3. Review that PR and merge it after the normal CI checks pass. Release PRs use the existing CI; no checks are bypassed.
4. The push to `main` runs release-please again and creates the version tag and GitHub release.

Use **Run workflow** on `main` to retry after correcting configuration or access failures. Do not manually bump version files or move published tags. Vercel continues deploying merges to `main`; GitHub releases do not deploy the site or publish an npm package.
