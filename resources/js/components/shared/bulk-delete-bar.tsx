import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { type useTableSelection } from '@/hooks/table/use-table-selection';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface BulkDeleteBarProps {
    /** `list.selection` of the page's `useListPage`. */
    selection: ReturnType<typeof useTableSelection<unknown>>;
    /** Ziggy route of the bulk endpoint, e.g. `'products.bulk-delete'`. */
    routeName: string;
    /** Plural noun for the texts, e.g. `'products'`. */
    noun: string;
    /** The `module.delete` permission — the bar is not offered without it. */
    permission: string;
}

/**
 * "Delete selected" for a list page. The server applies, record by record, the very same rule as the single
 * delete: what may not be deleted is kept and the reason is shown, so a mixed selection never removes more than
 * the one-by-one delete would have allowed.
 */
export default function BulkDeleteBar({ selection, routeName, noun, permission }: BulkDeleteBarProps) {
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    if (!auth.permissions.includes(permission)) {
        return null;
    }

    const count = selection.selectedIds.length;

    const confirm = () => {
        setProcessing(true);
        router.post(
            route(routeName),
            { ids: selection.selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`${count} ${noun} deleted.`),
                onError: (errors) => toast.error(errors.bulk_delete ?? Object.values(errors)[0] ?? `Could not delete the selected ${noun}.`),
                onFinish: () => {
                    setProcessing(false);
                    setOpen(false);
                    selection.clear();
                },
            },
        );
    };

    return (
        <>
            {count > 0 && (
                <>
                    <span
                        className="bg-brand-primary/10 text-brand-primary-text rounded-brand-control inline-flex h-9 items-center px-3 text-sm font-medium tabular-nums"
                        aria-live="polite"
                    >
                        {count} {noun} selected
                    </span>
                    <Button
                        type="button"
                        variant="soft-danger"
                        size="icon"
                        onClick={() => setOpen(true)}
                        title="Delete selected"
                        aria-label="Delete selected"
                    >
                        <Trash2 />
                    </Button>
                    <Button type="button" variant="secondary" onClick={selection.clear}>
                        <X />
                        Clear
                    </Button>
                </>
            )}

            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                processing={processing}
                title={`Delete ${count} ${noun}?`}
                description="Each one is checked first, exactly as when deleting one by one. Anything that has history or cannot be deleted is kept, and you will be told why."
                confirmLabel="Delete"
                onConfirm={confirm}
            />
        </>
    );
}
