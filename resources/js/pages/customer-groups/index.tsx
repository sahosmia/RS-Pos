import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CustomerGroupListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Contacts', href: '/contacts' },
    { title: 'Customer Groups', href: '/customer-groups' },
];

interface CustomerGroupsIndexProps {
    customerGroups: CustomerGroupListItem[];
}

export default function CustomerGroupsIndex({ customerGroups }: CustomerGroupsIndexProps) {
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

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

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
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customer Groups" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Customer Groups" description="ফিল্টার ও segmentation-এর জন্য — pricing/discount tier না" />
                    <Button onClick={openCreate}>Add Group</Button>
                </div>

                {customerGroups.length === 0 ? (
                    <EmptyState title="No customer groups yet" description="প্রথম group যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Group
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-right font-medium">Contacts</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerGroups.map((group) => (
                                    <tr key={group.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{group.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{group.contacts_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                                                    Edit
                                                </Button>
                                                {group.can_delete && (
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(group)}>
                                                        Delete
                                                    </Button>
                                                )}
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
                title={editing ? 'Edit Customer Group' : 'Add Customer Group'}
                processing={form.processing}
                onSubmit={submit}
            >
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    <InputError message={form.errors.name} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete customer group?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো contact-এ ব্যবহৃত হলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
