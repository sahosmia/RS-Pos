import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import { FormEventHandler, useEffect, useState } from 'react';

export type FinancingTypeValue = 'one_time' | 'emi';

interface FinancingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialFinancingType: FinancingTypeValue;
    initialInstallmentCount: number | null;
    installmentCountError?: string;
    onApply: (financingType: FinancingTypeValue, installmentCount: number | null) => void;
}

const financingOptions = [
    { value: 'one_time', label: 'One-time' },
    { value: 'emi', label: 'EMI' },
];

/**
 * Same "summary row + pencil icon opens a modal" pattern as `DiscountModal`
 * (item 19), applied to Financing so the Payment section's totals box stays
 * a clean read-only summary instead of an always-expanded form.
 */
export default function FinancingModal({
    open,
    onOpenChange,
    initialFinancingType,
    initialInstallmentCount,
    installmentCountError,
    onApply,
}: FinancingModalProps) {
    const [financingType, setFinancingType] = useState<FinancingTypeValue>(initialFinancingType);
    const [installmentCount, setInstallmentCount] = useState<number | null>(initialInstallmentCount);

    // Re-seed each time the modal opens, matching DiscountModal's pattern.
    useEffect(() => {
        if (open) {
            setFinancingType(initialFinancingType);
            setInstallmentCount(initialInstallmentCount);
        }
    }, [open, initialFinancingType, initialInstallmentCount]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        onApply(financingType, financingType === 'emi' ? installmentCount : null);
        onOpenChange(false);
    };

    return (
        <FormModal open={open} onOpenChange={onOpenChange} title="Financing" submitLabel="Apply" onSubmit={submit}>
            <FormSelect
                id="financing_modal_type"
                label="Financing"
                value={financingType}
                onChange={(val) => val && setFinancingType(val as FinancingTypeValue)}
                options={financingOptions}
            />

            {financingType === 'emi' && (
                <>
                    <FormInput
                        id="financing_modal_installment_count"
                        label="Installments"
                        type="number"
                        min={1}
                        value={installmentCount ?? ''}
                        onChange={(e) => setInstallmentCount(e.target.value ? Number(e.target.value) : null)}
                        error={installmentCountError}
                        placeholder="e.g. 12"
                    />
                    <p className="text-muted-foreground text-xs">
                        নিচে account row-এ down payment দিন (না দিলে পুরো amount emi-তে যাবে) — বাকিটা সমান কিস্তিতে ভাগ হবে
                    </p>
                </>
            )}
        </FormModal>
    );
}
