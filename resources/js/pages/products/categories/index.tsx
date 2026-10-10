import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import { getCategoryActions } from '@/components/products/category-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type CategoryListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface CategoriesIndexProps {
    categories: CategoryListItem[];
    allCategories: { id: number; name: string; parent_id: number | null }[];
}

export default function CategoriesIndex({ categories, allCategories }: CategoriesIndexProps) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav', 'products'), href: '/products' },
        { title: t('lookup', 'categories_title'), href: '/categories' },
    ];
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryListItem | null>(null);
    const [deleting, setDeleting] = useState<CategoryListItem | null>(null);

    const form = useForm({
        name: '',
        parent_id: null as number | null,
        description: '',
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', parent_id: null, description: '' });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (category: CategoryListItem) => {
        form.clearErrors();
        form.setData({
            name: category.name,
            parent_id: category.parent_id,
            description: category.description || '',
        });
        setEditing(category);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isEditing = editing !== null;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Category updated.' : 'Category created.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('categories.update', editing.id), options);
        } else {
            form.post(route('categories.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.name;

        router.delete(route('categories.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.category ?? 'Could not delete category.'),
            onFinish: () => setDeleting(null),
        });
    };

    const parentOptions = allCategories.filter((category) => category.id !== editing?.id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookup', 'categories_title')} />

            <div className={pageContainer.medium}>
                <PageHeader
                    title={t('lookup', 'categories_title')}
                    description={t('lookup', 'categories_description')}
                    actions={
                        <>
                            <Button onClick={openCreate}>{t('lookup', 'categories_add')}</Button>
                        </>
                    }
                />

                {categories.length === 0 ? (
                    <EmptyState title={t('lookup', 'categories_empty_title')} description={t('lookup', 'categories_empty_description')}>
                        <Button className="mt-2" onClick={openCreate}>
                            {t('lookup', 'categories_add')}
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">{t('common', 'name')}</th>
                                    <th className="px-4 py-2.5 text-left font-medium">{t('lookup', 'categories_parent')}</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                                    <th className="px-4 py-2.5 text-right font-medium">{t('common', 'actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                        <td className="px-4 py-2 font-medium">{category.name}</td>
                                        <td className="text-muted-foreground px-4 py-2">{category.parent?.name ?? '—'}</td>
                                        <td className="text-muted-foreground max-w-xs truncate px-4 py-2">{category.description || '—'}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getCategoryActions(category, { onEdit: openEdit, onDelete: setDeleting })}
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
                title={editing ? t('common', 'edit') : t('lookup', 'categories_add')}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label={t('common', 'name')}
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                    required
                />

                <FormSelect
                    id="parent_id"
                    label={t('lookup', 'categories_parent')}
                    value={form.data.parent_id}
                    onChange={(val) => form.setData('parent_id', val ? Number(val) : null)}
                    options={parentOptions.map((category) => ({ value: String(category.id), label: category.name }))}
                    placeholder={t('lookup', 'categories_no_parent')}
                    error={form.errors.parent_id}
                    allowNone
                    noneLabel={t('lookup', 'categories_no_parent')}
                />
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('lookup', 'categories_delete_title')}
                description={`"${deleting?.name}" ${t('lookup', 'categories_delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
