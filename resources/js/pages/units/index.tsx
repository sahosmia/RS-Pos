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
import { type UnitListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Units', href: '/units' },
];

interface UnitsIndexProps {
    units: UnitListItem[];
}

export default function UnitsIndex({ units }: UnitsIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<UnitListItem | null>(null);
    const [deleting, setDeleting] = useState<UnitListItem | null>(null);

    const form = useForm({ name: '' });

    const openCreate = () => {
        form.clearErrors();
        form.setData('name', '');
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (unit: UnitListItem) => {
        form.clearErrors();
        form.setData('name', unit.name);
        setEditing(unit);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

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

        router.delete(route('units.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Units" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Units" description="Pc, Kg, Box, Litre — পণ্যের একক" />
                    <Button onClick={openCreate}>Add Unit</Button>
                </div>

                {units.length === 0 ? (
                    <EmptyState title="No units yet" description="প্রথম unit যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Unit
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-right font-medium">Products</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map((unit) => (
                                    <tr key={unit.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{unit.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{unit.products_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(unit)}>
                                                    Edit
                                                </Button>
                                                {unit.can_delete && (
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(unit)}>
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
                title={editing ? 'Edit Unit' : 'Add Unit'}
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
                title="Delete unit?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো product-এ ব্যবহৃত হলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
