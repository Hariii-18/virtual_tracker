export function formatDuration(hours: number | null | undefined): string {
  if (!hours || hours <= 0) return "0m";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function parseHoursMinutes(h: string, m: string): number {
  const hours = parseFloat(h) || 0;
  const minutes = parseFloat(m) || 0;
  return hours + minutes / 60;
}
