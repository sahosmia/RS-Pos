import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getUnitActions } from '@/components/products/unit-actions';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type UnitListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface UnitsIndexProps {
    units: UnitListItem[];
}

export default function UnitsIndex({ units }: UnitsIndexProps) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('nav', 'products'), href: '/products' },
        { title: t('lookup', 'units_title'), href: '/units' },
    ];
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<UnitListItem | null>(null);
    const [deleting, setDeleting] = useState<UnitListItem | null>(null);

    const form = useForm({
        name: '',
        short_name: '',
        description: '',
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', short_name: '', description: '' });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (unit: UnitListItem) => {
        form.clearErrors();
        form.setData({
            name: unit.name,
            short_name: unit.short_name || '',
            description: unit.description || '',
        });
        setEditing(unit);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const isEditing = editing !== null;
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Unit updated.' : 'Unit created.');
                setModalOpen(false);
            },
        };

        if (editing) {
            form.patch(route('units.update', editing.id), options);
        } else {
            form.post(route('units.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        const name = deleting.name;

        router.delete(route('units.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${name}" deleted.`),
            onError: (errors) => toast.error(errors.unit ?? 'Could not delete unit.'),
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookup', 'units_title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('lookup', 'units_title')} description={t('lookup', 'units_description')} />
                    <Button onClick={openCreate}>{t('lookup', 'units_add')}</Button>
                </div>

                {units.length === 0 ? (
                    <EmptyState title={t('lookup', 'units_empty_title')} description={t('lookup', 'units_empty_description')}>
                        <Button className="mt-2" onClick={openCreate}>
                            {t('lookup', 'units_add')}
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">{t('common', 'name')}</th>
                                    <th className="px-4 py-2 text-left font-medium">Short Unit</th>
                                    <th className="px-4 py-2 text-left font-medium">Description</th>
                                    <th className="px-4 py-2 text-right font-medium">{t('common', 'actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                    <tr key={unit.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{unit.name}</td>
                                        <td className="px-4 py-2 font-medium text-muted-foreground">{unit.short_name || '—'}</td>
                                        <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{unit.description || '—'}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getUnitActions(unit, { onEdit: openEdit, onDelete: setDeleting })}
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
                title={editing ? t('common', 'edit') : t('lookup', 'units_add')}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label={t('common', 'name')}
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="e.g. Piece, Kilogram, Box"
                    error={form.errors.name}
                    required
                />
                <FormInput
                    id="short_name"
                    label="Short Name / Unit Symbol"
                    value={form.data.short_name}
                    onChange={(e) => form.setData('short_name', e.target.value)}
                    placeholder="e.g. pcs, kg, box"
                    error={form.errors.short_name}
                />
                <div className="grid min-w-0 content-start gap-2">
                    <label htmlFor="description" className="text-sm font-medium leading-none">Description</label>
                    <textarea
                        id="description"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.data.description}
                        onChange={(e) => form.setData('description', e.target.value)}
                        placeholder="Optional description"
                    />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('lookup', 'units_delete_title')}
                description={`"${deleting?.name}" ${t('lookup', 'units_delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
