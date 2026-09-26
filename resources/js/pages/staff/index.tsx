import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import EmptyState from '@/components/shared/empty-state';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getStaffActions } from '@/components/staff/staff-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMoneyFormat } from '@/hooks/use-money-format';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type StaffListItem, type StaffStatusValue } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Staff', href: '/staff' }];

interface StaffIndexProps {
    staff: StaffListItem[];
    investors: { id: number; name: string }[];
}

export default function StaffIndex({ staff, investors }: StaffIndexProps) {
    const money = useMoneyFormat();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<StaffListItem | null>(null);
    const [deleting, setDeleting] = useState<StaffListItem | null>(null);

    const form = useForm({
        name: '',
        phone: '',
        designation: '',
        joining_date: '',
        salary_amount: 0,
        status: 'active' as StaffStatusValue,
        investor_id: null as number | null,
    });

    const openCreate = () => {
        form.clearErrors();
        form.setData({ name: '', phone: '', designation: '', joining_date: '', salary_amount: 0, status: 'active', investor_id: null });
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (member: StaffListItem) => {
        form.clearErrors();
        form.setData({
            name: member.name,
            phone: member.phone ?? '',
            designation: member.designation ?? '',
            joining_date: member.joining_date ?? '',
            salary_amount: member.salary_amount,
            status: member.status,
            investor_id: member.investor?.id ?? null,
        });
        setEditing(member);
        setModalOpen(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => setModalOpen(false) };

        if (editing) {
            form.patch(route('staff.update', editing.id), options);
        } else {
            form.post(route('staff.store'), options);
        }
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('staff.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) });
    };

    const investorOptions = investors.map((investor) => ({ value: String(investor.id), label: investor.name }));

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff" />

            <div className="space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <HeadingSmall title="Staff" description="দোকানের কর্মচারী — বেতন, অগ্রিম, লোনের হিসাব" />
                    <Button onClick={openCreate}>Add Staff</Button>
                </div>

                {staff.length === 0 ? (
                    <EmptyState title="No staff yet" description="প্রথম staff যোগ করুন">
                        <Button className="mt-2" onClick={openCreate}>
                            Add Staff
                        </Button>
                    </EmptyState>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Name</th>
                                    <th className="px-4 py-2 text-left font-medium">Designation</th>
                                    <th className="px-4 py-2 text-right font-medium">Salary</th>
                                    <th className="px-4 py-2 text-right font-medium">Balance</th>
                                    <th className="px-4 py-2 text-left font-medium">Status</th>
                                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map((member) => (
                                    <tr key={member.id} className="border-t">
                                        <td className="px-4 py-2">
                                            <Link href={route('staff.show', member.id)} className="font-medium underline-offset-2 hover:underline">
                                                {member.name}
                                            </Link>
                                            {member.investor && <div className="text-muted-foreground text-xs">Investor also</div>}
                                        </td>
                                        <td className="px-4 py-2">{member.designation ?? '—'}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(member.salary_amount)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{money(member.balance)}</td>
                                        <td className="px-4 py-2">
                                            <Badge variant={member.status === 'active' ? 'secondary' : 'outline'}>
                                                {member.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <DataTableRowActions
                                                    actions={getStaffActions(member, { onEdit: openEdit, onDelete: setDeleting })}
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
                title={editing ? 'Edit Staff' : 'Add Staff'}
                processing={form.processing}
                onSubmit={submit}
            >
                <FormInput
                    id="name"
                    label="Name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    error={form.errors.name}
                    required
                />

                <FormInput
                    id="phone"
                    label="Phone"
                    value={form.data.phone}
                    onChange={(e) => form.setData('phone', e.target.value)}
                    error={form.errors.phone}
                />

                <FormInput
                    id="designation"
                    label="Designation"
                    value={form.data.designation}
                    onChange={(e) => form.setData('designation', e.target.value)}
                    error={form.errors.designation}
                />

                <FormInput
                    id="joining_date"
                    label="Joining Date"
                    type="date"
                    value={form.data.joining_date}
                    onChange={(e) => form.setData('joining_date', e.target.value)}
                    error={form.errors.joining_date}
                />

                <div className="grid gap-2">
                    <Label htmlFor="salary_amount">Monthly Salary</Label>
                    <MoneyInput
                        id="salary_amount"
                        value={form.data.salary_amount}
                        onChange={(e) => form.setData('salary_amount', Number(e.target.value))}
                    />
                    <InputError message={form.errors.salary_amount} />
                </div>

                <FormSelect
                    id="investor_id"
                    label="Also an Investor? (optional)"
                    value={form.data.investor_id}
                    onChange={(val) => form.setData('investor_id', val ? Number(val) : null)}
                    options={investorOptions}
                    error={form.errors.investor_id}
                    allowNone
                    noneLabel="None"
                    placeholder="None"
                />

                {editing && (
                    <FormSelect
                        id="status"
                        label="Status"
                        value={form.data.status}
                        onChange={(val) => val && form.setData('status', val as StaffStatusValue)}
                        options={statusOptions}
                        error={form.errors.status}
                    />
                )}
            </FormModal>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete staff?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো লেনদেন থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
