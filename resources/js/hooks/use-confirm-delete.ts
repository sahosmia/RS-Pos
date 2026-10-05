import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Options<T> {
    /** Ziggy route of the destroy endpoint, e.g. `'sales.destroy'`. */
    routeName: string;
    /** Which validation-error key carries the server's reason when the delete is refused (e.g. `'sale'`); falls back to the first error. */
    errorKey: string;
    /** Toast when the server gave no reason. */
    fallbackError: string;
    /** What the row is called in the success toast — defaults to its `name`. */
    label?: (row: T) => string;
    /** Full success toast, when "<name> deleted." isn't the wording you want. */
    successMessage?: (row: T) => string;
}

/**
 * The "ask first, then delete" flow every list page repeats: hold the row being deleted (drives the confirm
 * dialog), and on confirm send the DELETE and toast the outcome — the server's reason when it refuses.
 */
export function useConfirmDelete<T extends { id: number }>({ routeName, errorKey, fallbackError, label, successMessage }: Options<T>) {
    const [target, setTarget] = useState<T | null>(null);

    const confirm = () => {
        if (!target) return;

        const message = successMessage
            ? successMessage(target)
            : `"${label ? label(target) : String((target as unknown as { name?: string }).name ?? `#${target.id}`)}" deleted.`;

        router.delete(route(routeName, target.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(message),
            onError: (errors) => toast.error(errors[errorKey] ?? Object.values(errors)[0] ?? fallbackError),
            onFinish: () => setTarget(null),
        });
    };

    return { target, setTarget, confirm };
}
