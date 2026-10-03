import { router } from '@inertiajs/react';
import { toast } from 'sonner';

/**
 * Background preference/auth requests that should never announce themselves — the UI already
 * reflects the result (theme flips, language switches, you land on the dashboard...).
 */
const SILENT_PATHS = [
    '/appearance',
    '/locale',
    '/theme-color',
    '/login',
    '/logout',
    '/confirm-password',
    '/forgot-password',
    '/reset-password',
    '/email/verification-notification',
];

const isSilent = (url: URL) => SILENT_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));

const activeToastIds = () => new Set(toast.getToasts().map((item) => item.id));

/**
 * One safety net so no write action ever ends silently: every non-GET visit gets a success toast,
 * and every failure (validation, network, server error) gets an error toast.
 *
 * Pages that already show their own toast (`toast.success(...)` in `onSuccess`) keep full control —
 * if a toast appeared while the request ran, this stays out of the way instead of doubling up.
 */
export function registerInertiaToasts(): () => void {
    let before = activeToastIds();
    let silent = false;
    let method = 'get';

    // Gives the page's own onSuccess/onError callback time to toast first, then fills the gap if it didn't.
    const toastIfNoneShown = (show: () => void) => {
        window.setTimeout(() => {
            const pageToasted = [...activeToastIds()].some((id) => !before.has(id));

            if (!pageToasted) {
                show();
            }
        }, 60);
    };

    const offStart = router.on('start', (event) => {
        before = activeToastIds();
        silent = isSilent(event.detail.visit.url);
        method = event.detail.visit.method;
    });

    const offSuccess = router.on('success', () => {
        if (silent || method === 'get') {
            return;
        }

        const message = method === 'delete' ? 'Deleted successfully.' : 'Saved successfully.';

        toastIfNoneShown(() => toast.success(message));
    });

    const offError = router.on('error', (event) => {
        if (silent) {
            return;
        }

        const first = Object.values(event.detail.errors).find((value) => typeof value === 'string' && value !== '');

        toastIfNoneShown(() => toast.error(first ?? 'Please check the highlighted fields.'));
    });

    const offException = router.on('exception', () => {
        toastIfNoneShown(() => toast.error('Could not reach the server. Check your connection and try again.'));
    });

    const offInvalid = router.on('invalid', () => {
        toastIfNoneShown(() => toast.error('Something went wrong on the server. Please try again.'));
    });

    return () => {
        offStart();
        offSuccess();
        offError();
        offException();
        offInvalid();
    };
}
