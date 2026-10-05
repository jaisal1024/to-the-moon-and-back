/** "April 25, 2025". Formatted in UTC so build machines in any time zone agree. */
export function formatPublishDate(publishedAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(publishedAt));
}
