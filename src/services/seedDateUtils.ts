/**
 * Today-relative ISO date helpers for demo seed data.
 * All cert/cal/job dates should flow through these so the mix stays correct
 * whenever the app opens (not only on a fixed presentation day).
 */

/** Local calendar date as YYYY-MM-DD (start-of-today semantics for comparisons). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add (or subtract) whole calendar days to an ISO date string. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

/** Convenience: today + offset days. */
export function daysFromToday(days: number, now: Date = new Date()): string {
  return addDays(todayISO(now), days);
}

/** ISO timestamp at a fixed local time on an ISO date. */
export function isoDateTime(isoDate: string, hours = 9, minutes = 0): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return dt.toISOString();
}

/** Monday (local) of the week containing `isoDate`. */
export function startOfWeekMonday(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return todayISO(dt);
}

/** Shared seed offsets — cert/cal bands and job window. */
export const SEED_OFFSETS = {
  /** Long-valid cert/cal (≥ +90d looks Operational / Valid). */
  VALID: 180,
  VALID_LONG: 365,
  VALID_NEAR: 90,
  /** Due-soon window (within +30d of today). */
  DUE_SOON_14: 14,
  DUE_SOON_21: 21,
  DUE_SOON_28: 28,
  /** Expired relative to today. */
  EXPIRED_30: -30,
  EXPIRED_60: -60,
  EXPIRED_90: -90,
  EXPIRED_180: -180,
  /** Job history / future window. */
  HISTORY_START: -90,
  FUTURE_END: 14,
  /** makeEquip / UI “due soon” threshold (today + 30 days). */
  DUE_SOON_THRESHOLD: 30,
} as const;

export function dueSoonCutoff(now: Date = new Date()): string {
  return daysFromToday(SEED_OFFSETS.DUE_SOON_THRESHOLD, now);
}
