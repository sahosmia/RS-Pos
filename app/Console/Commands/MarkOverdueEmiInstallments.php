<?php

namespace App\Console\Commands;

use App\Enums\EmiInstallmentStatus;
use App\Enums\NotificationType;
use App\Models\EmiInstallment;
use App\Models\Notification;
use Illuminate\Console\Command;

/**
 * Daily sweep: any installment still Pending past its due date becomes
 * Overdue — pure status flip, no money or ledger movement (that only
 * happens when the installment is actually paid) — plus a `due_payment`
 * notification per newly-overdue installment. This extends the existing
 * due_payment notification type rather than inventing a separate EMI type,
 * per the note left on this task before the notification module existed.
 */
class MarkOverdueEmiInstallments extends Command
{
    protected $signature = 'emi:mark-overdue';

    protected $description = 'Mark pending EMI installments past their due date as overdue';

    public function handle(): void
    {
        $overdue = EmiInstallment::query()
            ->where('status', EmiInstallmentStatus::Pending)
            ->whereDate('due_date', '<', today())
            ->with('sale:id,invoice_no')
            ->get(['id', 'sale_id', 'installment_number', 'due_date', 'amount']);

        foreach ($overdue as $installment) {
            $installment->update(['status' => EmiInstallmentStatus::Overdue]);

            if (Notification::existsUnreadFor(NotificationType::DuePayment, EmiInstallment::class, $installment->id)) {
                continue;
            }

            Notification::create([
                'type' => NotificationType::DuePayment,
                'title' => "EMI overdue: {$installment->sale?->invoice_no}",
                'message' => "Installment #{$installment->installment_number} ({$installment->amount}) was due {$installment->due_date->toDateString()}.",
                'reference_type' => EmiInstallment::class,
                'reference_id' => $installment->id,
            ]);
        }

        $this->info("Marked {$overdue->count()} installment(s) overdue.");
    }
}
