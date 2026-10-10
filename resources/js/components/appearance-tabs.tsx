import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';

const OPTIONS: { value: Appearance; icon: LucideIcon; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
];

/** Light / Dark / System switch, built on the shared segmented `Tabs` (arrow keys move between options). */
export default function AppearanceToggleTab() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <Tabs value={appearance} onValueChange={(value) => updateAppearance(value as Appearance)}>
            <TabsList aria-label="Theme">
                {OPTIONS.map(({ value, icon: Icon, label }) => (
                    <TabsTrigger key={value} value={value} icon={<Icon />}>
                        {label}
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
