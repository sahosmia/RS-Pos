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
import { type BrandListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Brands', href: '/brands' },
];

interface BrandsIndexProps {
    brands: BrandListItem[];
}

export default function BrandsIndex({ brands }: BrandsIndexProps) {
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
            <Head title="Brands" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Brands" description="পণ্যের ব্র্যান্ড তালিকা" />
                    <Button onClick={openCreate}>Add Brand</Button>
                </div>

                {brands.length === 0 ? (
                    <EmptyState title="No brands yet" description="প্রথম brand যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Brand
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
                                {brands.map((brand) => (
                                    <tr key={brand.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{brand.name}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{brand.products_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                                                    Edit
                                                </Button>
                                                {brand.can_delete && (
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(brand)}>
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
                title={editing ? 'Edit Brand' : 'Add Brand'}
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
                title="Delete brand?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো product-এ ব্যবহৃত হলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
