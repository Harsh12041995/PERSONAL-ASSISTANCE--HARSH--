// Local-date helpers. Using `new Date().toISOString().slice(0,10)` yields the
// UTC calendar date, which is wrong for users behind/ahead of UTC (e.g. an IST
// user before 05:30 gets "yesterday"). These use the local calendar day.

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function localToday(): string {
    return localDate(new Date());
}

/** A given Date as YYYY-MM-DD in local time. */
export function localDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
