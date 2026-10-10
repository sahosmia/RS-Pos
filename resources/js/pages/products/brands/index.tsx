import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { FormInput } from '@/components/form/form-input';
import { getBrandActions } from '@/components/products/brand-actions';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { pageContainer } from '@/lib/page-container';
import { type BreadcrumbItem } from '@/types';
import { type BrandListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

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

    const form = useForm({
        name: '',
        description: '',
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', description: '' });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (brand: BrandListItem) => {
        form.clearErrors();
        form.setData({
            name: brand.name,
            description: brand.description || '',
        });
        setEditing(brand);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isEditing = editing !== null;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Brand updated.' : 'Brand created.');
                setModalOpen(false);
            },
        };

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

        const name = deleting.name;

        router.delete(route('brands.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.brand ?? 'Could not delete brand.'),
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookup', 'brands_title')} />

            <div className={pageContainer.medium}>
                <PageHeader
                    title={t('lookup', 'brands_title')}
                    description={t('lookup', 'brands_description')}
                    actions={
                        <>
                            <Button onClick={openCreate}>{t('lookup', 'brands_add')}</Button>
                        </>
                    }
                />

                {brands.length === 0 ? (
                    <EmptyState title={t('lookup', 'brands_empty_title')} description={t('lookup', 'brands_empty_description')}>
                        <Button className="mt-2" onClick={openCreate}>
                            {t('lookup', 'brands_add')}
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-brand-card bg-card shadow-[var(--brand-card-shadow-elevated)]">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-table-header text-muted-foreground text-xs font-semibold">
                                <tr>
                                    <th className="px-4 py-2.5 text-left font-medium">{t('common', 'name')}</th>
                                    <th className="px-4 py-2.5 text-left font-medium">Description</th>
                                    <th className="px-4 py-2.5 text-right font-medium">{t('common', 'actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="border-brand-table-divider hover:bg-brand-table-row-hover motion-colors border-t">
                                        <td className="px-4 py-2 font-medium">{brand.name}</td>
                                        <td className="text-muted-foreground max-w-xs truncate px-4 py-2">{brand.description || '—'}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions actions={getBrandActions(brand, { onEdit: openEdit, onDelete: setDeleting })} />
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
                    placeholder="e.g. Samsung, Apple, Walton"
                    error={form.errors.name}
                    required
                />
                <div className="grid min-w-0 content-start gap-2">
                    <label htmlFor="description" className="text-sm leading-none font-medium">
                        Description
                    </label>
                    <textarea
                        id="description"
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                        placeholder="Optional brand description"
                    />
                </div>
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
