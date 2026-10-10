import { type ReactNode } from 'react';
import { toast, type ExternalToast } from 'sonner';

/**
 * Thin, business-agnostic wrapper over Sonner with ERP defaults: errors stay longer than confirmations,
 * and loading toasts can be turned into a result by reusing their id. Plain `toast.*` calls elsewhere keep
 * working (same Toaster, same look) — this just adds sensible durations and a few patterns.
 *
 *   const id = notify.loading('Generating invoice...');
 *   // ...later
 *   notify.success('Invoice generated', { id });      // replaces the loading toast in place
 *   notify.error('Unable to generate invoice', { id, description: reason });
 */
type Options = Omit<ExternalToast, 'duration'> & {
    /** Milliseconds. Use `notify.persistent` for "stay until dismissed". */
    duration?: number;
};

const DURATION = {
    success: 4000,
    info: 5000,
    warning: 7000,
    error: 8000,
} as const;

export const notify = {
    success: (title: ReactNode, options?: Options) => toast.success(title, { duration: DURATION.success, ...options }),
    info: (title: ReactNode, options?: Options) => toast.info(title, { duration: DURATION.info, ...options }),
    warning: (title: ReactNode, options?: Options) => toast.warning(title, { duration: DURATION.warning, ...options }),
    error: (title: ReactNode, options?: Options) => toast.error(title, { duration: DURATION.error, ...options }),
    neutral: (title: ReactNode, options?: Options) => toast(title, { duration: DURATION.info, ...options }),

    /** Stays until the user dismisses it or you call `notify.dismiss(id)` — for things that need acting on. */
    persistent: (title: ReactNode, options?: Omit<Options, 'duration' | 'dismissible'>) => toast.warning(title, { ...options, duration: Infinity }),

    /** Spinner toast that doesn't time out; replace it with `notify.success/error(..., { id })`. */
    loading: (title: ReactNode, options?: Omit<Options, 'duration'>) => toast.loading(title, options),

    /** Loading → success/error from a promise, in one toast. */
    promise: toast.promise,

    dismiss: toast.dismiss,
};
