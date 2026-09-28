<?php

namespace App\Actions\Staff;

use App\Enums\AccountTransactionType;
use App\Enums\BalanceEffect;
use App\Enums\StaffTransactionNature;
use App\Models\Account;
use App\Models\Staff;
use App\Models\StaffLedger;
use App\Models\StaffTransactionType;
use App\Services\AccountService;
use App\Services\ChartOfAccountResolver;
use App\Services\JournalService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every staff_transaction_types row (default or admin-added) declares a
 * `nature` (see StaffTransactionNature) that decides the journal shape here
 * — the type's `name` only ever picks the account_transactions.type label
 * for the two default cash-moving types, never the accounting behavior
 * itself.
 */
class AddStaffTransactionAction
{
    public function __construct(
        private AccountService $accounts,
        private JournalService $journal,
        private ChartOfAccountResolver $chartOfAccounts,
    ) {}

    /**
     * @param  array{staff_transaction_type_id: int, amount: float|string, account_id?: int|string|null, note?: string|null}  $data
     */
    public function execute(Staff $staff, array $data): StaffLedger
    {
        $type = StaffTransactionType::findOrFail($data['staff_transaction_type_id']);
        $amount = round(abs((float) $data['amount']), 2);
        $note = $data['note'] ?? null;

        return DB::transaction(function () use ($staff, $type, $amount, $data, $note) {
            $staff = Staff::where('id', $staff->id)->lockForUpdate()->firstOrFail();
            $delta = $type->effect_on_balance === BalanceEffect::Increase ? $amount : -$amount;
            $balanceBefore = (float) $staff->balance;

            match ($type->nature) {
                StaffTransactionNature::Expense => $this->postExpense($staff, $amount),
                StaffTransactionNature::Settlement => $this->postSettlement($staff, $amount, $data),
                StaffTransactionNature::Advance => $this->postAdvance($staff, $amount, $data, $type),
                StaffTransactionNature::AdvanceReturn => $this->postAdvanceReturn($staff, $amount, $data),
                StaffTransactionNature::Adjustment => $this->postAdjustment($staff, $delta, $balanceBefore),
            };

            $ledgerEntry = $staff->ledgerEntries()->create([
                'staff_transaction_type_id' => $type->id,
                'amount' => $amount,
                'account_id' => $data['account_id'] ?? null,
                'note' => $note,
                'created_by' => Auth::id(),
            ]);

            $staff->increment('balance', $delta);

            return $ledgerEntry;
        });
    }

    /**
     * Salary Charge — pure accrual, no cash moves.
     */
    private function postExpense(Staff $staff, float $amount): void
    {
        $salaryExpense = $this->chartOfAccounts->code('5210');
        $staffPayable = $this->chartOfAccounts->code('2250');

        $this->journal->post(today(), "Salary charge: {$staff->name}", [
            ['chart_of_account_id' => $salaryExpense->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $staffPayable->id, 'debit' => 0, 'credit' => $amount],
        ], 'staff', $staff->id);
    }

    /**
     * Salary Payment — settles what Salary Charge accrued.
     *
     * @param  array{account_id?: int|string|null}  $data
     */
    private function postSettlement(Staff $staff, float $amount, array $data): void
    {
        $payableAmount = $staff->balance < 0 ? abs($staff->balance) : 0.0;
        if ($staff->balance >= 0 || $amount > ($payableAmount + 0.0001)) {
            throw ValidationException::withMessages([
                'amount' => ['Payment amount cannot exceed payable salary balance (৳'.number_format($payableAmount, 2).').'],
            ]);
        }

        $account = Account::findOrFail($data['account_id']);
        $this->accounts->record($account, AccountTransactionType::StaffSalaryPayment, -$amount, today(), 'staff', $staff->id);

        $staffPayable = $this->chartOfAccounts->code('2250');
        $this->journal->post(today(), "Salary payment: {$staff->name}", [
            ['chart_of_account_id' => $staffPayable->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'staff', $staff->id);
    }

    /**
     * Advance/Loan Given — cash out to the staff member, an asset (they
     * owe it back). The two default types share this same GL shape and
     * differ only in which account_transactions.type label reports them
     * under; a custom advance-nature type falls back to the generic label.
     *
     * @param  array{account_id?: int|string|null}  $data
     */
    private function postAdvance(Staff $staff, float $amount, array $data, StaffTransactionType $type): void
    {
        $account = Account::findOrFail($data['account_id']);
        $accountTransactionType = $type->name === 'Loan Given' ? AccountTransactionType::StaffLoan : AccountTransactionType::StaffAdvance;

        $this->accounts->record($account, $accountTransactionType, -$amount, today(), 'staff', $staff->id);

        $staffAdvances = $this->chartOfAccounts->code('1300');
        $this->journal->post(today(), "{$type->name}: {$staff->name}", [
            ['chart_of_account_id' => $staffAdvances->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => 0, 'credit' => $amount],
        ], 'staff', $staff->id);
    }

    /**
     * Advance Return — cash back in from the staff member, repaying what
     * `postAdvance` sent out. Exact mirror of `postAdvance`: same accounts,
     * opposite direction (Dr {account} / Cr Staff Advances 1300).
     *
     * @param  array{account_id?: int|string|null}  $data
     */
    private function postAdvanceReturn(Staff $staff, float $amount, array $data): void
    {
        $advanceBalance = $staff->balance > 0 ? $staff->balance : 0.0;
        if ($staff->balance <= 0 || $amount > ($advanceBalance + 0.0001)) {
            throw ValidationException::withMessages([
                'amount' => ['Return amount cannot exceed outstanding advance balance (৳'.number_format($advanceBalance, 2).').'],
            ]);
        }

        $account = Account::findOrFail($data['account_id']);
        $this->accounts->record($account, AccountTransactionType::StaffAdvanceReturn, $amount, today(), 'staff', $staff->id);

        $staffAdvances = $this->chartOfAccounts->code('1300');
        $this->journal->post(today(), "Advance return: {$staff->name}", [
            ['chart_of_account_id' => $this->chartOfAccounts->forAccount($account)->id, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $staffAdvances->id, 'debit' => 0, 'credit' => $amount],
        ], 'staff', $staff->id);
    }

    /**
     * A situational correction with no standard business meaning — posted
     * against Opening Balance Equity, same as every other module's
     * catch-all adjustment. Staff's balance can sit on either side (1300
     * Staff Advances when they owe the company, 2250 Staff Payable when
     * the company owes them), so the counterpart account follows whichever
     * side the balance was already on *before* this adjustment — not
     * after, since a correction that crosses zero is still correcting
     * whichever ledger currently holds the balance. Starting from exactly
     * 0, neither side holds a balance yet, so the direction of this
     * adjustment itself decides where it lands.
     */
    private function postAdjustment(Staff $staff, float $delta, float $balanceBefore): void
    {
        $isAssetSide = ($balanceBefore !== 0.0 ? $balanceBefore : $delta) >= 0;
        $subject = $this->chartOfAccounts->code($isAssetSide ? '1300' : '2250');
        $equity = $this->chartOfAccounts->code('3300');

        // Whichever side is active, `delta` (the staff.balance change) is
        // exactly the amount to pass: on the asset side 1300 mirrors
        // staff.balance directly; on the liability side 2250 mirrors
        // -staff.balance, and postOpeningBalance's own credit-normal
        // handling already flips the sign for us — no manual negation
        // needed on either branch.
        $this->journal->postOpeningBalance(
            today(),
            $subject,
            $equity,
            $delta,
            'staff_adjustment',
            $staff->id,
            "Staff balance adjustment: {$staff->name}",
        );
    }
}
