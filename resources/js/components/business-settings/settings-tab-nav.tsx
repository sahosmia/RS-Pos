import { SETTINGS_TABS } from '@/components/business-settings/tab-definitions';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

/** The row of tab buttons (scrolls sideways on small screens), with the open tab's name on the right. */
export function SettingsTabNav({ activeTab }: { activeTab: string }) {
    const active = SETTINGS_TABS.find((tab) => tab.value === activeTab);

    return (
        <div className="bg-card rounded-xl border p-2 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-2 pt-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Settings Navigation</p>
                <span className="text-muted-foreground text-xs">{active?.label}</span>
            </div>

            <div className="overflow-x-auto">
                <TabsList className="flex h-auto min-w-max items-center justify-start gap-1 bg-transparent p-0">
                    {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className="text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary flex h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 text-xs transition-all data-[state=active]:font-semibold sm:px-4 sm:text-sm"
                        >
                            <Icon className="size-4" />
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
}
