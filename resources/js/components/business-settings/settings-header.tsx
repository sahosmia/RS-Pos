import ShortcutsDialog from '@/components/shortcuts-dialog';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, PanelLeft, Settings2, ShoppingBag, type LucideIcon } from 'lucide-react';

function OverviewCard({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: string; label: string; value: string }) {
    return (
        <div className="bg-card flex items-center gap-3 rounded-xl border p-4 shadow-sm">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="truncate text-sm font-semibold">{value}</p>
            </div>
        </div>
    );
}

interface SettingsHeaderProps {
    shopName: string;
    sectionCount: number;
    processing: boolean;
}

/** Page title and the three at-a-glance cards (shop, number of sections, save status). */
export function SettingsHeader({ shopName, sectionCount, processing }: SettingsHeaderProps) {
    return (
        <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm">
                        <Settings2 className="size-6" />
                    </div>

                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Business Settings</h1>
                            <Badge variant="secondary" className="text-[10px]">
                                Admin
                            </Badge>
                        </div>

                        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                            Manage your shop information, branding, navigation, invoices and application preferences.
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <ShortcutsDialog />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <OverviewCard
                    icon={ShoppingBag}
                    tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    label="Shop"
                    value={shopName || 'Your Shop'}
                />
                <OverviewCard
                    icon={PanelLeft}
                    tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    label="Configuration"
                    value={`${sectionCount} Settings Sections`}
                />
                <OverviewCard
                    icon={ClipboardList}
                    tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    label="Configuration status"
                    value={processing ? 'Saving changes...' : 'Ready to configure'}
                />
            </div>
        </>
    );
}
