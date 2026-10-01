<?php

namespace App\Http\Controllers\Staff;

use App\Enums\BalanceEffect;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffRequest;
use App\Http\Requests\Staff\UpdateStaffRequest;
use App\Models\Account;
use App\Models\Investor;
use App\Models\Staff;
use App\Models\StaffLedger;
use App\Models\StaffTransactionType;
use Database\Seeders\StaffTransactionTypeSeeder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    public function index(): Response
    {
        $staffList = Staff::query()
            ->with('investor:id,name')
            ->withCount('ledgerEntries')
            ->orderBy('name')
            ->get();

        return Inertia::render('staff/index', [
            'staff' => $staffList->map(fn (Staff $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'phone' => $member->phone,
                'designation' => $member->designation,
                'joining_date' => $member->joining_date?->toDateString(),
                'salary_amount' => $member->salary_amount,
                'status' => $member->status,
                'investor' => $member->investor?->only(['id', 'name']),
                'balance' => $member->balance,
                'can_delete' => $member->ledger_entries_count === 0,
            ]),
            'investors' => Investor::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * No journal/ledger effect here — a staff member starts at balance 0,
     * it only ever moves afterward via AddStaffTransactionAction.
     */
    public function store(StoreStaffRequest $request): RedirectResponse
    {
        Staff::create([...$request->validated(), 'created_by' => Auth::id()]);

        return to_route('staff.index');
    }

    public function update(UpdateStaffRequest $request, Staff $staff): RedirectResponse
    {
        $staff->update($request->validated());

        return to_route('staff.index');
    }

    public function show(Staff $staff): Response
    {
        $runningBalance = 0.0;

        $rows = $staff->ledgerEntries()
            ->with(['type:id,name,effect_on_balance', 'account:id,name'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (StaffLedger $entry) use (&$runningBalance) {
                $delta = match ($entry->type->effect_on_balance) {
                    BalanceEffect::Increase => $entry->amount,
                    BalanceEffect::Decrease => -$entry->amount,
                    BalanceEffect::None => 0.0,
                };
                $runningBalance += $delta;

                return [
                    'id' => $entry->id,
                    'type' => $entry->type->only(['id', 'name']),
                    // A no-effect type (Salary) still shows what was paid, even though the balance doesn't move.
                    'amount' => $entry->type->effect_on_balance === BalanceEffect::None ? $entry->amount : $delta,
                    'account' => $entry->account?->only(['id', 'name']),
                    'note' => $entry->note,
                    'created_at' => $entry->created_at->toDateString(),
                    'balance' => round($runningBalance, 2),
                ];
            });

        return Inertia::render('staff/show', [
            'staffMember' => [
                'id' => $staff->id,
                'name' => $staff->name,
                'phone' => $staff->phone,
                'designation' => $staff->designation,
                'salary_amount' => $staff->salary_amount,
                'balance' => $staff->balance,
                'balance_label' => $staff->balance_label,
            ],
            'transactions' => $rows,
            // Only the three active types — older ones (Salary Charge/Payment, Loan Given, Adjustment) stay in
            // the ledger history but can't be picked for new entries.
            'transactionTypes' => StaffTransactionType::query()
                ->whereIn('name', StaffTransactionTypeSeeder::ACTIVE_TYPES)
                ->orderBy('name')
                ->get(['id', 'name', 'effect_on_balance', 'nature']),
            'accounts' => Account::query()->active()->orderBy('name')->get(['id', 'name', 'current_balance', 'is_default']),
        ]);
    }

    /**
     * Staff who already carry ledger history are kept — corrections go
     * through a transaction, never a delete.
     */
    public function destroy(Staff $staff): RedirectResponse
    {
        if ($staff->ledgerEntries()->exists()) {
            return back()->withErrors([
                'staff' => 'This staff member has recorded transactions and cannot be deleted.',
            ]);
        }

        $staff->delete();

        return to_route('staff.index');
    }
}
