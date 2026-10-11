#!/usr/bin/env bash
# Capture a page or a single element to a PNG.
#
# Usage: capture.sh <url> <output.png> [options]
#   --full                whole scrollable page instead of the viewport
#   --element <selector>  crop to one element, for component-level detail
#   --viewport <WxH>      default 1280x800
#   --device <name>       emulate a device, e.g. "iPhone 15 Pro" (overrides viewport)
#   --color-scheme <s>    light | dark
#   --wait <ms>           settle time before the shot (default 2500)
#   --timeout <ms>        cap on any single action (default 30000)
#   --storage-state <f>   a Playwright storage state file, for signed-in surfaces
#
# Drives Playwright directly rather than the `playwright screenshot` CLI, so an
# element shot comes from the same page and the same device scale as a full
# shot. Options reach the browser once; there is no second measuring pass.
set -euo pipefail

URL="${1:-}"
OUTPUT="${2:-}"
if [[ -z "$URL" || -z "$OUTPUT" ]]; then
  echo "usage: $(basename "$0") <url> <output.png> [--full] [--element <sel>] [--viewport WxH] [--device <name>] [--color-scheme <s>] [--wait <ms>] [--storage-state <file>]" >&2
  exit 64
fi
shift 2

WIDTH="1280"
HEIGHT="800"
WAIT_MS="2500"
# Playwright applies no timeout to a bare locator, so a selector that never
# matches would hang forever.
TIMEOUT_MS="30000"
FULL_PAGE=""
SELECTOR=""
DEVICE=""
COLOR_SCHEME=""
STORAGE_STATE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --element|--viewport|--device|--color-scheme|--wait|--timeout|--storage-state)
      [[ $# -ge 2 && -n "$2" ]] || { echo "missing value for $1" >&2; exit 64; }
      ;;
  esac
  case "$1" in
    --full)          FULL_PAGE="1"; shift ;;
    --element)       SELECTOR="$2"; shift 2 ;;
    --viewport)      WIDTH="${2%%x*}"; HEIGHT="${2##*x}"; shift 2 ;;
    --device)        DEVICE="$2"; shift 2 ;;
    --color-scheme)  COLOR_SCHEME="$2"; shift 2 ;;
    --wait)          WAIT_MS="$2"; shift 2 ;;
    --timeout)       TIMEOUT_MS="$2"; shift 2 ;;
    --storage-state) STORAGE_STATE="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 64 ;;
  esac
done

[[ "$WIDTH" =~ ^[1-9][0-9]*$ && "$HEIGHT" =~ ^[1-9][0-9]*$ && "$WAIT_MS" =~ ^[0-9]+$ && "$TIMEOUT_MS" =~ ^[1-9][0-9]*$ ]] || {
  echo "viewport and timeout must be positive integers; wait must be nonnegative" >&2; exit 64;
}

# Resolve caller-supplied paths while the caller's directory is still current;
# the cd below moves us into the workspace that can resolve `playwright`.
abspath() { case "$1" in /*) printf '%s' "$1" ;; *) printf '%s' "$PWD/$1" ;; esac; }

mkdir -p "$(dirname "$OUTPUT")"
OUTPUT="$(abspath "$OUTPUT")"
[[ -z "$STORAGE_STATE" ]] || STORAGE_STATE="$(abspath "$STORAGE_STATE")"

# Default to the caller's dependency workspace, including non-Git projects.
PLAYWRIGHT_DIR="${PLAYWRIGHT_DIR:-$PWD}"
cd "$PLAYWRIGHT_DIR"

# Passed through the environment so a URL or selector containing quotes needs no
# escaping on the way in.
CAP_URL="$URL" \
CAP_OUTPUT="$OUTPUT" \
CAP_SELECTOR="$SELECTOR" \
CAP_FULL_PAGE="$FULL_PAGE" \
CAP_DEVICE="$DEVICE" \
CAP_WIDTH="$WIDTH" \
CAP_HEIGHT="$HEIGHT" \
CAP_COLOR_SCHEME="$COLOR_SCHEME" \
CAP_STORAGE_STATE="$STORAGE_STATE" \
CAP_WAIT_MS="$WAIT_MS" \
CAP_TIMEOUT_MS="$TIMEOUT_MS" \
node -e '
  // Fall back only when the package is absent, not when loading it fails.
  let packagePath;
  try { packagePath = require.resolve("@playwright/test"); }
  catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    packagePath = require.resolve("playwright");
  }
  const { chromium, devices } = require(packagePath);
  const env = process.env;
  const timeout = Number(env.CAP_TIMEOUT_MS);

  (async () => {
    const options = {};
    if (env.CAP_DEVICE) {
      const preset = devices[env.CAP_DEVICE];
      if (!preset) throw new Error(`unknown device: ${env.CAP_DEVICE}`);
      Object.assign(options, preset);
    } else {
      options.viewport = { width: Number(env.CAP_WIDTH), height: Number(env.CAP_HEIGHT) };
    }
    if (env.CAP_COLOR_SCHEME) options.colorScheme = env.CAP_COLOR_SCHEME;
    if (env.CAP_STORAGE_STATE) options.storageState = env.CAP_STORAGE_STATE;

    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
    try {
      const page = await (await browser.newContext(options)).newPage();
      // Not networkidle: a surface holding a stream or websocket open never
      // reaches it, so goto would burn the whole timeout. --wait and the
      // element visibility check below cover settling.
      page.setDefaultTimeout(timeout);
      const response = await page.goto(env.CAP_URL, { waitUntil: "domcontentloaded", timeout });
      if (response && !response.ok()) throw new Error(`page returned HTTP ${response.status()}`);

      if (Number(env.CAP_WAIT_MS) > 0) await page.waitForTimeout(Number(env.CAP_WAIT_MS));

      if (env.CAP_SELECTOR) {
        const element = page.locator(env.CAP_SELECTOR).first();
        await element.waitFor({ state: "visible", timeout });
        // Playwright crops in the page it just rendered, so a device scale
        // factor above 1 needs no conversion here.
        await element.screenshot({ path: env.CAP_OUTPUT, timeout });
      } else {
        await page.screenshot({ path: env.CAP_OUTPUT, fullPage: Boolean(env.CAP_FULL_PAGE) });
      }
    } finally {
      await browser.close();
    }
  })().catch((error) => {
    // Never exit 0 on a failed capture: a stale or missing PNG silently becomes
    // the capture attached to the PR.
    console.error(error.message);
    process.exit(1);
  });
' >&2

echo "$OUTPUT"
