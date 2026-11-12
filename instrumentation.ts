export async function register() {
  // The log exporter uses Node.js APIs, so keep it out of the Edge bundle.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerPosthogLogs } = await import('./src/lib/posthog-logs');
    registerPosthogLogs();
  }
}
