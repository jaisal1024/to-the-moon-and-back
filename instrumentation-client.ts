import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const missingConfigurationVariable = !projectToken
  ? 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
  : !host
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : null;

if (missingConfigurationVariable) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      new Error(
        `${missingConfigurationVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingConfigurationVariable} is configured`,
      ),
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  });
}
