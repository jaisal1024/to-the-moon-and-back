// "April 25, 2025" for display and "2025-04-25" for <time dateTime>, both in UTC so the day never shifts.
export function formatPostDate(publishedAt: string | null | undefined): { date?: string; dateTime?: string } {
  if (!publishedAt) return {};
  const d = new Date(publishedAt);
  if (Number.isNaN(d.getTime())) return {};
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
      d,
    ),
    dateTime: d.toISOString().slice(0, 10),
  };
}
