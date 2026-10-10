import { FormInput } from '@/components/form/form-input';
import FormModal from '@/components/shared/form-modal';

interface SerialNumbersModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productName: string;
    /** One serial number per unit received. */
    quantity: number;
    serials: string[];
    onChange: (unitIndex: number, value: string) => void;
}

/** The serial number of every unit of one purchase line — kept out of the form body so a 20-unit line doesn't push the page down. */
export default function SerialNumbersModal({ open, onOpenChange, productName, quantity, serials, onChange }: SerialNumbersModalProps) {
    const units = Math.ceil(quantity);
    const filled = serials.slice(0, units).filter((serial) => serial?.trim()).length;

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Serial Numbers"
            description={`${productName} — ${units}টা unit-এর প্রতিটির আলাদা serial number দিন (${filled}/${units})`}
            submitLabel="Done"
            onSubmit={(e) => {
                e.preventDefault();
                onOpenChange(false);
            }}
        >
            {/* Fixed-width fields that wrap into as many columns as fit (one per row on a phone), not one full-width input per unit. */}
            <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,12rem)] gap-3 overflow-y-auto pr-1 max-sm:grid-cols-1">
                {Array.from({ length: units }, (_, unitIndex) => (
                    <FormInput
                        key={unitIndex}
                        id={`serial-${unitIndex}`}
                        label={`Unit ${unitIndex + 1}`}
                        value={serials[unitIndex] ?? ''}
                        onChange={(e) => onChange(unitIndex, e.target.value)}
                        placeholder="Serial number"
                        autoFocus={unitIndex === 0}
                    />
                ))}
            </div>
        </FormModal>
    );
}
