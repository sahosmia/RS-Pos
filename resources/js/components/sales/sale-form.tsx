import QuickAddContactModal from '@/components/contacts/quick-add-contact-modal';
import DiscountModal, { discountAmountFor } from '@/components/sales/discount-modal';
import FinancingModal from '@/components/sales/financing-modal';
import { CartSheet } from '@/components/sales/form/cart-sheet';
import { CustomerSection } from '@/components/sales/form/customer-section';
import { MobileTotalBar } from '@/components/sales/form/mobile-total-bar';
import { PaymentSection } from '@/components/sales/form/payment-section';
import { ProductLinesSection } from '@/components/sales/form/product-lines-section';
import { financedGoodsFor, round2, type SaleFormData, saleTotals, startingItems } from '@/components/sales/form/sale-form-utils';
import { useSaleCart } from '@/components/sales/form/use-sale-cart';
import { useSaleShortcuts } from '@/components/sales/form/use-sale-shortcuts';
import { useSaleSubmit } from '@/components/sales/form/use-sale-submit';
import { type PaymentRow } from '@/components/shared/account-payment-rows';
import { DraftBanner } from '@/components/shared/draft-banner';
import { type ProductOption } from '@/components/shared/product-search-input';
import { useEmiPreview } from '@/hooks/use-emi-preview';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMoneyFormat } from '@/hooks/use-money-format';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { today } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { type Account, type CustomerOption, type SaleFormDetail } from '@/types/models';
import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

interface SaleFormProps {
    mode: 'create' | 'edit';
    /** Confirming a Sales Order: the order opens in this form, anything can be changed, and Confirm makes the real sale from it. */
    fulfilOrder?: { id: number; order_no: string; advance_paid: number };
    sale?: SaleFormDetail;
    initialCustomer: CustomerOption | null;
    products: ProductOption[];
    accounts: Account[];
    /** Create only: a product to start the cart with (from the product list's "Add Sale" action). */
    initialProductId?: number | null;
}

/**
 * Create / edit a sale. This component owns the form state and wires the pieces together: the cart logic lives in
 * `useSaleCart`, saving in `useSaleSubmit`, keyboard shortcuts in `useSaleShortcuts`, and each card of the page
 * (customer, product lines, payment) plus the mobile sheet is its own component under `./form/`.
 */
export default function SaleForm({ mode, fulfilOrder, sale, initialCustomer, products, accounts, initialProductId }: SaleFormProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const isMobile = useIsMobile();
    const searchRef = useRef<HTMLInputElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);

    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const amending = sale?.amending === true;
    const [payments, setPayments] = useState<PaymentRow[]>(sale?.payments ?? []);
    const [historical, setHistorical] = useState(false);
    const [invoiceDiscountOpen, setInvoiceDiscountOpen] = useState(false);
    const [financingModalOpen, setFinancingModalOpen] = useState(false);

    const form = useForm<SaleFormData>({
        customer_id: sale?.customer_id ?? initialCustomer?.id ?? 0,
        sale_date: sale?.sale_date ?? today(),
        discount_type: sale?.discount_type ?? null,
        discount_value: sale?.discount_value ?? 0,
        valid_until: sale?.valid_until ?? '',
        expected_delivery_date: '',
        financing_type: sale?.financing_type ?? 'one_time',
        installment_count: sale?.installment_count ?? null,
        emi_interest_method: sale?.emi_interest_method ?? 'none',
        emi_annual_rate: sale?.emi_annual_rate ?? 0,
        emi_tenure_value: sale?.emi_tenure_value ?? null,
        emi_tenure_unit: sale?.emi_tenure_unit ?? 'months',
        emi_frequency: sale?.emi_frequency ?? 'monthly',
        emi_installation_upfront: sale?.emi_installation_upfront ?? false,
        amend_reason: '',
        items: sale?.items ?? startingItems(products, initialProductId),
    });

    // A half-built cart is easy to lose with one stray sidebar click, Cancel or Esc.
    const { UnsavedChangesModal } = useUnsavedChangesWarning(form.isDirty, form.processing);

    const cart = useSaleCart({ form, products });
    const totals = saleTotals(form.data.items, form.data.discount_type, form.data.discount_value);

    // The down payment is whatever the cashier has entered in the payment rows; the rest is financed.
    const receivedNow = round2(payments.reduce((sum, row) => sum + (row.amount > 0 && row.account_id ? row.amount : 0), 0));
    /**
     * Puts the down payment chosen in the Financing dialog into the sale's payment rows: the first row (using the
     * default account if there is none yet) becomes the down payment, so the cashier doesn't type it twice.
     * A split payment across several accounts is collapsed to that first row, since the dialog sets one total.
     */
    const applyDownPayment = (down: number) => {
        const account = accounts.find((row) => row.is_default) ?? accounts[0];

        setPayments((rows) => {
            if (rows.length === 0) {
                return account && down > 0 ? [{ account_id: account.id, amount: down }] : [];
            }

            return [{ ...rows[0], amount: down }];
        });
    };

    // Whatever is paid at the sale is a down payment on the goods. Installation is never financed: it stays a separate
    // due, unless the cashier chose to collect it up front, in which case the payment covers it first.
    const financedGoods = financedGoodsFor(form.data.items, totals.discountAmount, (item) => item.emi_financed !== false);
    const cashGoods = round2(totals.subtotal - totals.discountAmount - financedGoods);
    // Products not on EMI are paid now, so the payment covers them first (then the installation, if collected up front);
    // only what is left over is a down payment on the EMI products.
    const coveredFirst = cashGoods + (form.data.emi_installation_upfront ? totals.installation : 0);
    const downPayment = Math.max(0, round2(receivedNow - coveredFirst));
    const emiOn = shop.emi_module_enabled && form.data.financing_type === 'emi';
    // Live quote for the summary beside the cart (the dialog runs its own while it is open).
    const { preview: emiPreview, error: emiError } = useEmiPreview(
        emiOn && form.data.emi_tenure_value
            ? {
                  saleTotal: totals.total,
                  installation: totals.installation,
                  financedGoods,
                  downPayment,
                  method: form.data.emi_interest_method,
                  annualRate: form.data.emi_annual_rate,
                  tenureValue: form.data.emi_tenure_value,
                  tenureUnit: form.data.emi_tenure_unit,
                  frequency: form.data.emi_frequency,
                  saleDate: form.data.sale_date,
              }
            : null,
    );
    // A new sale is backed up in the browser as it is built, and offered back if the page is lost.
    const draft = useFormDraft({
        name: 'sale-create',
        enabled: mode === 'create' && !fulfilOrder,
        hasContent: form.data.items.length > 0,
        state: { data: form.data, customer },
        onRestore: ({ data, customer: savedCustomer }) => {
            form.setData(data);
            setCustomer(savedCustomer);
        },
    });
    const { submit, submitAs, submitAsOrder, submitWithWhatsapp } = useSaleSubmit({
        form,
        mode,
        fulfilOrderId: fulfilOrder?.id,
        sale,
        customer,
        payments,
        historical,
        productById: cart.productById,
        totals,
        money,
        onSaved: draft.clear,
    });

    useSaleShortcuts({ searchRef, paymentRef: paymentSectionRef, onConfirm: () => submitAs('confirmed') });

    const discountedOriginalPrice = cart.discountedItem?.original_price ?? 0;

    return (
        <form
            onSubmit={submit}
            className={cn('grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]', isMobile && form.data.items.length > 0 && 'pb-24')}
        >
            {draft.offered && <DraftBanner savedAt={draft.offered.savedAt} what="sale" onRestore={draft.restore} onDiscard={draft.discard} />}

            <div className="bg-card rounded-brand-card space-y-5 p-4 shadow-[var(--brand-card-shadow-elevated)] sm:p-5">
                <CustomerSection
                    form={form}
                    customer={customer}
                    onCustomerChange={setCustomer}
                    onQuickAdd={() => setQuickAddOpen(true)}
                    onAddRecentSale={cart.addRecentSale}
                />

                <ProductLinesSection
                    form={form}
                    products={products}
                    productById={cart.productById}
                    searchRef={searchRef}
                    onAddProduct={cart.addProduct}
                    onPickProductForSheet={cart.openSheetForNewProduct}
                    onEditLine={cart.openSheetForEdit}
                    onUpdateLine={cart.updateItem}
                    onRemoveLine={cart.removeItem}
                    onEditLineDiscount={cart.setItemDiscountIndex}
                />
            </div>

            <PaymentSection
                form={form}
                fulfilOrder={fulfilOrder}
                accounts={accounts}
                payments={payments}
                onPaymentsChange={setPayments}
                totals={totals}
                historical={historical}
                onHistoricalChange={setHistorical}
                hasCustomer={customer !== null}
                emiPreview={emiOn ? emiPreview : null}
                emiError={emiOn ? emiError : null}
                amending={amending}
                sectionRef={paymentSectionRef}
                onEditFinancing={() => setFinancingModalOpen(true)}
                onEditInvoiceDiscount={() => setInvoiceDiscountOpen(true)}
                onSave={submitAs}
                onSaveAsOrder={submitAsOrder}
                onSaveAndWhatsapp={submitWithWhatsapp}
            />

            {isMobile && form.data.items.length > 0 && (
                <MobileTotalBar total={totals.total} processing={form.processing} onComplete={() => submitAs('confirmed')} />
            )}

            <QuickAddContactModal
                type="customer"
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                onCreated={(created) => {
                    setCustomer(created);
                    form.setData('customer_id', created.id);
                }}
            />

            <CartSheet draft={cart.cartSheet} onChange={cart.setCartSheet} onClose={() => cart.setCartSheet(null)} onConfirm={cart.confirmSheet} />

            <DiscountModal
                open={cart.itemDiscountIndex !== null}
                onOpenChange={(open) => !open && cart.setItemDiscountIndex(null)}
                title="Item Discount"
                baseAmount={discountedOriginalPrice}
                initialType={cart.discountedItem?.discount_type ?? null}
                initialValue={cart.discountedItem?.discount_value ?? 0}
                onApply={(type, value) => {
                    if (cart.itemDiscountIndex === null) return;
                    cart.updateItem(cart.itemDiscountIndex, {
                        discount_type: type,
                        discount_value: value,
                        unit_price: round2(discountedOriginalPrice - discountAmountFor(discountedOriginalPrice, type, value)),
                    });
                }}
            />

            <DiscountModal
                open={invoiceDiscountOpen}
                onOpenChange={setInvoiceDiscountOpen}
                title="Invoice Discount"
                baseAmount={totals.subtotal}
                initialType={form.data.discount_type}
                initialValue={form.data.discount_value}
                onApply={(type, value) => {
                    form.setData('discount_type', type);
                    form.setData('discount_value', value);
                }}
            />

            {shop.emi_module_enabled && (
                <FinancingModal
                    open={financingModalOpen}
                    onOpenChange={setFinancingModalOpen}
                    initial={{
                        financing_type: form.data.financing_type,
                        emi_interest_method: form.data.emi_interest_method,
                        emi_annual_rate: form.data.emi_annual_rate,
                        emi_tenure_value: form.data.emi_tenure_value,
                        emi_tenure_unit: form.data.emi_tenure_unit,
                        emi_frequency: form.data.emi_frequency,
                        emi_installation_upfront: form.data.emi_installation_upfront,
                    }}
                    saleTotal={totals.total}
                    installation={totals.installation}
                    items={form.data.items}
                    productName={(id) => cart.productById(id)?.name ?? `Product #${id}`}
                    discountAmount={totals.discountAmount}
                    downPayment={downPayment}
                    saleDate={form.data.sale_date}
                    error={form.errors.installment_count ?? form.errors.emi_tenure_value ?? form.errors.emi_annual_rate}
                    onApply={(terms, installmentCount, payNow, financedLines) => {
                        form.setData((data) => ({
                            ...data,
                            ...terms,
                            installment_count: installmentCount,
                            items:
                                terms.financing_type === 'emi'
                                    ? data.items.map((item, index) => ({ ...item, emi_financed: financedLines[index] ?? true }))
                                    : data.items,
                        }));

                        if (terms.financing_type === 'emi') {
                            applyDownPayment(payNow);
                        }
                    }}
                />
            )}

            <UnsavedChangesModal />
        </form>
    );
}
