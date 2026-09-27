import { FormInput } from '@/components/form/form-input';
import FormModal from '@/components/shared/form-modal';
import { type CustomerOption } from '@/types/models';
import { FormEventHandler, useState } from 'react';

interface QuickAddCustomerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (customer: CustomerOption) => void;
}

/**
 * Plain fetch() instead of Inertia's form.post() — Inertia's post would
 * navigate the whole page to wherever ContactController@store redirects,
 * abandoning the in-progress sale cart. ContactController@store detects
 * this (Accept: application/json, no X-Inertia header) and returns the
 * created contact as JSON instead of redirecting.
 */
export default function QuickAddCustomerModal({ open, onOpenChange, onCreated }: QuickAddCustomerModalProps) {
    const [name, setName] = useState('');
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
                    name,
                    phone,
                    type: 'customer',
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

            const customer: CustomerOption = await response.json();
            onCreated(customer);
            setName('');
            setPhone('');
            onOpenChange(false);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title="Add Customer" processing={processing} onSubmit={submit}>
            <FormInput
                id="quick_customer_name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="e.g. John Doe"
                required
            />

            <FormInput
                id="quick_customer_phone"
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
