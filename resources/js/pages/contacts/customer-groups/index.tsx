import { FormInput } from '@/components/form/form-input';
import HeadingSmall from '@/components/heading-small';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getCustomerGroupActions } from '@/components/contacts/customer-group-actions';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CustomerGroupListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { toast } from 'sonner';

interface CustomerGroupsIndexProps {
    customerGroups: CustomerGroupListItem[];
}

export default function CustomerGroupsIndex({ customerGroups }: CustomerGroupsIndexProps) {
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('contactsPage', 'title'), href: '/contacts' },
        { title: t('customerGroups', 'title'), href: '/customer-groups' },
    ];
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CustomerGroupListItem | null>(null);
    const [deleting, setDeleting] = useState<CustomerGroupListItem | null>(null);

    const form = useForm({ name: '' });

    const openCreate = () => {
        form.clearErrors();
        form.setData('name', '');
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (group: CustomerGroupListItem) => {
        form.clearErrors();
        form.setData('name', group.name);
        setEditing(group);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Customer group updated.' : 'Customer group created.');
                setModalOpen(false);
            },
            onError: () => toast.error('Could not save — check the form for errors.'),
        };

        if (editing) {
            form.patch(route('customer-groups.update', editing.id), options);
        } else {
            form.post(route('customer-groups.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('customer-groups.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success('Customer group deleted.'),
            onError: (errors) => toast.error(errors.customer_group ?? 'Could not delete this group.'),
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('customerGroups', 'title')} />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title={t('customerGroups', 'title')} description={t('customerGroups', 'description')} />
                    <Button onClick={openCreate}>{t('customerGroups', 'add')}</Button>
                </div>

                {customerGroups.length === 0 ? (
                    <EmptyState title={t('customerGroups', 'empty_title')} description={t('customerGroups', 'empty_description')}>
                        <Button className="mt-2" onClick={openCreate}>
                            {t('customerGroups', 'add')}
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">{t('common', 'name')}</th>
                                    <th className="px-4 py-2 text-right font-medium">{t('customerGroups', 'contacts_count')}</th>
                                    <th className="px-4 py-2 text-right font-medium">{t('common', 'actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerGroups.map((group) => (
                                    <tr key={group.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{group.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{group.contacts_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getCustomerGroupActions(group, { onEdit: openEdit, onDelete: setDeleting })}
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
                title={editing ? t('common', 'edit') : t('customerGroups', 'add')}
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
                title={t('customerGroups', 'delete_title')}
                description={`"${deleting?.name}" ${t('customerGroups', 'delete_description')}`}
                confirmLabel={t('common', 'delete')}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
