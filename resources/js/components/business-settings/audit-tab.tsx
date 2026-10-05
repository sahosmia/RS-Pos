import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormSection } from '@/components/form/form-section';
import { FormSelect } from '@/components/form/form-select';
import { Activity } from 'lucide-react';

/** Must match `Settings::ACTIVITY_LOG_RETENTION_OPTIONS` on the backend. */
const RETENTION_OPTIONS = [3, 6, 12, 18, 24];

/** How long activity-log entries are kept before the monthly cleanup deletes them. */
export function AuditTab({ form }: { form: BusinessSettingsApi }) {
    const { data, setData, errors } = form;

    return (
        <SettingsTab value="audit">
            <FormSection
                {...SETTINGS_SECTION}
                title="Activity Log Retention"
                description="Choose how long audit log records are retained before automatic cleanup."
                icon={Activity}
            >
                <div className="max-w-sm space-y-3">
                    <FormSelect
                        id="activity_log_retention_months"
                        label="Retention Period"
                        value={data.activity_log_retention_months}
                        onChange={(val) => val && setData('activity_log_retention_months', Number(val))}
                        options={RETENTION_OPTIONS.map((option) => ({ value: String(option), label: `${option} months` }))}
                        error={errors.activity_log_retention_months}
                        required
                    />
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                    <Activity className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Automatic log cleanup</p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Records older than the selected retention period will be removed automatically according to your application's scheduled
                            cleanup process.
                        </p>
                    </div>
                </div>
            </FormSection>
        </SettingsTab>
    );
}
