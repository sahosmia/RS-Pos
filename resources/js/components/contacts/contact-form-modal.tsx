import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import MoneyInput from '@/components/shared/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/hooks/use-translation';
import {
    type ContactDetail,
    type ContactEntityType,
    type ContactListItem,
    type ContactPrefixValue,
    type ContactType,
    type CustomerGroup,
} from '@/types/models';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Building2, ChevronDown, Hash, Mail, MapPin, MessageSquareQuote, Phone, Smartphone, User, Users } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ContactFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: ContactListItem | ContactDetail | null;
    customerGroups: CustomerGroup[];
    onSuccess?: () => void;
    defaultType?: ContactType | null;
}

const PREFIX_OPTIONS = [
    { value: 'mr', label: 'Mr.' },
    { value: 'mrs', label: 'Mrs.' },
    { value: 'ms', label: 'Ms.' },
    { value: 'dr', label: 'Dr.' },
    { value: 'mx', label: 'Mx.' },
];

function splitLegacyName(name: string): { first: string; middle: string; last: string } {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) return { first: '', middle: '', last: '' };
    if (parts.length === 1) return { first: parts[0], middle: '', last: '' };

    return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

const emptyForm = {
    name: '',
    prefix: null as ContactPrefixValue | null,
    first_name: '',
    middle_name: '',
    last_name: '',
    contact_code: '',
    phone: '',
    phone_alternate: '',
    email: '',
    address: '',
    shipping_address: '',
    reference: '',
    type: 'customer' as ContactType,
    entity_type: 'individual' as ContactEntityType,
    business_name: '',
    customer_group_id: null as number | null,
    is_active: true,
    opening_balance: 0,
};

export default function ContactFormModal({ open, onOpenChange, editing, customerGroups, onSuccess, defaultType }: ContactFormModalProps) {
    const { t } = useTranslation();
    const form = useForm(emptyForm);
    const canSetOpeningBalance = editing && 'can_set_opening_balance' in editing ? editing.can_set_opening_balance : true;

    const [shipSameAsAddress, setShipSameAsAddress] = useState(true);
    const [additionalOpen, setAdditionalOpen] = useState(false);
    const [duplicateContact, setDuplicateContact] = useState<{ id: number; name: string; phone: string; type: string } | null>(null);

    const checkPhoneDuplicate = (phone: string) => {
        const trimmed = phone.trim();
        if (!trimmed || trimmed.length < 5) return;
        fetch(route('contacts.search') + `?q=${encodeURIComponent(trimmed)}`, {
            headers: { Accept: 'application/json' },
        })
            .then((res) => (res.ok ? res.json() : { data: [] }))
            .then((data) => {
                const matches = data.data ?? [];
                const matched = matches.find(
                    (c: { id: number; phone: string; name: string }) =>
                        c.phone === trimmed && c.id !== editing?.id,
                );
                if (matched) {
                    setDuplicateContact(matched);
                }
            })
            .catch(() => {});
    };

    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        setAdditionalOpen(false);

        if (editing && 'phone' in editing) {
            const hasStructuredName = Boolean(editing.first_name || editing.last_name);
            const legacy = hasStructuredName ? { first: '', middle: '', last: '' } : splitLegacyName(editing.name);
            const existingAddress = 'address' in editing ? (editing.address ?? '') : '';
            const existingShipping = 'shipping_address' in editing ? (editing.shipping_address ?? '') : '';

            form.setData({
                name: editing.name,
                prefix: editing.prefix,
                first_name: editing.first_name ?? legacy.first,
                middle_name: editing.middle_name ?? legacy.middle,
                last_name: editing.last_name ?? legacy.last,
                contact_code: editing.contact_code ?? '',
                phone: editing.phone,
                phone_alternate: editing.phone_alternate ?? '',
                email: editing.email ?? '',
                address: existingAddress,
                shipping_address: existingShipping,
                reference: editing.reference ?? '',
                type: editing.type,
                entity_type: editing.entity_type,
                business_name: editing.business_name ?? '',
                customer_group_id: editing.customer_group_id ?? editing.customer_group?.id ?? null,
                is_active: editing.is_active,
                opening_balance: 0,
            });

            setShipSameAsAddress(existingAddress === existingShipping);
        } else {
            form.setData({ ...emptyForm, type: defaultType ?? emptyForm.type });
            setShipSameAsAddress(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing?.id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const composedName = [
            PREFIX_OPTIONS.find((option) => option.value === form.data.prefix)?.label,
            form.data.first_name,
            form.data.middle_name,
            form.data.last_name,
        ]
            .filter(Boolean)
            .join(' ');

        form.transform((data) => ({
            ...data,
            name: composedName,
            shipping_address: shipSameAsAddress ? data.address : data.shipping_address,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Contact updated.' : 'Contact created.');
                onOpenChange(false);
                onSuccess?.();
            },
            onError: () => toast.error('Could not save — check the form for errors.'),
        };

        if (editing) {
            form.patch(route('contacts.update', editing.id), options);
        } else {
            form.post(route('contacts.store'), options);
        }
    };

    const typeOptions = [
        { value: 'customer', label: t('nav', 'customer') },
        { value: 'supplier', label: t('nav', 'supplier') },
        { value: 'both', label: t('common', 'both') },
    ];

    const customerGroupOptions = customerGroups.map((group) => ({
        value: String(group.id),
        label: group.name,
    }));

    return (
        <>
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? t('contactForm', 'edit_title') : t('contactForm', 'add_title')}
            processing={form.processing}
            onSubmit={submit}
            contentClassName="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto"
        >
            <div className="space-y-8">
                {/* Entity Type */}
                <div className="grid min-w-0 content-start gap-2">
                    <Label required>{t('contactForm', 'entity_type')}</Label>
                    <Tabs value={form.data.entity_type} onValueChange={(value) => form.setData('entity_type', value as ContactEntityType)}>
                        <TabsList className="grid w-full grid-cols-2 sm:w-64">
                            <TabsTrigger value="individual">{t('contactForm', 'individual')}</TabsTrigger>
                            <TabsTrigger value="business">{t('contactForm', 'business')}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <InputError message={form.errors.entity_type} />
                </div>

                {form.data.entity_type === 'business' && (
                    <FormInput
                        id="business_name"
                        label={t('contactForm', 'business_name')}
                        icon={Building2}
                        value={form.data.business_name}
                        onChange={(e) => form.setData('business_name', e.target.value)}
                        error={form.errors.business_name}
                        placeholder="e.g. City Traders Ltd"
                    />
                )}

                {/* Name Structure */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <FormSelect
                        id="prefix"
                        label="Prefix"
                        value={form.data.prefix}
                        onChange={(val) => form.setData('prefix', val as ContactPrefixValue | null)}
                        options={PREFIX_OPTIONS}
                        error={form.errors.prefix}
                        allowNone
                    />

                    <FormInput
                        id="first_name"
                        label="First Name"
                        icon={User}
                        value={form.data.first_name}
                        onChange={(e) => form.setData('first_name', e.target.value)}
                        error={form.errors.first_name}
                        placeholder="e.g. John"
                        required
                    />

                    <FormInput
                        id="middle_name"
                        label="Middle Name"
                        icon={User}
                        value={form.data.middle_name}
                        onChange={(e) => form.setData('middle_name', e.target.value)}
                        error={form.errors.middle_name}
                        placeholder="Optional"
                    />

                    <FormInput
                        id="last_name"
                        label="Last Name"
                        icon={User}
                        value={form.data.last_name}
                        onChange={(e) => form.setData('last_name', e.target.value)}
                        error={form.errors.last_name}
                        placeholder="e.g. Doe"
                        required
                    />
                </div>

                {/* Identity & Contact Details */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormInput
                        id="contact_code"
                        label="Contact ID"
                        icon={Hash}
                        value={form.data.contact_code}
                        onChange={(e) => form.setData('contact_code', e.target.value)}
                        placeholder="Auto-generated if left blank"
                        error={form.errors.contact_code}
                    />

                    <FormSelect
                        id="type"
                        label={t('contactsPage', 'type')}
                        value={form.data.type}
                        onChange={(val) => val && form.setData('type', val as ContactType)}
                        options={typeOptions}
                        error={form.errors.type}
                        required
                    />

                    <FormInput
                        id="phone"
                        label="Primary Phone"
                        icon={Phone}
                        value={form.data.phone}
                        onChange={(e) => form.setData('phone', e.target.value)}
                        onBlur={(e) => checkPhoneDuplicate(e.target.value)}
                        error={form.errors.phone}
                        placeholder="e.g. 01712345678"
                        required
                    />

                    <FormInput
                        id="phone_alternate"
                        label="Alternative Phone"
                        icon={Smartphone}
                        value={form.data.phone_alternate}
                        onChange={(e) => form.setData('phone_alternate', e.target.value)}
                        error={form.errors.phone_alternate}
                        placeholder="Optional"
                    />

                    <FormInput
                        id="email"
                        label={t('common', 'email')}
                        type="email"
                        icon={Mail}
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        error={form.errors.email}
                        placeholder="name@example.com"
                    />

                    <FormSelect
                        id="customer_group_id"
                        label={t('nav', 'customer_group')}
                        icon={Users}
                        value={form.data.customer_group_id}
                        onChange={(val) => form.setData('customer_group_id', val ? Number(val) : null)}
                        options={customerGroupOptions}
                        error={form.errors.customer_group_id}
                        allowNone
                        noneLabel={t('contactForm', 'no_group')}
                    />
                </div>

                {editing && (
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <Label htmlFor="is_active">{t('common', 'active')}</Label>
                            <p className="text-muted-foreground text-sm">{t('contactForm', 'active_hint')}</p>
                        </div>
                        <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
                    </div>
                )}

                {/* Additional Information Accordion */}
                <Collapsible open={additionalOpen} onOpenChange={setAdditionalOpen} className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg p-3 text-left text-sm font-medium"
                        >
                            Additional Information
                            <ChevronDown className={`size-4 transition-transform duration-200 ${additionalOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-5 border-t p-4">
                        {canSetOpeningBalance ? (
                            <div className="grid min-w-0 content-start gap-2">
                                <Label htmlFor="opening_balance">{t('contactForm', 'opening_balance')}</Label>
                                <MoneyInput
                                    id="opening_balance"
                                    value={form.data.opening_balance}
                                    onChange={(e) => form.setData('opening_balance', Number(e.target.value))}
                                    className="sm:max-w-xs"
                                />
                                <p className="text-muted-foreground text-xs">{t('contactForm', 'opening_balance_hint')}</p>
                                <InputError message={form.errors.opening_balance} />
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">{t('contactForm', 'opening_balance_locked')}</p>
                        )}

                        <FormInput
                            id="reference"
                            label="Reference"
                            icon={MessageSquareQuote}
                            value={form.data.reference}
                            onChange={(e) => form.setData('reference', e.target.value)}
                            error={form.errors.reference}
                            placeholder="e.g. Referred by Alice"
                        />

                        <FormInput
                            id="address"
                            label="Address"
                            icon={MapPin}
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                            error={form.errors.address}
                            placeholder="Street, city, zip, country"
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="shipping_address">Shipping Address</Label>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <Checkbox checked={shipSameAsAddress} onCheckedChange={(checked) => setShipSameAsAddress(checked === true)} />
                                    Same as Address
                                </label>
                            </div>
                            {!shipSameAsAddress && (
                                <FormInput
                                    id="shipping_address"
                                    icon={MapPin}
                                    value={form.data.shipping_address}
                                    onChange={(e) => form.setData('shipping_address', e.target.value)}
                                    error={form.errors.shipping_address}
                                    placeholder="Street, city, zip, country"
                                />
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </FormModal>

        <Dialog open={duplicateContact !== null} onOpenChange={(open) => !open && setDuplicateContact(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-5 shrink-0" />
                        এই ফোন নাম্বারটি ইতোমধ্যেই ব্যবহৃত!
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-sm">
                        এই ফোন নাম্বার (<strong>{duplicateContact?.phone}</strong>) দিয়ে ইতোমধ্যেই{' '}
                        <strong className="text-foreground">{duplicateContact?.name}</strong> নামের একজন ব্যক্তির তথ্য সিস্টেমে সংরক্ষিত আছে।
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button type="button" onClick={() => setDuplicateContact(null)}>
                        ঠিক আছে, বুঝেছি
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
    );
}
