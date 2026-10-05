import InvoicePreview from '@/components/invoice-settings/invoice-preview';
import { type InvoiceSettingsData } from '@/components/invoice-settings/types';
import { type InvoiceShopInfo } from '@/types/models';
import { Eye } from 'lucide-react';

interface LivePreviewPanelProps {
    settings: InvoiceSettingsData;
    logoPreview: string | null;
    shop: InvoiceShopInfo;
}

/** The sticky side panel that re-renders a sample invoice as settings change. */
export function LivePreviewPanel({ settings, logoPreview, shop }: LivePreviewPanelProps) {
    return (
        <aside className="min-w-0 xl:sticky xl:top-5">
            <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                            <Eye className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Live Preview</h2>
                            <p className="text-muted-foreground text-xs">Changes update instantly</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">Live</span>
                </div>
                <div className="bg-muted/30 p-3 sm:p-5">
                    <div className="mx-auto w-full max-w-[620px]">
                        <InvoicePreview settings={settings} logoPreview={logoPreview} shop={shop} />
                    </div>
                </div>
                <div className="border-t px-4 py-3">
                    <p className="text-muted-foreground text-center text-xs">
                        Preview is for layout reference. Final appearance may depend on print settings.
                    </p>
                </div>
            </div>
        </aside>
    );
}
