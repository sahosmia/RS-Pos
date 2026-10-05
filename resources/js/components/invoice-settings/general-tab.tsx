import { FormInput } from '@/components/form/form-input';
import { InvoiceTabContent, SectionToggles } from '@/components/invoice-settings/invoice-tab';
import { fieldError, type InvoiceTabProps } from '@/components/invoice-settings/types';
import { FileText } from 'lucide-react';

/** Invoice title and subtitle, and which of number / date / due date are printed. */
export function GeneralTab({ form, updateSection }: InvoiceTabProps) {
    return (
        <InvoiceTabContent
            value="general"
            title="General Information"
            description="Invoice-এর title, subtitle এবং date visibility নিয়ন্ত্রণ করুন।"
            icon={FileText}
        >
            <FormInput
                id="general_title"
                label="Invoice Title"
                value={form.data.general.title}
                onChange={(e) => updateSection('general', { title: e.target.value })}
                error={fieldError(form, 'general.title')}
            />
            <FormInput
                id="general_subtitle"
                label="Invoice Subtitle"
                value={form.data.general.subtitle}
                onChange={(e) => updateSection('general', { subtitle: e.target.value })}
                error={fieldError(form, 'general.subtitle')}
            />
            <div className="space-y-2 pt-1">
                <p className="text-sm font-medium">Invoice Details</p>
                <SectionToggles
                    form={form}
                    updateSection={updateSection}
                    section="general"
                    toggles={[
                        { key: 'show_number', label: 'Invoice Number', description: 'Invoice-এর unique number দেখাবে' },
                        { key: 'show_date', label: 'Invoice Date', description: 'Invoice তৈরি হওয়ার তারিখ দেখাবে' },
                        { key: 'show_due_date', label: 'Due Date', description: 'প্রযোজ্য ক্ষেত্রে invoice-এর due date দেখাবে' },
                    ]}
                />
            </div>
        </InvoiceTabContent>
    );
}
