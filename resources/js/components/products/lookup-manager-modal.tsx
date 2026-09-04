import ConfirmDialog from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Category } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface LookupItem {
    id: number;
    name: string;
    parent_id?: number | null;
}

interface LookupManagerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    items: LookupItem[];
    storeRouteName: string;
    updateRouteName: string;
    destroyRouteName: string;
    /** Category only — lets each entry optionally belong to a parent category. */
    parentOptions?: Category[];
}

/**
 * Full list+add+edit+delete for a small lookup table (Category/Unit/Brand) —
 * no dedicated page needed. Reused as both the "manage all" entry point and
 * the quick-add "+" next to a product form dropdown.
 */
export default function LookupManagerModal({
    open,
    onOpenChange,
    title,
    description,
    items,
    storeRouteName,
    updateRouteName,
    destroyRouteName,
    parentOptions,
}: LookupManagerModalProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<LookupItem | null>(null);

    const createForm = useForm({ name: '', parent_id: null as number | null });
    const editForm = useForm({ name: '', parent_id: null as number | null });

    const submitCreate: FormEventHandler = (e) => {
        e.preventDefault();

        createForm.post(route(storeRouteName), {
            preserveScroll: true,
            onSuccess: () => createForm.reset(),
        });
    };

    const startEdit = (item: LookupItem) => {
        editForm.clearErrors();
        editForm.setData({ name: item.name, parent_id: item.parent_id ?? null });
        setEditingId(item.id);
    };

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();

        if (editingId === null) {
            return;
        }

        editForm.patch(route(updateRouteName, editingId), {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route(destroyRouteName, deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>

                    <form onSubmit={submitCreate} className="flex items-start gap-2">
                        <div className="flex-1 space-y-1">
                            <Input
                                placeholder="নতুন নাম লিখুন"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                required
                            />
                            {createForm.errors.name && <p className="text-sm text-red-600 dark:text-red-400">{createForm.errors.name}</p>}
                        </div>

                        {parentOptions && (
                            <Select
                                value={createForm.data.parent_id ? String(createForm.data.parent_id) : 'none'}
                                onValueChange={(value) => createForm.setData('parent_id', value === 'none' ? null : Number(value))}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Parent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No parent</SelectItem>
                                    {parentOptions.map((option) => (
                                        <SelectItem key={option.id} value={String(option.id)}>
                                            {option.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Button type="submit" disabled={createForm.processing}>
                            {createForm.processing ? 'Adding...' : 'Add'}
                        </Button>
                    </form>

                    <div className="max-h-72 space-y-1 overflow-y-auto">
                        {items.length === 0 && <p className="text-muted-foreground py-4 text-center text-sm">এখনো কিছু যোগ করা হয়নি</p>}

                        {items.map((item) =>
                            editingId === item.id ? (
                                <form key={item.id} onSubmit={submitEdit} className="flex items-center gap-2 rounded-md border p-2">
                                    <Input
                                        autoFocus
                                        className="flex-1"
                                        value={editForm.data.name}
                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                        required
                                    />
                                    {parentOptions && (
                                        <Select
                                            value={editForm.data.parent_id ? String(editForm.data.parent_id) : 'none'}
                                            onValueChange={(value) => editForm.setData('parent_id', value === 'none' ? null : Number(value))}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Parent" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No parent</SelectItem>
                                                {parentOptions
                                                    .filter((option) => option.id !== item.id)
                                                    .map((option) => (
                                                        <SelectItem key={option.id} value={String(option.id)}>
                                                            {option.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button type="submit" size="sm" disabled={editForm.processing}>
                                        {editForm.processing ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                                        <X className="size-4" />
                                    </Button>
                                </form>
                            ) : (
                                <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                    <span className="text-sm">{item.name}</span>
                                    <div className="flex gap-1">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(item)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setDeleting(item)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Delete "${deleting?.name}"?`}
                description="কোনো product-এ ব্যবহৃত হলে এটা মোছা যাবে না।"
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </>
    );
}
