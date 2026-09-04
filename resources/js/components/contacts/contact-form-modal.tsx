import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { type ContactDetail, type ContactEntityType, type ContactListItem, type ContactType, type CustomerGroup } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

interface ContactFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ContactListItem | ContactDetail | null;
    customerGroups: CustomerGroup[];
    onSuccess?: () => void;
}

const emptyForm = {
    name: '',
    phone: '',
    email: '',
    address: '',
    shipping_address: '',
    type: 'customer' as ContactType,
    entity_type: 'individual' as ContactEntityType,
    business_name: '',
    customer_group_id: null as number | null,
    is_active: true,
    opening_balance: 0,
};

export default function ContactFormModal({ open, onOpenChange, editing, customerGroups, onSuccess }: ContactFormModalProps) {
    const form = useForm(emptyForm);
    const canSetOpeningBalance = editing && 'can_set_opening_balance' in editing ? editing.can_set_opening_balance : true;

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();

        if (editing && 'phone' in editing) {
            form.setData({
                name: editing.name,
                phone: editing.phone,
                email: editing.email ?? '',
                address: 'address' in editing ? (editing.address ?? '') : '',
                shipping_address: 'shipping_address' in editing ? (editing.shipping_address ?? '') : '',
                type: editing.type,
                entity_type: editing.entity_type,
                business_name: editing.business_name ?? '',
                customer_group_id: 'customer_group_id' in editing ? editing.customer_group_id : (editing.customer_group?.id ?? null),
                is_active: editing.is_active,
                opening_balance: 0,
            });
        } else {
            form.setData(emptyForm);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing?.id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                onSuccess?.();
            },
        };

        if (editing) {
            form.patch(route('contacts.update', editing.id), options);
        } else {
            form.post(route('contacts.store'), options);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Contact' : 'Add Contact'}
            processing={form.processing}
            onSubmit={submit}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    <InputError message={form.errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} required />
                    <InputError message={form.errors.phone} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                    <InputError message={form.errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={form.data.type} onValueChange={(value) => form.setData('type', value as ContactType)}>
                        <SelectTrigger id="type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="supplier">Supplier</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.type} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="entity_type">Entity Type</Label>
                    <Select value={form.data.entity_type} onValueChange={(value) => form.setData('entity_type', value as ContactEntityType)}>
                        <SelectTrigger id="entity_type">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.entity_type} />
                </div>

                {form.data.entity_type === 'business' && (
                    <div className="grid gap-2">
                        <Label htmlFor="business_name">Business Name</Label>
                        <Input
                            id="business_name"
                            value={form.data.business_name}
                            onChange={(e) => form.setData('business_name', e.target.value)}
                            required
                        />
                        <InputError message={form.errors.business_name} />
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="customer_group_id">Customer Group</Label>
                    <Select
                        value={form.data.customer_group_id ? String(form.data.customer_group_id) : 'none'}
                        onValueChange={(value) => form.setData('customer_group_id', value === 'none' ? null : Number(value))}
                    >
                        <SelectTrigger id="customer_group_id">
                            <SelectValue placeholder="No group" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No group</SelectItem>
                            {customerGroups.map((group) => (
                                <SelectItem key={group.id} value={String(group.id)}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.customer_group_id} />
                </div>

                {canSetOpeningBalance ? (
                    <div className="grid gap-2">
                        <Label htmlFor="opening_balance">Opening Balance</Label>
                        <MoneyInput
                            id="opening_balance"
                            value={form.data.opening_balance}
                            onChange={(e) => form.setData('opening_balance', Number(e.target.value))}
                        />
                        <p className="text-muted-foreground text-xs">পজিটিভ = ওরা আমাদের পাবে, নেগেটিভ = আমরা ওদের পাব</p>
                        <InputError message={form.errors.opening_balance} />
                    </div>
                ) : (
                    <p className="text-muted-foreground self-end text-sm">এই contact-এ লেনদেন হয়ে গেছে — opening balance আর বদলানো যাবে না।</p>
                )}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                <InputError message={form.errors.address} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="shipping_address">Shipping Address</Label>
                <Textarea
                    id="shipping_address"
                    value={form.data.shipping_address}
                    onChange={(e) => form.setData('shipping_address', e.target.value)}
                />
                <InputError message={form.errors.shipping_address} />
            </div>

            {editing && (
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <Label htmlFor="is_active">Active</Label>
                        <p className="text-muted-foreground text-sm">বন্ধ করলে নতুন লেনদেনে এই contact দেখাবে না</p>
                    </div>
                    <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                </div>
            )}
        </FormModal>
    );
}
