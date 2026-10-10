import { SETTINGS_TABS } from '@/components/business-settings/tab-definitions';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

/** The row of tab buttons (scrolls sideways on small screens), with the open tab's name on the right. */
export function SettingsTabNav({ activeTab }: { activeTab: string }) {
    const active = SETTINGS_TABS.find((tab) => tab.value === activeTab);

    return (
        <div className="rounded-brand-card border-brand-card-border bg-card border px-3 pt-2">
            <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide">Settings Navigation</p>
                <span className="text-muted-foreground text-xs">{active?.label}</span>
            </div>

            <TabsList variant="underline" className="border-b-0">
                {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} icon={<Icon />}>
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
}
