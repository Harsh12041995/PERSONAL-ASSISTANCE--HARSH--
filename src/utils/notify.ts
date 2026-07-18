import { toast } from 'react-toastify';

// One place to turn a failed request into user-visible feedback. Prefers the
// backend's error message when present, else a caller-supplied fallback.
export function notifyError(err: unknown, fallback = 'Something went wrong. Please try again.') {
    const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } }; message?: string };
    const raw = e?.response?.data?.error;
    const msg = (typeof raw === 'string' ? raw : raw?.message)
        || e?.response?.data?.message
        || fallback;
    toast.error(msg);
    // Keep the real error in the console for debugging without exposing it to the user.
    console.error(err);
}
