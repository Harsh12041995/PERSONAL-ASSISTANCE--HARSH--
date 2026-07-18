// Single source of truth for capture types. Every capture entry point
// (CapturePage, Home quick-bar, QuickNotesPen, Sage Studio, VoiceTranscriber)
// imports from here so the list can never drift again.
import type { ICapture } from '../services/personalApi';

export type CaptureType = ICapture['type'];

export interface CaptureTypeMeta {
    type: CaptureType;
    emoji: string;
    label: string;
    /** chip/badge classes (light + dark) */
    color: string;
    /** selected/solid classes for the full CapturePage form */
    bg: string;
}

export const CAPTURE_TYPES: CaptureTypeMeta[] = [
    { type: 'Idea', emoji: '💡', label: 'Idea', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', bg: 'bg-amber-50 border-amber-200 text-amber-700' },
    { type: 'Task', emoji: '✅', label: 'Task', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { type: 'Article', emoji: '📰', label: 'Article', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
    { type: 'Follow-up', emoji: '📞', label: 'Follow-up', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', bg: 'bg-sky-50 border-sky-200 text-sky-700' },
    { type: 'Money', emoji: '💰', label: 'Money', color: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300', bg: 'bg-green-50 border-green-200 text-green-700' },
    { type: 'Urgent', emoji: '🔴', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300', bg: 'bg-red-50 border-red-200 text-red-700' },
    { type: 'Journal', emoji: '📓', label: 'Journal', color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', bg: 'bg-violet-50 border-violet-200 text-violet-700' },
];

export const captureMeta = (type: CaptureType): CaptureTypeMeta =>
    CAPTURE_TYPES.find(c => c.type === type) ?? CAPTURE_TYPES[0];
