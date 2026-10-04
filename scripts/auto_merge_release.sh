#!/usr/bin/env bash
set -euo pipefail

# GH_TOKEN must be the release App token so the eventual merge triggers main CI
# and release publication. Never write status exemptions or bypass merge rules.
: "${GH_TOKEN:?release App token is required}"
: "${GH_REPO:?repository is required}"
: "${RELEASE_BOT_LOGIN:?dedicated release App bot login is required}"
: "${RELEASE_PRS:?release-please PR output is required}"

jq -e 'type == "array" and all(.[];
  (.number | type) == "number" and .number > 0 and .number == (.number | floor))' \
  <<< "$RELEASE_PRS" > /dev/null

pending=$(gh api "repos/$GH_REPO/pulls" --method GET -f state=open -f base=main \
  --paginate --slurp | jq --arg repo "$GH_REPO" --arg bot "$RELEASE_BOT_LOGIN" '[flatten[] |
    select(.user.login == $bot and .user.type == "Bot" and
      .base.ref == "main" and .base.repo.full_name == $repo and
      .head.repo.full_name == $repo and
      .head.ref == "release-please--branches--main" and
      any(.labels[]; .name == "autorelease: pending")) | {number}]')
numbers=$(jq -r --argjson pending "$pending" '. + $pending | unique_by(.number) | .[].number' \
  <<< "$RELEASE_PRS")

verify_pr() {
  jq -e --arg repo "$GH_REPO" --arg bot "$RELEASE_BOT_LOGIN" '
    .state == "open" and .draft == false and
    .user.login == $bot and .user.type == "Bot" and
    .base.ref == "main" and .base.repo.full_name == $repo and
    .head.repo.full_name == $repo and
    .head.ref == "release-please--branches--main" and
    any(.labels[]; .name == "autorelease: pending") and
    (.head.sha | test("^[0-9a-f]{40}$"))
  ' > /dev/null
}

while IFS= read -r number; do
  [[ -n "$number" ]] || continue
  pr=$(gh api "repos/$GH_REPO/pulls/$number")
  verify_pr <<< "$pr"
  sha=$(jq -r '.head.sha' <<< "$pr")
  title=$(jq -r '.title' <<< "$pr")
  count=$(jq -r '.changed_files' <<< "$pr")

  # Only generated version metadata is eligible, never application code,
  # workflows, renamed files, or a truncated diff response.
  gh api --paginate --slurp "repos/$GH_REPO/pulls/$number/files" |
    jq -e --argjson count "$count" 'flatten |
      length > 0 and length == $count and all(.[];
        (.filename == "CHANGELOG.md" or .filename == "version.txt" or
         .filename == ".release-please-manifest.json") and
        (.status == "added" or .status == "modified") and
        (has("previous_filename") | not))' > /dev/null

  # Recheck the author, target and head after inspecting the diff. GitHub also
  # checks this SHA when enabling auto-merge, closing the remaining race window.
  current=$(gh api "repos/$GH_REPO/pulls/$number")
  verify_pr <<< "$current"
  jq -e --arg sha "$sha" '.head.sha == $sha' <<< "$current" > /dev/null

  gh pr merge "$number" --repo "$GH_REPO" --auto --squash \
    --match-head-commit "$sha" --subject "$title"
  echo "Enabled squash auto-merge for verified release PR #$number; required checks still apply."
done <<< "$numbers"
