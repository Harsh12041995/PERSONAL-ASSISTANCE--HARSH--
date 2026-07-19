// src/utils/smartCapture.ts
// Natural-language understanding for the capture box. Given free text like
// "gym tomorrow 6am", "rent 15000 monthly on the 1st" or "call Sam friday",
// extract a date/time, recurrence and amount, then suggest which record to
// create (calendar event / task with due date / recurring finance).
import * as chrono from 'chrono-node';

export type SmartKind = 'event' | 'task' | 'finance';
export type Recurrence = 'daily' | 'weekly' | 'monthly' | null;

export interface SmartParse {
    kind: SmartKind | null;
    cleanText: string;        // input with the date phrase stripped
    date: Date | null;
    hasTime: boolean;
    recurrence: Recurrence;
    amount: number | null;
    financeType: 'income' | 'expense';
    financeCategory: string;
    // Human-readable summary for the suggestion banner.
    label: string;
}

const MONEY_WORDS = /\b(rent|salary|bill|bills|pay|paid|payment|subscription|emi|budget|expense|income|invoice|fee|fees|refund|deposit)\b/i;
const INCOME_WORDS = /\b(salary|income|refund|deposit|paid me|received)\b/i;

function detectRecurrence(text: string): Recurrence {
    if (/\b(every day|everyday|daily|each day)\b/i.test(text)) return 'daily';
    if (/\b(every week|weekly|each week)\b/i.test(text)) return 'weekly';
    if (/\b(every month|monthly|each month|every 1st|on the 1st)\b/i.test(text)) return 'monthly';
    return null;
}

function detectAmount(text: string): number | null {
    // ₹1,500 / rs 500 / inr 200 — currency-marked numbers first.
    const cur = text.match(/(?:₹|rs\.?|inr)\s?(\d[\d,]*(?:\.\d+)?)/i);
    if (cur) return parseFloat(cur[1].replace(/,/g, ''));
    // Otherwise a bare number only counts as money when a money word is present.
    if (MONEY_WORDS.test(text)) {
        const n = text.match(/\b(\d[\d,]{2,}(?:\.\d+)?)\b/); // 3+ digits to avoid times like "6"
        if (n) return parseFloat(n[1].replace(/,/g, ''));
    }
    return null;
}

function financeCategoryFor(text: string): string {
    if (/\b(rent|emi|bill|bills|electricity|subscription|invoice|fee|fees)\b/i.test(text)) return 'Bills';
    if (/\b(salary|income|refund|deposit)\b/i.test(text)) return 'Income';
    if (/\b(food|lunch|dinner|grocery|groceries|coffee)\b/i.test(text)) return 'Food';
    if (/\b(uber|ola|cab|fuel|petrol|transport|metro)\b/i.test(text)) return 'Transport';
    return 'Other';
}

const RECUR_PHRASE = /\b(every day|everyday|daily|each day|every week|weekly|each week|every month|monthly|each month|every 1st|on the 1st)\b/gi;
const MONEY_TOKENS = /(?:₹|rs\.?|inr)\s?\d[\d,]*(?:\.\d+)?/gi;

export function parseSmartCapture(input: string): SmartParse {
    const text = input.trim();
    const recurrence = detectRecurrence(text);
    const amount = detectAmount(text);

    const results = chrono.parse(text, new Date(), { forwardDate: true });
    const first = results[0] || null;
    const date = first ? first.start.date() : null;
    const hasTime = !!first && first.start.isCertain('hour');

    // Build cleanText: drop the matched date phrase + recurrence + money tokens.
    let cleanText = text;
    if (first) cleanText = (cleanText.slice(0, first.index) + cleanText.slice(first.index + first.text.length));
    cleanText = cleanText
        .replace(RECUR_PHRASE, '')
        .replace(MONEY_TOKENS, '')
        .replace(/\b(rs\.?|inr|₹)\b/gi, '');
    // Drop the bare amount digits too (e.g. "rent 15000" -> "rent").
    if (amount !== null) cleanText = cleanText.replace(/\b\d[\d,]*(?:\.\d+)?\b/g, '');
    cleanText = cleanText
        .replace(/\s{2,}/g, ' ')
        .replace(/\b(by|on|at|for|due)\s*$/i, '')   // trailing prepositions left by the date strip
        .replace(/^[\s,:–-]+|[\s,:–-]+$/g, '')
        .trim();
    if (!cleanText) cleanText = text;

    const financeType: 'income' | 'expense' = INCOME_WORDS.test(text) ? 'income' : 'expense';
    const financeCategory = financeCategoryFor(text);

    // Decide the suggested record type.
    let kind: SmartKind | null = null;
    if (amount !== null && (MONEY_WORDS.test(text) || recurrence)) kind = 'finance';
    else if (date && hasTime) kind = 'event';
    else if (date) kind = 'task';

    const label = buildLabel({ kind, date, hasTime, recurrence, amount, cleanText, financeType });

    return { kind, cleanText, date, hasTime, recurrence, amount, financeType, financeCategory, label };
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtTime(d: Date): string {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function buildLabel(p: Pick<SmartParse, 'kind' | 'date' | 'hasTime' | 'recurrence' | 'amount' | 'cleanText' | 'financeType'>): string {
    if (p.kind === 'finance') {
        const rec = p.recurrence ? ` · ${p.recurrence}` : '';
        return `💰 ${p.financeType === 'income' ? 'Income' : 'Expense'} ₹${p.amount?.toLocaleString('en-IN')}${rec}`;
    }
    if (p.kind === 'event' && p.date) return `📅 Event · ${fmtDate(p.date)} at ${fmtTime(p.date)}`;
    if (p.kind === 'task' && p.date) return `✅ Task · due ${fmtDate(p.date)}`;
    return '';
}

// Local YYYY-MM-DD (TZ-safe) and local datetime for timed events.
export function toLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function toLocalDateTime(d: Date): string {
    return `${toLocalDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
}
