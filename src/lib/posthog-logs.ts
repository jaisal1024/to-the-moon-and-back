import { SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const missingConfigurationVariable = !projectToken
  ? 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
  : !host
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : null;

const loggerProvider =
  projectToken && host
    ? new LoggerProvider({
        resource: resourceFromAttributes({ 'service.name': 'to-the-moon-and-back' }),
        processors: [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host.replace(/\/$/, '')}/i/v1/logs`,
              headers: {
                'Authorization': `Bearer ${projectToken}`,
                'Content-Type': 'application/json',
              },
            }),
          }),
        ],
      })
    : null;

const posthogLogger = loggerProvider?.getLogger('posthog-nextjs') ?? null;

// Called once from instrumentation.ts on the Node.js runtime, so buffered logs flush on shutdown.
export function registerPosthogLogs() {
  if (!loggerProvider) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `${missingConfigurationVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingConfigurationVariable} is configured`,
      );
    }
    return;
  }

  const shutdownLoggerProvider = () => {
    void loggerProvider.shutdown().catch(() => {});
  };

  process.once('SIGTERM', shutdownLoggerProvider);
  process.once('SIGINT', shutdownLoggerProvider);
}

export function logHomePageCollectionsLoaded(collectionCount: number) {
  posthogLogger?.emit({
    body: 'Homepage CMS collections loaded',
    severityNumber: SeverityNumber.INFO,
    attributes: { collection_count: collectionCount },
  });
}

export function logHomePageCollectionsLoadFailed() {
  posthogLogger?.emit({
    body: 'Homepage CMS collections failed to load',
    severityNumber: SeverityNumber.ERROR,
  });
}
