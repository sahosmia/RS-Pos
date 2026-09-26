<?php

namespace App\Console\Commands;

use App\Enums\NotificationType;
use App\Enums\PaymentStatus;
use App\Models\Expense;
use App\Models\Notification;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Console\Command;

/**
 * Daily sweep raising shop-owner alerts for:
 * - Low stock (product current_stock <= minimum_stock_level)
 * - Due payment (sale not yet fully paid)
 * - Expense due (expense not yet fully paid)
 *
 * Each check is deduped against any already-unread notification for the
 * same reference, so a condition that persists across days doesn't spam a
 * fresh row every run — it stays a single alert until marked read.
 *
 * `loan_repayment` isn't generated here: company_loans has no due-date/
 * schedule column (just lender/amount/outstanding_balance), so there's no
 * date signal to alert on yet — see doc/TASKS.md Phase 17 note.
 */
class GenerateDailyNotifications extends Command
{
    /**
     * @var string
     */
    protected $signature = 'notifications:generate';

    /**
     * @var string
     */
    protected $description = 'Generate low-stock and due-payment notifications for the shop owner';

    public function handle(): void
    {
        $lowStock = $this->generateLowStockNotifications();
        $dueSales = $this->generateSaleDueNotifications();
        $dueExpenses = $this->generateExpenseDueNotifications();

        $this->info("Created {$lowStock} low-stock, {$dueSales} sale-due, {$dueExpenses} expense-due notification(s).");
    }

    private function generateLowStockNotifications(): int
    {
        $products = Product::query()
            ->where('manage_stock', true)
            ->where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock_level')
            ->get(['id', 'name', 'current_stock', 'minimum_stock_level']);

        $created = 0;

        foreach ($products as $product) {
            if (Notification::existsUnreadFor(NotificationType::LowStock, Product::class, $product->id)) {
                continue;
            }

            Notification::create([
                'type' => NotificationType::LowStock,
                'title' => "Low stock: {$product->name}",
                'message' => "Current stock ({$product->current_stock}) is at or below the minimum level ({$product->minimum_stock_level}).",
                'reference_type' => Product::class,
                'reference_id' => $product->id,
            ]);

            $created++;
        }

        return $created;
    }

    private function generateSaleDueNotifications(): int
    {
        $sales = Sale::query()
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->with('customer:id,name')
            ->get(['id', 'invoice_no', 'customer_id', 'due_amount']);

        $created = 0;

        foreach ($sales as $sale) {
            if (Notification::existsUnreadFor(NotificationType::DuePayment, Sale::class, $sale->id)) {
                continue;
            }

            Notification::create([
                'type' => NotificationType::DuePayment,
                'title' => "Payment due: {$sale->invoice_no}",
                'message' => "{$sale->customer?->name} owes {$sale->due_amount} on sale {$sale->invoice_no}.",
                'reference_type' => Sale::class,
                'reference_id' => $sale->id,
            ]);

            $created++;
        }

        return $created;
    }

    private function generateExpenseDueNotifications(): int
    {
        $expenses = Expense::query()
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->with('category:id,name')
            ->get(['id', 'expense_category_id', 'due_amount']);

        $created = 0;

        foreach ($expenses as $expense) {
            if (Notification::existsUnreadFor(NotificationType::ExpenseDue, Expense::class, $expense->id)) {
                continue;
            }

            Notification::create([
                'type' => NotificationType::ExpenseDue,
                'title' => "Expense due: {$expense->category?->name}",
                'message' => "{$expense->due_amount} is still due on this expense.",
                'reference_type' => Expense::class,
                'reference_id' => $expense->id,
            ]);

            $created++;
        }

        return $created;
    }
}
