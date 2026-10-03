import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import InputError from '@/components/input-error';
import MoneyInput from '@/components/shared/money-input';
import PageHeader from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useTranslation } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { today } from '@/lib/format-date';
import { type BreadcrumbItem } from '@/types';
import { type Account, type ServiceableSaleItem } from '@/types/models';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Calendar, ChevronLeft, Wrench, Search, Save, X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface ServiceRequestsCreateProps {
    query: string;
    items: ServiceableSaleItem[];
    staff: { id: number; name: string }[];
    accounts: Account[];
}

export default function ServiceRequestsCreate({ query, items, staff, accounts }: ServiceRequestsCreateProps) {
    const money = useMoneyFormat();
    const { t } = useTranslation();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('serviceRequests', 'title'), href: '/service-requests' },
        { title: t('common', 'add'), href: '/service-requests/create' },
    ];
    const [search, setSearch] = useState(query);
    const [selected, setSelected] = useState<ServiceableSaleItem | null>(null);

    const form = useForm({
        sale_item_id: 0,
        request_date: today(),
        service_date: today(),
        staff_id: null as number | null,
        account_id: null as number | null,
        charge_amount: 0,
        note: '',
    });

    const runSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('service-requests.create'), { q: search }, { preserveState: true, replace: true });
    };

    const staffOptions = staff.map((member) => ({ value: String(member.id), label: member.name }));
    const accountOptions = accounts.map((account) => ({ value: String(account.id), label: `${account.name} — ${money(account.current_balance)}` }));

    const selectItem = (item: ServiceableSaleItem) => {
        setSelected(item);
        form.setData((data) => ({ ...data, sale_item_id: item.id }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            account_id: selected?.is_next_free ? null : data.account_id,
            charge_amount: selected?.is_next_free ? 0 : data.charge_amount,
        }));

        form.post(route('service-requests.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('serviceRequests', 'add')} />

            <div className="space-y-6 px-4 py-6">
                <PageHeader
                    icon={Wrench}
                    iconClassName="bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20 dark:text-orange-400"
                    title={t('serviceRequests', 'add')}
                    description={t('serviceRequests', 'add_description')}
                    actions={
                        <Button variant="outline" asChild className="gap-1.5">
                            <Link href={route('service-requests.index')}>
                                <ChevronLeft className="size-4" />
                                Back to service requests
                            </Link>
                        </Button>
                    }
                />

                <form onSubmit={runSearch} className="flex max-w-md gap-2">
                    <FormInput
                        id="search"
                        placeholder={t('serviceRequests', 'search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1"
                        icon={Search}
                    />
                    <Button type="submit" variant="outline" className="gap-1.5">
                        <Search className="size-4" />
                        {t('serviceRequests', 'search')}
                    </Button>
                </form>

                {!selected && (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">{t('serviceRequests', 'invoice')}</th>
                                    <th className="px-4 py-2 text-left font-medium">{t('serviceRequests', 'customer')}</th>
                                    <th className="px-4 py-2 text-left font-medium">{t('serviceRequests', 'product')}</th>
                                    <th className="px-4 py-2 text-left font-medium">{t('serviceRequests', 'next_service')}</th>
                                    <th className="px-4 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-muted-foreground px-4 py-6 text-center">
                                            {query ? t('serviceRequests', 'no_results') : t('serviceRequests', 'start_searching')}
                                        </td>
                                    </tr>
                                )}
                                {items.map((item) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{item.invoice_no}</td>
                                        <td className="px-4 py-2">{item.customer.name}</td>
                                        <td className="px-4 py-2">
                                            {item.product.name} <span className="text-muted-foreground">({item.product.sku})</span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge variant={item.is_next_free ? 'secondary' : 'outline'}>
                                                {item.is_next_free ? t('serviceRequests', 'free') : t('serviceRequests', 'paid')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <Button type="button" size="sm" onClick={() => selectItem(item)}>
                                                {t('serviceRequests', 'select')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selected && (
                    <Card className="max-w-xl overflow-hidden shadow-xs">
                        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-4 py-3">
                            <div>
                                <CardTitle className="text-base font-semibold">{selected.product.name}</CardTitle>
                                <p className="text-muted-foreground text-xs">
                                    {selected.product.sku} · {selected.invoice_no} — {selected.customer.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={selected.is_next_free ? 'secondary' : 'outline'}>
                                    {selected.is_next_free ? t('serviceRequests', 'free') : t('serviceRequests', 'paid')}
                                </Badge>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                                    {t('serviceRequests', 'choose_different_item')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormInput
                                        id="request_date"
                                        label={t('serviceRequests', 'request_date')}
                                        type="date"
                                        value={form.data.request_date}
                                        onChange={(e) => form.setData('request_date', e.target.value)}
                                        error={form.errors.request_date}
                                        icon={Calendar}
                                        required
                                    />

                                    <FormInput
                                        id="service_date"
                                        label={t('serviceRequests', 'service_date')}
                                        type="date"
                                        value={form.data.service_date}
                                        onChange={(e) => form.setData('service_date', e.target.value)}
                                        error={form.errors.service_date}
                                        icon={Calendar}
                                    />
                                </div>

                                <FormSelect
                                    id="staff_id"
                                    label={t('serviceRequests', 'technician')}
                                    value={form.data.staff_id}
                                    onChange={(val) => form.setData('staff_id', val ? Number(val) : null)}
                                    options={staffOptions}
                                    placeholder={t('serviceRequests', 'none')}
                                    allowNone
                                    noneLabel={t('serviceRequests', 'none')}
                                    error={form.errors.staff_id}
                                />

                                {!selected.is_next_free && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid min-w-0 content-start gap-2">
                                            <Label htmlFor="charge_amount" required>{t('serviceRequests', 'charge_amount')}</Label>
                                            <MoneyInput
                                                id="charge_amount"
                                                value={form.data.charge_amount}
                                                onChange={(e) => form.setData('charge_amount', Number(e.target.value))}
                                                required
                                            />
                                            <InputError message={form.errors.charge_amount} />
                                        </div>

                                        <FormSelect
                                            id="account_id"
                                            label={t('serviceRequests', 'account')}
                                            value={form.data.account_id}
                                            onChange={(val) => val && form.setData('account_id', Number(val))}
                                            options={accountOptions}
                                            placeholder={t('serviceRequests', 'select_account')}
                                            error={form.errors.account_id}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="grid min-w-0 content-start gap-2">
                                    <Label htmlFor="note">{t('serviceRequests', 'note')}</Label>
                                    <Textarea id="note" placeholder="Add a note (optional)" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} rows={2} />
                                    <InputError message={form.errors.note} />
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t pt-3">
                                    <Button type="button" variant="ghost" onClick={() => setSelected(null)} className="gap-1.5">
                                        <X className="size-4" />
                                        {t('common', 'cancel')}
                                    </Button>
                                    <Button type="submit" disabled={form.processing} className="gap-1.5">
                                        <Save className="size-4" />
                                        {form.processing ? t('common', 'saving') : t('serviceRequests', 'add_button')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
