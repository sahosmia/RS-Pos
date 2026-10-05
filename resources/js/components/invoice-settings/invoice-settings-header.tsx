import { type InvoiceSettingsData } from '@/components/invoice-settings/types';
import { cn } from '@/lib/utils';
import { Eye, FileText, ListChecks, Palette, PanelsTopLeft, type LucideIcon } from 'lucide-react';

interface InvoiceSettingsHeaderProps {
    data: InvoiceSettingsData;
    processing: boolean;
    isDirty: boolean;
    recentlySuccessful: boolean;
}

function SaveStatus({ processing, isDirty, recentlySuccessful }: Omit<InvoiceSettingsHeaderProps, 'data'>) {
    const label = processing ? 'Saving changes...' : recentlySuccessful ? 'Changes saved' : isDirty ? 'Unsaved changes' : 'All changes saved';

    return (
        <div className="bg-card text-muted-foreground flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs sm:self-center">
            <span
                className={cn(
                    'size-2 rounded-full',
                    recentlySuccessful ? 'bg-green-500' : processing || isDirty ? 'bg-amber-500' : 'bg-muted-foreground/50',
                    processing && 'animate-pulse',
                )}
            />
            {label}
        </div>
    );
}

function OverviewCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="bg-card flex min-w-0 items-center gap-3 rounded-2xl border p-3 shadow-sm sm:p-4">
            <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10">
                <Icon className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground truncate text-xs">{label}</p>
                <p className="mt-0.5 truncate text-sm font-semibold sm:text-base">{value}</p>
            </div>
        </div>
    );
}

/** Page title, the save-status pill, and four at-a-glance cards. */
export function InvoiceSettingsHeader({ data, ...status }: InvoiceSettingsHeaderProps) {
    return (
        <>
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                        <FileText className="size-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Invoice Settings</h1>
                        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                            আপনার invoice-এর layout, branding এবং কোন তথ্যগুলো print হবে তা কনফিগার করুন।
                        </p>
                    </div>
                </div>

                <SaveStatus {...status} />
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <OverviewCard icon={PanelsTopLeft} label="Invoice Sections" value="8" />
                <OverviewCard icon={Eye} label="Live Preview" value="Enabled" />
                <OverviewCard icon={Palette} label="Branding" value={data.branding.show_logo ? 'On' : 'Off'} />
                <OverviewCard icon={ListChecks} label="Terms" value={data.terms.enabled ? 'On' : 'Off'} />
            </div>
        </>
    );
}
