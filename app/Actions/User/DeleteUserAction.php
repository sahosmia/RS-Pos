<?php

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class DeleteUserAction
{
    /**
     * Every table with a `created_by` FK to `users` — all `nullOnDelete()` at
     * the DB level, which would otherwise silently blank out who created each
     * of those records the moment the user is deleted. Checked explicitly
     * instead, the same way `DeleteContactAction` blocks a contact with
     * ledger history, so "deactivate instead of delete" is enforced rather
     * than just losing the audit trail quietly.
     *
     * @var list<string>
     */
    private const TABLES_WITH_CREATED_BY = [
        'accounts', 'account_transactions', 'fund_transfers', 'cash_book_entries',
        'products', 'stock_movements', 'contacts', 'contact_ledger',
        'purchases', 'sales', 'journal_entries', 'sale_returns', 'purchase_returns',
        'sales_orders', 'expenses', 'assets', 'asset_transactions',
        'company_loans', 'loan_transactions', 'investors', 'investor_transactions',
        'other_liabilities', 'other_liability_transactions', 'staff', 'staff_ledger',
        'service_requests', 'warranty_claims', 'message_logs', 'campaigns',
    ];

    public function blockingReason(User $user): ?string
    {
        return $this->hasRecordedActivity($user)
            ? 'This user has recorded activity in the system — deactivate the account instead of deleting it.'
            : null;
    }

    public function execute(User $user): void
    {
        $user->delete();
    }

    private function hasRecordedActivity(User $user): bool
    {
        foreach (self::TABLES_WITH_CREATED_BY as $table) {
            if (DB::table($table)->where('created_by', $user->id)->exists()) {
                return true;
            }
        }

        return false;
    }
}
