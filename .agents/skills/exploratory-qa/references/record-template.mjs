import { createRequire } from "node:module";
import { resolve } from "node:path";

// Resolve the project's dependency even when this copy is in a temp directory.
const require = createRequire(
  resolve(process.env.PLAYWRIGHT_DIR || process.cwd(), "package.json"),
);
let packagePath;
try { packagePath = require.resolve("@playwright/test"); }
catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  packagePath = require.resolve("playwright");
}
const { chromium } = require(packagePath);

const URL = process.env.RECORD_URL;
const OUT_DIR = process.env.RECORD_OUT;
if (!URL || !OUT_DIR) throw new Error("Set RECORD_URL and RECORD_OUT to the verified app URL and private output directory.");
const VIEWPORT = { width: 1280, height: 800 };

// Load a signed-in session by pointing at a Playwright storage state file, e.g.
// one saved after verifying identity through the project's real sign-in UI.
const STORAGE_STATE = process.env.RECORD_STORAGE_STATE;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: OUT_DIR, size: VIEWPORT },
  ...(STORAGE_STATE ? { storageState: STORAGE_STATE } : {}),
});
const page = await context.newPage();
page.setDefaultTimeout(30000);

/** Hold on a state long enough for a reviewer to read it. */
const beat = (ms = 1200) => page.waitForTimeout(ms);

async function recordFlow() {
  throw new Error(
    "Replace this guard with the flow steps and visible-state assertions before recording.",
  );
}

try {
  // Not networkidle: a surface holding a stream or websocket open never reaches
  // it, so goto would hang until the timeout. The beat below covers settling.
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await beat();

  await recordFlow();
} finally {
  await context.close(); // flushes the video file
  await browser.close();
}

const video = page.video();
console.log(video ? await video.path() : "no video recorded");
