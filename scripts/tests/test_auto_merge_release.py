"""Exercise release PR eligibility with a fake gh CLI; never call GitHub."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "auto_merge_release.sh"
REPO = "owner/repo"
BOT = "release-app[bot]"
SHA = "a" * 40
MOCK_GH = r'''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
log = Path(os.environ["CALL_LOG"])
calls = [json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
with log.open("a") as f:
    f.write(json.dumps(args) + "\n")
pr = json.loads(os.environ["MOCK_PR"])
endpoint = next((a for a in args if a.startswith("repos/")), "") if args[0] == "api" else ""
if endpoint == "repos/owner/repo/pulls":
    print(json.dumps([[] if os.environ.get("MOCK_NO_PENDING") else [pr]]))
elif endpoint.endswith("/files"):
    print(json.dumps([json.loads(os.environ["MOCK_FILES"])]))
elif endpoint == "repos/owner/repo/pulls/7":
    if os.environ.get("MOCK_RACE") and any(c[:2] == args[:2] for c in calls):
        pr["head"]["sha"] = "b" * 40
    print(json.dumps(pr))
elif args[:2] == ["pr", "merge"]:
    if os.environ.get("MOCK_MERGE_FAIL"):
        sys.exit(1)
else:
    print("Unexpected gh operation", file=sys.stderr)
    sys.exit(2)
'''


class ReleaseAutomationTest(unittest.TestCase):
    def run_script(self, *, changes=None, files=None, output='[{"number":7}]',
                   race=False, merge_fail=False, no_pending=False):
        pr = {
            "number": 7, "state": "open", "draft": False,
            "user": {"login": BOT, "type": "Bot"},
            "base": {"ref": "main", "repo": {"full_name": REPO}},
            "head": {"sha": SHA, "ref": "release-please--branches--main",
                     "repo": {"full_name": REPO}},
            "labels": [{"name": "autorelease: pending"}],
            "title": "chore(main): release 0.1.0", "changed_files": 1,
        }
        for key, value in (changes or {}).items():
            pr[key] = value
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "gh").write_text(MOCK_GH)
            (root / "gh").chmod(0o755)
            log = root / "calls"
            env = {**os.environ, "PATH": str(root) + os.pathsep + os.environ["PATH"],
                   "GH_TOKEN": "fake-app-token", "GH_REPO": REPO,
                   "RELEASE_BOT_LOGIN": BOT, "RELEASE_PRS": output,
                   "MOCK_PR": json.dumps(pr),
                   "MOCK_FILES": json.dumps(files if files is not None else [
                       {"filename": "version.txt", "status": "modified"}]),
                   "CALL_LOG": str(log)}
            if no_pending:
                env["MOCK_NO_PENDING"] = "1"
            if race:
                env["MOCK_RACE"] = "1"
            if merge_fail:
                env["MOCK_MERGE_FAIL"] = "1"
            result = subprocess.run(["bash", str(SCRIPT)], env=env,
                                    capture_output=True, text=True)
            calls = [json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
            return result, calls

    def assert_rejected(self, **kwargs):
        result, calls = self.run_script(**kwargs)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertFalse(any(c[:2] == ["pr", "merge"] for c in calls))

    def test_only_enables_auto_merge_at_verified_head_without_exemptions(self):
        result, calls = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        merge = next(c for c in calls if c[:2] == ["pr", "merge"])
        self.assertIn("--auto", merge)
        self.assertIn("--squash", merge)
        self.assertEqual(merge[merge.index("--match-head-commit") + 1], SHA)
        self.assertEqual(merge[merge.index("--subject") + 1], "chore(main): release 0.1.0")
        self.assertFalse(any("/statuses/" in " ".join(c) for c in calls))
        self.assertFalse(any("--admin" in c or c[:2] == ["workflow", "run"] for c in calls))

    def test_existing_pending_release_is_retried_and_duplicates_are_deduplicated(self):
        for output in ['[]', '[{"number":7},{"number":7}]']:
            with self.subTest(output=output):
                result, calls = self.run_script(output=output)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(sum(c[:2] == ["pr", "merge"] for c in calls), 1)

    def test_no_release_is_a_no_op(self):
        result, calls = self.run_script(output="[]", no_pending=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 1)

    def test_rejects_human_and_other_bot(self):
        for user in [{"login": "human", "type": "User"},
                     {"login": "github-actions[bot]", "type": "Bot"}]:
            with self.subTest(user=user):
                self.assert_rejected(changes={"user": user})

    def test_rejects_draft_wrong_target_missing_label_and_unexpected_branch(self):
        for changes in [
            {"draft": True}, {"state": "closed"}, {"labels": []},
            {"base": {"ref": "other", "repo": {"full_name": REPO}}},
            {"head": {"sha": SHA, "ref": "release-please--branches--main-evil",
                      "repo": {"full_name": REPO}}},
            {"head": {"sha": SHA, "ref": "release-please--branches--main",
                      "repo": {"full_name": "attacker/fork"}}},
        ]:
            with self.subTest(changes=changes):
                self.assert_rejected(changes=changes)

    def test_rejects_code_workflows_renames_deletions_empty_and_truncated_diffs(self):
        for files in [[],
            [{"filename": "src/app.ts", "status": "modified"}],
            [{"filename": ".github/workflows/release-please.yml", "status": "modified"}],
            [{"filename": "version.txt", "status": "renamed", "previous_filename": "src/app.ts"}],
            [{"filename": "version.txt", "status": "removed"}],
        ]:
            with self.subTest(files=files):
                self.assert_rejected(files=files)
        self.assert_rejected(changes={"changed_files": 2})

    def test_changed_head_cannot_be_merged(self):
        self.assert_rejected(race=True)

    def test_invalid_output_is_rejected_before_any_github_operation(self):
        for output in ['{}', '[{"number":"7"}]', '[{"number":-1}]', '[{"number":1.5}]']:
            with self.subTest(output=output):
                result, calls = self.run_script(output=output)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(calls, [])

    def test_merge_failure_is_visible(self):
        result, _ = self.run_script(merge_fail=True)
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
