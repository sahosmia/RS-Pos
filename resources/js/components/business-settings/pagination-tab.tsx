import { SETTINGS_SECTION, SettingsTab } from '@/components/business-settings/settings-tab';
import { type BusinessSettingsApi } from '@/components/business-settings/types';
import { FormSection } from '@/components/form/form-section';
import { FormSelect } from '@/components/form/form-select';
import { ToggleRow } from '@/components/form/toggle-row';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

const PRESET_PER_PAGE_OPTIONS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 500];

/** The page sizes offered in every table's dropdown, the default one, and whether "Show all" is allowed. */
export function PaginationTab({ form }: { form: BusinessSettingsApi }) {
    const { data, setData, errors } = form;
    const [newOption, setNewOption] = useState('');

    const options = data.pagination_per_page_options;
    const availablePresets = PRESET_PER_PAGE_OPTIONS.filter((option) => !options.includes(option));

    const addOption = () => {
        const value = Number(newOption);
        if (!value || options.includes(value)) return;

        setData(
            'pagination_per_page_options',
            [...options, value].sort((a, b) => a - b),
        );
        setNewOption('');
    };

    const removeOption = (value: number) => {
        if (options.length <= 1) return;

        const remaining = options.filter((option) => option !== value);
        setData('pagination_per_page_options', remaining);

        // the default can't be an option that no longer exists
        if (data.pagination_default_per_page === value) {
            setData('pagination_default_per_page', remaining[0]);
        }
    };

    return (
        <SettingsTab value="pagination">
            <FormSection
                {...SETTINGS_SECTION}
                title="Pagination Preferences"
                description="Configure the number of rows displayed in tables throughout the application."
                icon={LayoutDashboard}
            >
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label>Rows-per-page options</Label>
                        <p className="text-muted-foreground text-xs">Choose which page-size options are available in table dropdowns.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {options.map((option) => (
                            <Badge key={option} variant="secondary" className="gap-1 py-1.5 pr-1 pl-3 text-sm">
                                {option}
                                <button
                                    type="button"
                                    onClick={() => removeOption(option)}
                                    disabled={options.length <= 1}
                                    className="hover:bg-background ml-1 rounded-full p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label={`Remove ${option}`}
                                >
                                    <span className="text-xs">×</span>
                                </button>
                            </Badge>
                        ))}
                    </div>

                    <InputError message={errors.pagination_per_page_options} />

                    <div className="flex flex-wrap items-end gap-2 pt-2">
                        <div className="grid gap-2">
                            <Label htmlFor="new_pagination_option">Add an option</Label>

                            <Select value={newOption} onValueChange={setNewOption}>
                                <SelectTrigger id="new_pagination_option" className="w-40">
                                    <SelectValue placeholder="Select rows" />
                                </SelectTrigger>

                                <SelectContent>
                                    {availablePresets.map((option) => (
                                        <SelectItem key={option} value={String(option)}>
                                            {option} rows
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="button" variant="outline" onClick={addOption} disabled={!newOption} className="gap-2">
                            <span className="text-lg leading-none">+</span>
                            Add Option
                        </Button>
                    </div>
                </div>

                <div className="max-w-sm space-y-2">
                    <FormSelect
                        id="pagination_default_per_page"
                        label="Default Rows Per Page"
                        value={data.pagination_default_per_page}
                        onChange={(val) => val && setData('pagination_default_per_page', Number(val))}
                        options={options.map((option) => ({ value: String(option), label: `${option} rows` }))}
                        error={errors.pagination_default_per_page}
                        required
                    />
                </div>

                <ToggleRow
                    id="pagination_allow_all"
                    label='Allow "Show All"'
                    description="Allow users to display all rows at once in large tables."
                    checked={data.pagination_allow_all}
                    onCheckedChange={(checked) => setData('pagination_allow_all', checked)}
                />
            </FormSection>
        </SettingsTab>
    );
}
