// Utilities for consistent IST (+05:30) timezone handling

export const IST_TZ = '+05:30';
const IST_OFFSET_MIN = 5 * 60 + 30; // 330 minutes
const DAY_MS = 24 * 60 * 60 * 1000;

// Return YYYY-MM-DD string for the given Date as per IST day
export function toIstDayString(d: Date): string {
  const t = d.getTime() + IST_OFFSET_MIN * 60000; // shift to IST
  const ist = new Date(t);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Given any Date, return the UTC Date that represents 00:00:00.000 IST for that calendar day
export function istStartOfDayUTCForDate(d: Date): Date {
  const t = d.getTime() + IST_OFFSET_MIN * 60000; // shift to IST
  const ist = new Date(t);
  ist.setUTCHours(0, 0, 0, 0); // set to IST midnight
  return new Date(ist.getTime() - IST_OFFSET_MIN * 60000); // shift back to UTC
}

// Parse YYYY-MM-DD string and return UTC Date of IST midnight for that day
export function istStartOfDayUTCFromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return istStartOfDayUTCForDate(new Date());
  // Build UTC midnight for that calendar day then subtract IST offset to get IST midnight in UTC
  const utcMid = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  return new Date(utcMid - IST_OFFSET_MIN * 60000);
}

export function istEndOfDayUTCFromYMD(ymd: string): Date {
  const start = istStartOfDayUTCFromYMD(ymd);
  return new Date(start.getTime() + DAY_MS - 1);
}

export function addIstDaysUTC(startIstUTC: Date, nDays: number): Date {
  return new Date(startIstUTC.getTime() + nDays * DAY_MS);
}

export function istRangeForDateUTC(d: Date): { start: Date; end: Date } {
  const start = istStartOfDayUTCForDate(d);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { start, end };
}

// Return JS day-of-week (0=Sunday..6=Saturday) for the IST calendar day specified by YYYY-MM-DD
export function istDayOfWeekFromYMD(ymd: string): number {
  // Use midday to avoid DST/offset edge cases, then read UTC weekday which matches local weekday of IST noon
  const dt = new Date(`${ymd}T12:00:00.000+05:30`);
  return dt.getUTCDay();
}
