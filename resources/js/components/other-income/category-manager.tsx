import { FormInput } from '@/components/form/form-input';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import { Button } from '@/components/ui/button';
import { type OtherIncomeCategoryRow } from '@/types/models';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface CategoryManagerProps {
    categories: OtherIncomeCategoryRow[];
}

/** Add / rename / delete the Other Income categories — the "Categories" tab of the Other Income page. */
export default function OtherIncomeCategoryManager({ categories }: CategoryManagerProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<OtherIncomeCategoryRow | null>(null);
    const [deleting, setDeleting] = useState<OtherIncomeCategoryRow | null>(null);

    const form = useForm({ name: '' });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '' });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (category: OtherIncomeCategoryRow) => {
        form.clearErrors();
        form.setData({ name: category.name });
        setEditing(category);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Category updated.' : 'Category added.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('other-income-categories.update', editing.id), options);
        } else {
            form.post(route('other-income-categories.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('other-income-categories.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Category deleted.');
                setDeleting(null);
            },
            onError: (errors) => {
                toast.error(errors.category ?? 'Could not delete this category.');
                setDeleting(null);
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">Other Income-এ যে category গুলো বেছে নেওয়া যায় — এখান থেকে যোগ, নাম বদল বা মুছে ফেলা যায়।</p>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    Add Category
                </Button>
            </div>

            {categories.length === 0 ? (
                <EmptyState title="No categories yet" description="আয় যোগ করতে আগে একটা category লাগবে">
                    <Button className="mt-2" onClick={openCreate}>
                        Add Category
                    </Button>
                </EmptyState>
            ) : (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 text-right font-medium">Entries</th>
                                <th className="w-24 px-4 py-2" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.map((category) => (
                                <tr key={category.id}>
                                    <td className="px-4 py-2 font-medium">{category.name}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{category.incomes_count}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(category)} aria-label={`Edit ${category.name}`}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive size-8"
                                                disabled={!category.can_delete}
                                                title={category.can_delete ? undefined : 'এই category-তে আয় আছে, তাই মোছা যাবে না'}
                                                onClick={() => setDeleting(category)}
                                                aria-label={`Delete ${category.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Category' : 'Add Category'}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="income_category_name"
                    label="Name"
                    placeholder="e.g. Scrap / Carton Sale, Interest"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                    required
                />
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete category?"
                description={`"${deleting?.name}" মুছে ফেলা হবে।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </div>
    );
}
