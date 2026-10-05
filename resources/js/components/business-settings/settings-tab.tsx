import { TabsContent } from '@/components/ui/tabs';
import { type ReactNode } from 'react';

/** One tab's content area — the sections of that tab stack with a consistent gap. */
export function SettingsTab({ value, children }: { value: string; children: ReactNode }) {
    return (
        <TabsContent value={value} className="mt-5 space-y-5 focus-visible:outline-none">
            {children}
        </TabsContent>
    );
}

/** FormSection props shared by every card on the settings pages: theme-coloured chip, roomier body. */
export const SETTINGS_SECTION = { accent: 'primary', contentClassName: 'space-y-5 sm:p-6' } as const;
