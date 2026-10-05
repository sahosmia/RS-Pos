import { FormInput } from '@/components/form/form-input';
import FormModal from '@/components/shared/form-modal';
import { type CustomerOption, type SupplierOption } from '@/types/models';
import { FormEventHandler, useState } from 'react';

interface QuickAddContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Which kind of contact the modal creates — the Sale form adds customers, the Purchase form suppliers. */
    type: 'customer' | 'supplier';
    /** ContactController@store's JSON shape — the same fields a CustomerOption / SupplierOption carries. */
    onCreated: (contact: CustomerOption & SupplierOption) => void;
}

/**
 * Plain fetch() instead of Inertia's form.post() — Inertia's post would
 * navigate the whole page to wherever ContactController@store redirects,
 * abandoning the in-progress sale / purchase. ContactController@store detects
 * this (Accept: application/json, no X-Inertia header) and returns the
 * created contact as JSON instead of redirecting.
 */
export default function QuickAddContactModal({ open, onOpenChange, type, onCreated }: QuickAddContactModalProps) {
    const label = type === 'supplier' ? 'Supplier' : 'Customer';
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const readXsrfToken = (): string => {
        const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const submit: FormEventHandler = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        try {
            const response = await fetch(route('contacts.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    // Same shape as the main contact form: `name` is the composed display name.
                    name: [firstName, middleName, lastName].filter(Boolean).join(' '),
                    first_name: firstName,
                    middle_name: middleName || null,
                    last_name: lastName,
                    phone,
                    type,
                    entity_type: 'individual',
                    is_active: true,
                }),
            });

            if (response.status === 422) {
                const body = await response.json();
                setErrors(Object.fromEntries(Object.entries(body.errors).map(([key, messages]) => [key, (messages as string[])[0]])));
                return;
            }

            if (!response.ok) {
                return;
            }

            onCreated(await response.json());
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setPhone('');
            onOpenChange(false);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title={`Add ${label}`} processing={processing} onSubmit={submit}>
            <FormInput
                id="quick_contact_first_name"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.first_name ?? errors.name}
                placeholder="e.g. John"
                required
            />

            <FormInput
                id="quick_contact_middle_name"
                label="Middle Name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                error={errors.middle_name}
                placeholder="Optional"
            />

            <FormInput
                id="quick_contact_last_name"
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.last_name}
                placeholder="e.g. Doe"
                required
            />

            <FormInput
                id="quick_contact_phone"
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                placeholder="e.g. 01712345678"
                required
            />
        </FormModal>
    );
}
