import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type CategoryListItem } from '@/types/models';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Categories', href: '/categories' },
];

interface CategoriesIndexProps {
    categories: CategoryListItem[];
    allCategories: { id: number; name: string; parent_id: number | null }[];
}

export default function CategoriesIndex({ categories, allCategories }: CategoriesIndexProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryListItem | null>(null);
    const [deleting, setDeleting] = useState<CategoryListItem | null>(null);

    const form = useForm({ name: '', parent_id: null as number | null });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', parent_id: null });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (category: CategoryListItem) => {
        form.clearErrors();
        form.setData({ name: category.name, parent_id: category.parent_id });
        setEditing(category);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

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

        router.delete(route('categories.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    const parentOptions = allCategories.filter((category) => category.id !== editing?.id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Categories" description="Parent-child সাপোর্ট সহ পণ্যের ক্যাটাগরি" />
                    <Button onClick={openCreate}>Add Category</Button>
                </div>

                {categories.length === 0 ? (
                    <EmptyState title="No categories yet" description="প্রথম category যোগ করুন">
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
                                    <th className="px-4 py-2 text-right font-medium">Products</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{category.name}</td>
                                        <td className="text-muted-foreground px-4 py-2">{category.parent?.name ?? '—'}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{category.products_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>
                                                    Edit
                                                </Button>
                                                {category.can_delete && (
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleting(category)}>
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
                title={editing ? 'Edit Category' : 'Add Category'}
                processing={form.processing}
                onSubmit={submit}
            >
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    <InputError message={form.errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="parent_id">Parent Category</Label>
                    <Select
                        value={form.data.parent_id ? String(form.data.parent_id) : 'none'}
                        onValueChange={(value) => form.setData('parent_id', value === 'none' ? null : Number(value))}
                    >
                        <SelectTrigger id="parent_id">
                            <SelectValue placeholder="No parent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No parent</SelectItem>
                            {parentOptions.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.parent_id} />
                </div>
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete category?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো product বা sub-category থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
