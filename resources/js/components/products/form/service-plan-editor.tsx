import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import { type ProductFormApi } from '@/components/products/form/types';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { type ServicePlanPeriod } from '@/types/models';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

/** The free-service schedule of an installable product: a list of (duration in months, free visits) rows. */
export function ServicePlanEditor({ form }: { form: ProductFormApi }) {
    const { t } = useTranslation();
    const periods = form.data.service_plan;

    const addPeriod = () => form.setData('service_plan', [...periods, { period_months: 12, free_quota: 0 }]);

    const updatePeriod = (index: number, changes: Partial<ServicePlanPeriod>) =>
        form.setData(
            'service_plan',
            periods.map((period, i) => (i === index ? { ...period, ...changes } : period)),
        );

    const removePeriod = (index: number) =>
        form.setData(
            'service_plan',
            periods.filter((_, i) => i !== index),
        );

    return (
        <div className="mt-4 overflow-hidden rounded-lg border">
            <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-violet-500" />
                    <div>
                        <div className="text-sm font-medium">{t('productForm', 'service_plan')}</div>
                        <p className="text-muted-foreground text-xs">{t('productForm', 'service_plan_description')}</p>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPeriod} className="gap-1.5">
                    <Plus className="size-3.5" />
                    {t('productForm', 'add_period')}
                </Button>
            </div>

            <div className="p-3">
                {periods.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-6 text-center">
                        <Sparkles className="text-muted-foreground size-5" />
                        <p className="text-muted-foreground text-xs">{t('productForm', 'no_periods_yet')}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Header row (desktop only) */}
                        <div className="text-muted-foreground hidden grid-cols-[1fr_1fr_auto] gap-3 px-1 text-[10px] font-semibold tracking-wide uppercase sm:grid">
                            <span>{t('productForm', 'duration_months')}</span>
                            <span>{t('productForm', 'free_quota')}</span>
                            <span className="w-9" />
                        </div>

                        {periods.map((period, index) => (
                            <div
                                key={index}
                                className="bg-card grid grid-cols-1 gap-2 rounded-md border p-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-3 sm:border-0 sm:bg-transparent sm:p-1"
                            >
                                <FormInput
                                    id={`service-period-months-${index}`}
                                    label={`#${index + 1} · ${t('productForm', 'duration_months')}`}
                                    type="number"
                                    min={1}
                                    value={period.period_months}
                                    onChange={(e) => updatePeriod(index, { period_months: Number(e.target.value) })}
                                    placeholder="12"
                                />
                                <FormInput
                                    id={`service-period-free-quota-${index}`}
                                    label={t('productForm', 'free_quota')}
                                    type="number"
                                    min={0}
                                    value={period.free_quota}
                                    onChange={(e) => updatePeriod(index, { free_quota: Number(e.target.value) })}
                                    placeholder="0"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive size-9 shrink-0 sm:mt-6"
                                    onClick={() => removePeriod(index)}
                                    aria-label="Remove period"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                <InputError message={form.errors.service_plan} />
            </div>
        </div>
    );
}
