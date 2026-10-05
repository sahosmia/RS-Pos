import InputError from '@/components/input-error';
import { InvoiceTabContent, SectionToggles } from '@/components/invoice-settings/invoice-tab';
import { fieldError, type InvoiceTabProps } from '@/components/invoice-settings/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImagePlus, Palette, X } from 'lucide-react';
import { type RefObject } from 'react';

interface BrandingTabProps extends InvoiceTabProps {
    logoPreview: string | null;
    inputRef: RefObject<HTMLInputElement | null>;
    onLogoChange: (file: File | null) => void;
    onLogoClear: () => void;
}

/** Whether the logo is printed, and uploading / replacing / removing it. */
export function BrandingTab({ form, updateSection, logoPreview, inputRef, onLogoChange, onLogoClear }: BrandingTabProps) {
    const openPicker = () => inputRef.current?.click();

    return (
        <InvoiceTabContent
            value="branding"
            title="Invoice Branding"
            description="আপনার invoice-এ business logo দেখানো ও পরিবর্তন করুন।"
            icon={Palette}
        >
            <SectionToggles
                form={form}
                updateSection={updateSection}
                section="branding"
                toggles={[{ key: 'show_logo', label: 'Show Business Logo', description: 'Invoice-এর header-এ logo দেখাবে' }]}
            />

            <div className="space-y-2">
                <Label htmlFor="logo">Logo Image</Label>
                <input
                    ref={inputRef}
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                />

                {logoPreview ? (
                    <div className="bg-muted/20 rounded-2xl border p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="bg-background flex h-28 w-full items-center justify-center rounded-xl border p-3 sm:size-28 sm:shrink-0">
                                <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">Logo preview</p>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                    PNG, JPG অথবা WEBP ফরম্যাট ব্যবহার করুন। সর্বোচ্চ সাইজ 2MB।
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                                        <ImagePlus className="mr-2 size-4" />
                                        Replace
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={onLogoClear}
                                    >
                                        <X className="mr-2 size-4" />
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={openPicker}
                        className="group bg-muted/20 hover:border-primary/50 hover:bg-primary/5 flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition"
                    >
                        <div className="bg-background text-muted-foreground group-hover:text-primary mb-3 flex size-12 items-center justify-center rounded-2xl border shadow-sm transition">
                            <ImagePlus className="size-6" />
                        </div>
                        <p className="text-sm font-semibold">Upload your logo</p>
                        <p className="text-muted-foreground mt-1 text-xs">Browse PNG, JPG or WEBP</p>
                        <span className="bg-background text-muted-foreground mt-3 rounded-full px-3 py-1 text-xs">Maximum file size: 2MB</span>
                    </button>
                )}
                <InputError message={fieldError(form, 'logo')} />
            </div>
        </InvoiceTabContent>
    );
}
