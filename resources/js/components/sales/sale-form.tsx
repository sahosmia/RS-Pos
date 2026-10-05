import QuickAddContactModal from '@/components/contacts/quick-add-contact-modal';
import DiscountModal, { discountAmountFor } from '@/components/sales/discount-modal';
import FinancingModal from '@/components/sales/financing-modal';
import { CartSheet } from '@/components/sales/form/cart-sheet';
import { CustomerSection } from '@/components/sales/form/customer-section';
import { MobileTotalBar } from '@/components/sales/form/mobile-total-bar';
import { PaymentSection } from '@/components/sales/form/payment-section';
import { ProductLinesSection } from '@/components/sales/form/product-lines-section';
import { round2, type SaleFormData, saleTotals, startingItems } from '@/components/sales/form/sale-form-utils';
import { useSaleCart } from '@/components/sales/form/use-sale-cart';
import { useSaleShortcuts } from '@/components/sales/form/use-sale-shortcuts';
import { useSaleSubmit } from '@/components/sales/form/use-sale-submit';
import { type PaymentRow } from '@/components/shared/account-payment-rows';
import { type ProductOption } from '@/components/shared/product-search-input';
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
export default function SaleForm({ mode, sale, initialCustomer, products, accounts, initialProductId }: SaleFormProps) {
    const { shop } = usePage<SharedData>().props;
    const money = useMoneyFormat();
    const isMobile = useIsMobile();
    const searchRef = useRef<HTMLInputElement>(null);
    const paymentSectionRef = useRef<HTMLDivElement>(null);

    const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [historical, setHistorical] = useState(false);
    const [invoiceDiscountOpen, setInvoiceDiscountOpen] = useState(false);
    const [financingModalOpen, setFinancingModalOpen] = useState(false);

    const form = useForm<SaleFormData>({
        customer_id: sale?.customer_id ?? initialCustomer?.id ?? 0,
        sale_date: sale?.sale_date ?? today(),
        discount_type: sale?.discount_type ?? null,
        discount_value: sale?.discount_value ?? 0,
        valid_until: sale?.valid_until ?? '',
        financing_type: sale?.financing_type ?? 'one_time',
        installment_count: sale?.installment_count ?? null,
        items: sale?.items ?? startingItems(products, initialProductId),
    });

    // A half-built cart is easy to lose with one stray sidebar click, Cancel or Esc.
    const { UnsavedChangesModal } = useUnsavedChangesWarning(form.isDirty, form.processing);

    const cart = useSaleCart({ form, products });
    const totals = saleTotals(form.data.items, form.data.discount_type, form.data.discount_value);
    const { submit, submitAs, submitWithWhatsapp } = useSaleSubmit({
        form,
        mode,
        sale,
        customer,
        payments,
        historical,
        productById: cart.productById,
        totals,
        money,
    });

    useSaleShortcuts({ searchRef, paymentRef: paymentSectionRef, onConfirm: () => submitAs('confirmed') });

    const discountedOriginalPrice = cart.discountedItem?.original_price ?? 0;

    return (
        <form
            onSubmit={submit}
            className={cn('grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]', isMobile && form.data.items.length > 0 && 'pb-24')}
        >
            <div className="bg-card space-y-4 rounded-xl border p-4">
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
                accounts={accounts}
                payments={payments}
                onPaymentsChange={setPayments}
                totals={totals}
                historical={historical}
                onHistoricalChange={setHistorical}
                hasCustomer={customer !== null}
                sectionRef={paymentSectionRef}
                onEditFinancing={() => setFinancingModalOpen(true)}
                onEditInvoiceDiscount={() => setInvoiceDiscountOpen(true)}
                onSave={submitAs}
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
                    initialFinancingType={form.data.financing_type}
                    initialInstallmentCount={form.data.installment_count}
                    installmentCountError={form.errors.installment_count}
                    onApply={(financingType, installmentCount) => {
                        form.setData('financing_type', financingType);
                        form.setData('installment_count', installmentCount);
                    }}
                />
            )}

            <UnsavedChangesModal />
        </form>
    );
}
