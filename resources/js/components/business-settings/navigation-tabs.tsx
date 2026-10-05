import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormSection } from '@/components/form/form-section';
import MenuOrderEditor from '@/components/menu-order-editor';
import QuickActionsEditor from '@/components/quick-actions-editor';
import { Kbd } from '@/components/ui/kbd';
import { type NavItem } from '@/types';
import { ArrowDownUp, Zap } from 'lucide-react';

/** Reorder the sidebar menu for every user. */
export function MenuOrderTab({ form, navItems }: { form: BusinessSettingsApi; navItems: NavItem[] }) {
    return (
        <SettingsTab value="menu-order">
            <FormSection
                {...SETTINGS_SECTION}
                title="Sidebar Menu Organizer"
                description="Arrange the navigation menu order for all users. Hidden items will remain hidden according to permissions."
                icon={ArrowDownUp}
            >
                <MenuOrderEditor navItems={navItems} order={form.data.menu_order} onChange={(order) => form.setData('menu_order', order)} />
            </FormSection>
        </SettingsTab>
    );
}

/** Which actions the Ctrl + Space switcher offers, and in what order. */
export function QuickActionsTab({ form }: { form: BusinessSettingsApi }) {
    return (
        <SettingsTab value="quick-actions">
            <FormSection {...SETTINGS_SECTION} title="Quick Actions" description="Configure the actions available through Ctrl + Space." icon={Zap}>
                <div className="bg-muted/30 rounded-lg border p-3 sm:p-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Press <Kbd>Ctrl</Kbd>
                        {' + '}
                        <Kbd>Space</Kbd> to open the quick actions menu. Hold Ctrl and press Space again to navigate through actions.
                    </p>
                </div>

                <QuickActionsEditor value={form.data.quick_actions} onChange={(value) => form.setData('quick_actions', value)} />
            </FormSection>
        </SettingsTab>
    );
}
