import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getExpenseCategoryActions } from '@/components/expenses/expense-category-actions';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type ExpenseCategoryListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ExpenseCategoriesIndexProps {
    categories: ExpenseCategoryListItem[];
    allCategories: { id: number; name: string; parent_id: number | null }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Expenses', href: '/expenses' },
    { title: 'Expense Categories', href: '/expense-categories' },
];

/** Own page for expense-category CRUD (with subcategory support) — same shape as products/categories/index.tsx. */
export default function ExpenseCategoriesIndex({ categories, allCategories }: ExpenseCategoriesIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ExpenseCategoryListItem | null>(null);
    const [deleting, setDeleting] = useState<ExpenseCategoryListItem | null>(null);

    const form = useForm({ name: '', parent_id: null as number | null });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', parent_id: null });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (category: ExpenseCategoryListItem) => {
        form.clearErrors();
        form.setData({ name: category.name, parent_id: category.parent_id });
        setEditing(category);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

        if (editing) {
            form.patch(route('expense-categories.update', editing.id), options);
        } else {
            form.post(route('expense-categories.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('expense-categories.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const parentOptions = allCategories.filter((category) => category.id !== editing?.id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expense Categories" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Expense Categories" description="Rent, Utility, Salary, Transport — subcategory-সহ" />
                    <Button onClick={openCreate}>Add Category</Button>
                </div>

                {categories.length === 0 ? (
                    <EmptyState title="No categories yet" description="প্রথম expense category যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Category
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-left font-medium">Parent</th>
                                    <th className="px-4 py-2 text-right font-medium">Expenses</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{category.name}</td>
                                        <td className="text-muted-foreground px-4 py-2">{category.parent?.name ?? '—'}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{category.expenses_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getExpenseCategoryActions(category, { onEdit: openEdit, onDelete: setDeleting })}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <FormModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title={editing ? 'Edit Category' : 'Add Category'}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label="Name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="e.g. Office Rent, Utilities, Refreshment"
                    error={form.errors.name}
                    required
                />

                <FormSelect
                    id="parent_id"
                    label="Parent Category"
                    value={form.data.parent_id}
                    onChange={(val) => form.setData('parent_id', val ? Number(val) : null)}
                    options={parentOptions.map((category) => ({ value: String(category.id), label: category.name }))}
                    placeholder="No parent"
                    error={form.errors.parent_id}
                    allowNone
                    noneLabel="No parent"
                />
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete category?"
                description={`"${deleting?.name}" will be deleted. Cannot be done if it has an expense or sub-category.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
