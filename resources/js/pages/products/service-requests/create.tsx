import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import PageHeader from '@/components/shared/page-header';
import SearchableSelect from '@/components/shared/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { formatDate, today } from '@/lib/format-date';
import { pageContainer } from '@/lib/page-container';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import {
    type Account,
    type ServiceLookupInvoice,
    type ServiceLookupItem,
    type ServiceRequestTypeValue,
    type ServiceStaffOption,
} from '@/types/models';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, ChevronLeft, Hammer, Save, Wrench } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

interface ServiceRequestsCreateProps {
    staff: ServiceStaffOption[];
    accounts: Account[];
}

/** A numbered block of the one form: what the person is doing in this step. */
function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
                <span className="bg-brand-primary/10 text-brand-primary-text flex size-5 items-center justify-center rounded-full text-xs">
                    {number}
                </span>
                {title}
            </h3>
            {children}
        </section>
    );
}

/** What the next visit of this item will cost, in words. */
function visitNote(item: ServiceLookupItem, type: ServiceRequestTypeValue): { tone: 'info' | 'warning'; text: string } {
    if (type === 'installation') {
        return {
            tone: 'info',
            text: 'Installation does not use up a free visit. Enter a charge only if you are billing it now; the invoice may already include it.',
        };
    }

    if (item.is_next_free) {
        return {
            tone: 'info',
            text: `This visit is free: ${item.free_left} free ${item.free_left === 1 ? 'visit' : 'visits'} left in the current service period.`,
        };
    }

    return {
        tone: 'warning',
        text: item.has_service_plan
            ? 'This visit is paid: the free visits of the current period are used up (or the service plan has ended). Enter the charge.'
            : 'This item has no service plan, so every visit is paid. Enter the charge.',
    };
}

export default function ServiceRequestsCreate({ staff, accounts }: ServiceRequestsCreateProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('serviceRequests', 'title'), href: '/service-requests' },
        { title: t('common', 'add'), href: '/service-requests/create' },
    ];

    const defaultAccount = accounts.find((account) => account.is_default) ?? accounts[0];

    const [invoice, setInvoice] = useState<ServiceLookupInvoice | null>(null);
    const [alreadyDone, setAlreadyDone] = useState(false);

    const form = useForm({
        type: 'service' as ServiceRequestTypeValue,
        sale_item_id: 0,
        request_date: today(),
        service_date: today(),
        staff_id: null as number | null,
        account_id: (defaultAccount?.id ?? null) as number | null,
        charge_amount: 0,
        note: '',
    });

    const item = invoice?.items.find((candidate) => candidate.id === form.data.sale_item_id) ?? null;
    const isInstallation = form.data.type === 'installation';
    // A paid service must be charged; an installation may be charged; a free service never is.
    const chargeShown = item !== null && (isInstallation || !item.is_next_free);
    const accountShown = chargeShown && (!isInstallation || form.data.charge_amount > 0);

    const chooseInvoice = (next: ServiceLookupInvoice | null) => {
        setInvoice(next);
        // One item on the invoice: nothing to choose, so it is picked for the person.
        form.setData((data) => ({ ...data, sale_item_id: next?.items.length === 1 ? next.items[0].id : 0, type: 'service', charge_amount: 0 }));
    };

    const chooseItem = (next: ServiceLookupItem) => {
        form.setData((data) => ({ ...data, sale_item_id: next.id, type: 'service', charge_amount: 0 }));
    };

    const staffOptions = staff.map((member) => ({
        value: String(member.id),
        label: member.designation ? `${member.name} — ${member.designation}` : member.name,
    }));
    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: `${account.name} — ${money(account.current_balance)}` }));

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            status: alreadyDone ? 'completed' : 'pending',
            charge_amount: chargeShown ? data.charge_amount : 0,
            account_id: accountShown ? data.account_id : null,
        }));

        form.post(route('service-requests.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('serviceRequests', 'add')} />

            <div className={pageContainer.narrow}>
                <PageHeader
                    icon={Wrench}
                    iconClassName="bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20 dark:text-orange-400"
                    title={t('serviceRequests', 'add')}
                    description="Find the invoice, pick the item, and fill in the rest."
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('service-requests.index')}>
                                <ChevronLeft className="size-4" />
                                Back to service requests
                            </Link>
                        </Button>
                    }
                />

                <Card className="max-w-2xl overflow-hidden shadow-xs">
                    <CardContent className="p-4 sm:p-5">
                        <form onSubmit={submit} className="space-y-6">
                            <Step number={1} title="Invoice">
                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="invoice">Search by invoice number, customer name or phone</Label>
                                    <SearchableSelect<ServiceLookupInvoice>
                                        id="invoice"
                                        value={invoice}
                                        onChange={chooseInvoice}
                                        getLabel={(option) => option.invoice_no}
                                        getSublabel={(option) =>
                                            `${option.customer.name}${option.customer.phone ? ` · ${option.customer.phone}` : ''}`
                                        }
                                        searchUrl={route('service-requests.lookup')}
                                        placeholder="Type an invoice no, a name or a phone number"
                                        clearable
                                    />
                                    <InputError message={form.errors.sale_item_id} />
                                </div>

                                {invoice && (
                                    <p className="text-muted-foreground text-xs">
                                        {invoice.customer.name}
                                        {invoice.customer.phone && ` · ${invoice.customer.phone}`} · sold {formatDate(invoice.sale_date)}
                                    </p>
                                )}
                            </Step>

                            {invoice && (
                                <Step number={2} title={invoice.items.length > 1 ? 'Which item?' : 'Item'}>
                                    <div className="grid gap-2">
                                        {invoice.items.map((candidate) => {
                                            const active = candidate.id === form.data.sale_item_id;

                                            return (
                                                <button
                                                    key={candidate.id}
                                                    type="button"
                                                    onClick={() => chooseItem(candidate)}
                                                    aria-pressed={active}
                                                    className={cn(
                                                        'rounded-brand-control flex flex-wrap items-center justify-between gap-2 border px-3.5 py-2.5 text-left text-sm transition-colors',
                                                        active ? 'border-brand-primary bg-brand-primary/[0.06]' : 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-medium">{candidate.product.name}</span>
                                                        <span className="text-muted-foreground block text-xs">
                                                            {candidate.product.sku}
                                                            {candidate.warranty_expires_at
                                                                ? candidate.in_warranty
                                                                    ? ` · warranty until ${formatDate(candidate.warranty_expires_at)}`
                                                                    : ` · warranty ended ${formatDate(candidate.warranty_expires_at)}`
                                                                : ' · no warranty'}
                                                        </span>
                                                    </span>
                                                    <Badge variant={candidate.is_next_free ? 'success' : 'neutral'} size="sm">
                                                        {candidate.is_next_free ? `Free visit (${candidate.free_left} left)` : 'Paid visit'}
                                                    </Badge>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Step>
                            )}

                            {item && (
                                <>
                                    <Step number={3} title="What is it for?">
                                        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Request type">
                                            {(
                                                [
                                                    {
                                                        value: 'service',
                                                        label: 'Service visit',
                                                        hint: 'Repair or check-up after the sale',
                                                        icon: Wrench,
                                                        available: true,
                                                    },
                                                    {
                                                        value: 'installation',
                                                        label: 'Installation',
                                                        hint: item.has_installation_service
                                                            ? 'Fitting the product'
                                                            : 'This product has no installation service',
                                                        icon: Hammer,
                                                        available: item.has_installation_service,
                                                    },
                                                ] as const
                                            ).map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={form.data.type === option.value}
                                                    disabled={!option.available}
                                                    onClick={() => form.setData((data) => ({ ...data, type: option.value, charge_amount: 0 }))}
                                                    className={cn(
                                                        'rounded-brand-control flex items-start gap-2.5 border px-3.5 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                                        form.data.type === option.value
                                                            ? 'border-brand-primary bg-brand-primary/[0.06]'
                                                            : 'hover:bg-muted/40',
                                                    )}
                                                >
                                                    <option.icon className="mt-0.5 size-4 shrink-0" />
                                                    <span>
                                                        <span className="block font-medium">{option.label}</span>
                                                        <span className="text-muted-foreground block text-xs">{option.hint}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        <InputError message={form.errors.type} />

                                        <Alert variant={visitNote(item, form.data.type).tone}>
                                            <AlertDescription>{visitNote(item, form.data.type).text}</AlertDescription>
                                        </Alert>
                                    </Step>

                                    <Step number={4} title="Details">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormInput
                                                id="request_date"
                                                label="Request date"
                                                type="date"
                                                value={form.data.request_date}
                                                onChange={(event) => form.setData('request_date', event.target.value)}
                                                error={form.errors.request_date}
                                                icon={Calendar}
                                                required
                                            />
                                            <FormInput
                                                id="service_date"
                                                label={isInstallation ? 'Installation date' : 'Service date'}
                                                type="date"
                                                value={form.data.service_date}
                                                onChange={(event) => form.setData('service_date', event.target.value)}
                                                error={form.errors.service_date}
                                                icon={Calendar}
                                            />
                                        </div>

                                        <FormSelect
                                            id="staff_id"
                                            label="Technician"
                                            value={form.data.staff_id}
                                            onChange={(value) => form.setData('staff_id', value ? Number(value) : null)}
                                            options={staffOptions}
                                            placeholder={staff.length === 0 ? 'No active staff yet' : 'Choose who will do the job'}
                                            allowNone
                                            noneLabel="Not assigned yet"
                                            error={form.errors.staff_id}
                                            helperText={
                                                staff.length === 0
                                                    ? undefined
                                                    : 'People from the Staff menu who are still working. You can also assign one later.'
                                            }
                                        />
                                        {staff.length === 0 && (
                                            <p className="text-muted-foreground text-xs">
                                                There is no active staff member yet. Add your technician under{' '}
                                                <Link href={route('staff.index')} className="text-brand-primary-text underline underline-offset-2">
                                                    Staff
                                                </Link>
                                                , then pick them here (or assign later from the request list).
                                            </p>
                                        )}

                                        {chargeShown && (
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid min-w-0 content-start gap-2">
                                                    <Label htmlFor="charge_amount" required={!isInstallation}>
                                                        Charge
                                                    </Label>
                                                    <MoneyInput
                                                        id="charge_amount"
                                                        value={form.data.charge_amount}
                                                        onChange={(event) => form.setData('charge_amount', Number(event.target.value))}
                                                        required={!isInstallation}
                                                    />
                                                    <InputError message={form.errors.charge_amount} />
                                                </div>

                                                {accountShown && (
                                                    <FormSelect
                                                        id="account_id"
                                                        label="Paid into account"
                                                        value={form.data.account_id}
                                                        onChange={(value) => value && form.setData('account_id', Number(value))}
                                                        options={accountOptions}
                                                        placeholder="Select an account"
                                                        error={form.errors.account_id}
                                                        required
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className="grid min-w-0 content-start gap-2">
                                            <Label htmlFor="note">Note</Label>
                                            <Textarea
                                                id="note"
                                                placeholder="What is the problem? (optional)"
                                                value={form.data.note}
                                                onChange={(event) => form.setData('note', event.target.value)}
                                                rows={2}
                                            />
                                            <InputError message={form.errors.note} />
                                        </div>

                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox checked={alreadyDone} onCheckedChange={(checked) => setAlreadyDone(checked === true)} />
                                            The job is already done (save it as completed)
                                        </label>
                                    </Step>

                                    <div className="flex items-center justify-end gap-2 border-t pt-4">
                                        <Button type="button" variant="ghost" asChild>
                                            <Link href={route('service-requests.index')}>{t('common', 'cancel')}</Link>
                                        </Button>
                                        <Button type="submit" disabled={form.processing} className="gap-1.5">
                                            <Save className="size-4" />
                                            {form.processing ? t('common', 'saving') : t('serviceRequests', 'add_button')}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
