import { getPurchaseReturnActions } from '@/components/purchases/purchase-return-actions';
import ReturnsListPage, { type ReturnFilters } from '@/components/returns/returns-list-page';
import { type Paginated, type PurchaseReturnListItem } from '@/types/models';

interface PurchaseReturnsIndexProps {
    returns: Paginated<PurchaseReturnListItem>;
    filters: ReturnFilters;
}

export default function PurchaseReturnsIndex({ returns, filters }: PurchaseReturnsIndexProps) {
    return (
        <ReturnsListPage
            routeBase="purchase-returns"
            title="Purchase Returns"
            description="নির্দিষ্ট Purchase-এর detail page থেকে নতুন return তৈরি করা যায়"
            parentLabel="Purchase"
            partyLabel="Supplier"
            exportKeys={{ parent: 'invoice_no', party: 'supplier' }}
            emptyDescription="একটা received purchase-এর detail page থেকে Return বাটনে ক্লিক করুন"
            returns={returns}
            filters={filters}
            toRow={(row) => ({
                id: row.id,
                return_date: row.return_date,
                total_amount: row.total_amount,
                added_by: row.added_by,
                parentNo: row.purchase.invoice_no,
                party: row.supplier,
            })}
            getActions={getPurchaseReturnActions}
        />
    );
}
