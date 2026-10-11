# Retrieve GitHub PR feedback

Confirm the intended remote repository and current branch's pull request before
collecting feedback. The examples use `gh`'s repository placeholders; for forks
or multiple remotes, select the repository explicitly with `--repo` on `gh pr`
and explicit owner/repository values on `gh api`. Do not assume GitHub is the
project's review host when supplied feedback points elsewhere.

```bash
PR=$(gh pr view --json number --jq .number)

gh api --paginate "repos/{owner}/{repo}/pulls/$PR/comments" \
  --jq '.[] | {id, author: .user.login, body, path, line: (.line // .original_line), diff_hunk}'

gh pr view "$PR" --json reviews \
  --jq '.reviews[] | select(.body != "") | {author: .author.login, body, state}'

gh api --paginate "repos/{owner}/{repo}/issues/$PR/comments" \
  --jq '.[] | {author: .user.login, body}'
```

The REST endpoints above do **not** report whether a thread was resolved, so
they will happily hand you feedback someone already closed out. Run this too,
and drop every inline comment whose thread comes back resolved before you
triage anything:

```bash
gh api graphql --paginate -f query='
  query($owner:String!, $repo:String!, $pr:Int!, $endCursor:String) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100, after:$endCursor) {
          pageInfo { hasNextPage endCursor }
          nodes { id isResolved isOutdated path line comments(first:50) { pageInfo { hasNextPage endCursor } nodes { id author { login } body } } }
        }
      }
    }
  }' -F owner=':owner' -F repo=':repo' -F pr="$PR" \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not)'
```

The outer pagination covers threads, not each thread's comments. When a
thread's `comments.pageInfo.hasNextPage` is true, use its node ID in a separate
GraphQL `node(id: ...) { ... on PullRequestReviewThread { comments(first:50,
after: ...) { pageInfo { hasNextPage endCursor } nodes { id author { login }
body } } } }` query, following that connection's cursor until complete. Keep
thread/comment IDs when recording decisions so replies and fixes remain
traceable. Compare unresolved feedback with the current code; outdated line
locations do not necessarily mean an issue is fixed.
