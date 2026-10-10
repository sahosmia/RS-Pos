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
        <TabsList variant="underline" className="mb-5">
            {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} icon={<Icon />}>
                    {label}
                </TabsTrigger>
            ))}
        </TabsList>
    );
}
