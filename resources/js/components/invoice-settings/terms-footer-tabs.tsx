import { FormInput } from '@/components/form/form-input';
import { InvoiceTabContent, SectionToggles } from '@/components/invoice-settings/invoice-tab';
import { fieldError, type InvoiceTabProps } from '@/components/invoice-settings/types';
import { Button } from '@/components/ui/button';
import { ListChecks, PanelsTopLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

/** Show / hide the terms, and edit the list of terms printed at the bottom of the invoice. */
export function TermsTab({ form, updateSection }: InvoiceTabProps) {
    const [newTerm, setNewTerm] = useState('');
    const terms = form.data.terms.items;

    const setTerms = (items: string[]) => updateSection('terms', { items });

    const addTerm = () => {
        const term = newTerm.trim();
        if (!term) return;

        setTerms([...terms, term]);
        setNewTerm('');
    };

    return (
        <InvoiceTabContent
            value="terms"
            title="Terms & Conditions"
            description="Invoice-এর শেষে প্রযোজ্য শর্তাবলি যোগ বা পরিবর্তন করুন।"
            icon={ListChecks}
        >
            <SectionToggles
                form={form}
                updateSection={updateSection}
                section="terms"
                toggles={[{ key: 'enabled', label: 'Show Terms & Conditions', description: 'Invoice-এ terms section দেখাবে' }]}
            />

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Terms list</p>
                    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs">{terms.length} items</span>
                </div>

                {terms.length === 0 && (
                    <div className="rounded-xl border border-dashed py-7 text-center">
                        <ListChecks className="text-muted-foreground/60 mx-auto size-7" />
                        <p className="mt-2 text-sm font-medium">No terms added</p>
                        <p className="text-muted-foreground mt-1 text-xs">নিচের field ব্যবহার করে নতুন term যোগ করুন।</p>
                    </div>
                )}

                {terms.map((term, index) => (
                    <div key={index} className="bg-background flex min-w-0 items-center gap-2 rounded-xl border p-2">
                        <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                            {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <FormInput
                                id={`term_${index}`}
                                value={term}
                                onChange={(e) => setTerms(terms.map((existing, i) => (i === index ? e.target.value : existing)))}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove term ${index + 1}`}
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                            onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                        <FormInput id="new_term" placeholder="Write a new term..." value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
                    </div>
                    <Button type="button" variant="outline" disabled={!newTerm.trim()} onClick={addTerm} className="w-full shrink-0 sm:w-auto">
                        <Plus className="mr-2 size-4" />
                        Add Term
                    </Button>
                </div>
            </div>
        </InvoiceTabContent>
    );
}

/** Show / hide the footer line and set its text. */
export function FooterTab({ form, updateSection }: InvoiceTabProps) {
    return (
        <InvoiceTabContent value="footer" title="Invoice Footer" description="Invoice-এর নিচের অংশে একটি custom message দেখান।" icon={PanelsTopLeft}>
            <SectionToggles
                form={form}
                updateSection={updateSection}
                section="footer"
                toggles={[{ key: 'enabled', label: 'Show Footer', description: 'Invoice-এর bottom section-এ footer text দেখাবে' }]}
            />
            <FormInput
                id="footer_text"
                label="Footer Text"
                value={form.data.footer.text}
                onChange={(e) => updateSection('footer', { text: e.target.value })}
                error={fieldError(form, 'footer.text')}
            />
        </InvoiceTabContent>
    );
}
