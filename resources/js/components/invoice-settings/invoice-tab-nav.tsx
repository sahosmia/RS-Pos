import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, FileText, ListChecks, Package, Palette, PanelsTopLeft, Store, UserRound } from 'lucide-react';

const TABS = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'branding', label: 'Branding', icon: Palette },
    { value: 'business', label: 'Business', icon: Store },
    { value: 'customer', label: 'Customer', icon: UserRound },
    { value: 'items', label: 'Items', icon: Package },
    { value: 'totals', label: 'Totals', icon: Calculator },
    { value: 'terms', label: 'Terms', icon: ListChecks },
    { value: 'footer', label: 'Footer', icon: PanelsTopLeft },
];

/** The row of tab buttons above the settings cards (scrolls sideways on small screens). */
export function InvoiceTabNav() {
    return (
        <div className="bg-card mb-5 overflow-x-auto rounded-xl border p-1.5 shadow-sm">
            <TabsList className="flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 bg-transparent">
                {TABS.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} className="gap-2 rounded-lg px-3 py-2">
                        <Icon className="size-4" />
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
}
