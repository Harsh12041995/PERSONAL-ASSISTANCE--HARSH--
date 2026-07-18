// Shared types for the Sage assistant persona + studio.

// The moods the rest of the app is allowed to request. Sage layers its own
// internal states (asleep, dragging, walking, hello-wave) on top of these —
// callers only ever need to know about these five.
export type SageMood = 'idle' | 'listening' | 'happy' | 'thinking' | 'concerned';

// A tiny per-page badge + tooltip Sage wears depending on where you are in the portal.
export interface PageAccessory {
    emoji: string;
    label: string;
}

// What the Studio should jump straight into when opened — set by the radial
// quick-action ring (right-click / long-press Sage) instead of a plain click.
export type SageIntent = 'default' | 'talk-record' | 'note' | 'camera';
