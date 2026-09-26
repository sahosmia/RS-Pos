import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getBrandActions } from '@/components/products/brand-actions';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type BrandListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface BrandsIndexProps {
    brands: BrandListItem[];
}

export default function BrandsIndex({ brands }: BrandsIndexProps) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav', 'products'), href: '/products' },
        { title: t('lookup', 'brands_title'), href: '/brands' },
    ];
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<BrandListItem | null>(null);
    const [deleting, setDeleting] = useState<BrandListItem | null>(null);

    const form = useForm({ name: '' });

    const openCreate = () => {
        form.clearErrors();
        form.setData('name', '');
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (brand: BrandListItem) => {
        form.clearErrors();
        form.setData('name', brand.name);
        setEditing(brand);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

        if (editing) {
            form.patch(route('brands.update', editing.id), options);
        } else {
            form.post(route('brands.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('brands.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookup', 'brands_title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('lookup', 'brands_title')} description={t('lookup', 'brands_description')} />
                    <Button onClick={openCreate}>{t('lookup', 'brands_add')}</Button>
                </div>

                {brands.length === 0 ? (
                    <EmptyState title={t('lookup', 'brands_empty_title')} description={t('lookup', 'brands_empty_description')}>
                        <Button className="mt-2" onClick={openCreate}>
                            {t('lookup', 'brands_add')}
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">{t('common', 'name')}</th>
                                    <th className="px-4 py-2 text-right font-medium">{t('lookup', 'products_count')}</th>
                                    <th className="px-4 py-2 text-right font-medium">{t('common', 'actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{brand.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{brand.products_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getBrandActions(brand, { onEdit: openEdit, onDelete: setDeleting })}
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
                title={editing ? t('common', 'edit') : t('lookup', 'brands_add')}
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
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('lookup', 'brands_delete_title')}
                description={`"${deleting?.name}" ${t('lookup', 'brands_delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
