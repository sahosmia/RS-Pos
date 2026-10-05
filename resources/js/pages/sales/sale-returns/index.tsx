import ReturnsListPage, { type ReturnFilters } from '@/components/returns/returns-list-page';
import { getSaleReturnActions } from '@/components/sales/sale-return-actions';
import { type Paginated, type SaleReturnListItem } from '@/types/models';

interface SaleReturnsIndexProps {
    returns: Paginated<SaleReturnListItem>;
    filters: ReturnFilters;
}

export default function SaleReturnsIndex({ returns, filters }: SaleReturnsIndexProps) {
    return (
        <ReturnsListPage
            routeBase="sale-returns"
            title="Sale Returns"
            description="নির্দিষ্ট Sale-এর detail page থেকে নতুন return তৈরি করা যায়"
            parentLabel="Sale"
            partyLabel="Customer"
            exportKeys={{ parent: 'invoice_no', party: 'customer' }}
            emptyDescription="একটা confirmed sale-এর detail page থেকে Return বাটনে ক্লিক করুন"
            returns={returns}
            filters={filters}
            toRow={(row) => ({
                id: row.id,
                return_date: row.return_date,
                total_amount: row.total_amount,
                added_by: row.added_by,
                parentNo: row.sale.invoice_no,
                party: row.customer,
            })}
            getActions={getSaleReturnActions}
        />
    );
}
