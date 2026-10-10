<?php

namespace App\Imports;

use App\Actions\Contact\CreateContactAction;
use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Imports\Concerns\BindsCellsAsStrings;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
use App\Support\ImportCell;
use App\Support\ImportResult;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Historical sales migration (পর্ব ২/২২) — rows sharing an Invoice No group
 * into one Sale. Always created with `source: imported`, so
 * ConfirmSaleAction's existing historical-record branch runs (no
 * stock_movements/contact_ledger/account_transactions — Opening Stock
 * already reflects today's net-of-history quantity, so decrementing it
 * again here would double-count). Order Total is cross-checked against the
 * calculated sum but never blocks the import — informational only, same
 * as the design doc's own "validation only, not stored separately" note.
 *
 * A product not found by SKU or name is never auto-created (unlike
 * Category/Unit/Brand in ProductsImport) — an unresolvable line skips the
 * *entire* invoice group, since a Sale can't be created with a missing
 * line item.
 */
class SalesImport implements ToCollection, WithCustomValueBinder, WithHeadingRow
{
    use BindsCellsAsStrings;

    public ImportResult $result;

    public function __construct(
        private CreateContactAction $createContact,
        private CreateSaleAction $createSale,
        private ConfirmSaleAction $confirmSale,
    ) {
        $this->result = new ImportResult;
    }

    public function collection(Collection $rows): void
    {
        $groups = $rows->groupBy(fn (Collection $row) => trim((string) ($row['invoice_no'] ?? '')));

        foreach ($groups as $invoiceNo => $group) {
            $invoiceStr = (string) $invoiceNo;
            try {
                DB::transaction(function () use ($invoiceStr, $group) {
                    $this->importInvoice($invoiceStr, $group);
                });
            } catch (\Throwable $e) {
                $this->result->addSkipped("Invoice \"{$invoiceStr}\": ".$e->getMessage());
            }
        }
    }

    private function importInvoice(string $invoiceNo, Collection $rows): void
    {
        $head = $rows->first();
        $this->result->row($invoiceNo === '' ? '—' : $invoiceNo, [
            'invoice_no' => $invoiceNo,
            'sale_date' => $head['sale_date'] ?? null,
            'customer_name' => $head['customer_name'] ?? null,
            'customer_phone' => $head['customer_phone'] ?? null,
            'lines' => $rows->count(),
            'discount_type' => $head['discount_type'] ?? null,
            'discount_value' => $head['discount_value'] ?? null,
            'installation_charge' => $rows->sum(fn ($line) => is_numeric($line['installation_charge'] ?? null) ? (float) $line['installation_charge'] : 0),
            'historical' => $head['historical'] ?? null,
            'paid_amount' => $head['paid_amount'] ?? null,
            'payment_account' => $head['payment_account'] ?? null,
        ]);

        if ($invoiceNo === '') {
            $this->result->addSkipped('A row has no Invoice No — skipped');

            return;
        }

        if (Sale::query()->where('invoice_no', $invoiceNo)->exists()) {
            $this->result->addSkipped("Invoice \"{$invoiceNo}\": already imported, skipped");

            return;
        }

        $first = $rows->first();

        if (empty($first['customer_name']) || empty($first['sale_date'])) {
            $this->result->addSkipped("Invoice \"{$invoiceNo}\": missing customer name or sale date");

            return;
        }

        $head = $first;
        $historical = $this->flag($head['historical'] ?? null, true);

        $invoiceDiscountType = $this->discountType($head['discount_type'] ?? null);
        $invoiceDiscountValue = $this->number($head['discount_value'] ?? null);

        if ($invoiceDiscountType === false) {
            $this->result->addSkipped("Invoice \"{$invoiceNo}\": discount_type must be flat or percentage — whole invoice skipped");

            return;
        }

        $items = [];

        foreach ($rows as $row) {
            $product = $this->findProduct($row);

            if ($product === null) {
                $identifier = $row['sku'] ?? $row['product_name'] ?? '?';
                $this->result->addSkipped("Invoice \"{$invoiceNo}\": product \"{$identifier}\" not found — whole invoice skipped");

                return;
            }

            $quantity = (float) ($row['quantity'] ?? 0);
            $unitPrice = (float) ($row['unit_price'] ?? 0);

            if ($quantity <= 0) {
                $this->result->addSkipped("Invoice \"{$invoiceNo}\": invalid quantity for \"{$product->name}\" — whole invoice skipped");

                return;
            }

            $itemDiscountType = $this->discountType($row['item_discount_type'] ?? null);

            if ($itemDiscountType === false) {
                $this->result->addSkipped("Invoice \"{$invoiceNo}\": item_discount_type for \"{$product->name}\" must be flat or percentage — whole invoice skipped");

                return;
            }

            $installationCharge = $this->number($row['installation_charge'] ?? null);

            $items[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                // The price before the line discount; the discount is applied on top of it.
                'original_price' => $unitPrice,
                'unit_price' => $unitPrice,
                'discount_type' => $itemDiscountType,
                'discount_value' => $itemDiscountType !== null ? $this->number($row['item_discount_value'] ?? null) : 0,
                'installation_required' => $installationCharge > 0,
                'installation_charge' => $installationCharge > 0 ? $installationCharge : null,
                'warranty_months' => isset($row['warranty_months']) && trim((string) $row['warranty_months']) !== '' ? max(0, (int) $row['warranty_months']) : null,
                'note' => $row['item_description'] ?? null,
            ];
        }

        $payments = [];

        if (! $historical) {
            $paid = $this->number($head['paid_amount'] ?? null);

            if ($paid > 0) {
                $account = Account::query()->where('name', trim((string) ($head['payment_account'] ?? '')))->first();

                if ($account === null) {
                    $this->result->addSkipped("Invoice \"{$invoiceNo}\": payment_account \"".($head['payment_account'] ?? '').'" not found — it is required when paid_amount is given — whole invoice skipped');

                    return;
                }

                $payments[] = ['account_id' => $account->id, 'amount' => $paid];
            }
        }

        $customer = $this->resolveCustomer($head);

        $sale = $this->createSale->execute([
            'customer_id' => $customer->id,
            'invoice_no' => $invoiceNo,
            'sale_date' => $this->parseDate($head['sale_date']),
            'status' => 'draft',
            'source' => $historical ? 'imported' : 'manual',
            'discount_type' => $invoiceDiscountType,
            'discount_value' => $invoiceDiscountType !== null ? $invoiceDiscountValue : 0,
            'items' => $items,
        ]);

        $this->confirmSale->execute($sale, $payments);

        $total = round((float) $sale->total_amount, 2);

        if (! empty($head['order_total']) && abs((float) $head['order_total'] - $total) > 0.01) {
            $this->result->messages[] = "Invoice \"{$invoiceNo}\": imported, but Order Total ({$head['order_total']}) didn't match the calculated total ({$total})";
        }

        $this->result->addCreated(['total' => $total, 'mode' => $historical ? 'historical' : 'live']);
    }

    /**
     * yes/no style cell → bool. Blank gives `$default`; anything else unrecognised is treated as the default too.
     */
    private function flag(mixed $value, bool $default): bool
    {
        $text = strtolower(trim((string) $value));

        return match (true) {
            in_array($text, ['yes', 'y', 'true', '1'], true) => true,
            in_array($text, ['no', 'n', 'false', '0'], true) => false,
            default => $default,
        };
    }

    /**
     * @return DiscountType|string|false|null null when blank, the type (as its value) when valid, false when it is something else
     */
    private function discountType(mixed $value): string|false|null
    {
        $text = strtolower(trim((string) $value));

        return match ($text) {
            '' => null,
            'flat', 'percentage' => $text,
            default => false,
        };
    }

    private function number(mixed $value): float
    {
        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function findProduct(Collection $row): ?Product
    {
        $sku = ImportCell::identifier($row['sku'] ?? null, 'sku');

        if ($sku !== null) {
            $product = Product::query()->where('sku', $sku)->first();

            if ($product !== null) {
                return $product;
            }
        }

        if (! empty($row['product_name'])) {
            return Product::query()->where('name', $row['product_name'])->first();
        }

        return null;
    }

    private function resolveCustomer(Collection $row): Contact
    {
        // An Excel-mangled phone (8.80181E+12) throws here and skips the invoice with a message saying how to fix it.
        $phone = ImportCell::phone($row['customer_phone'] ?? null, 'customer_phone');
        $email = $row['customer_email'] ?? null;

        if (! empty($phone) || ! empty($email)) {
            $customer = Contact::query()->customers()
                ->where(function ($query) use ($phone, $email) {
                    $query->when(! empty($phone), fn ($query) => $query->where('phone', $phone))
                        ->when(! empty($email), fn ($query) => $query->orWhere('email', $email));
                })
                ->first();

            if ($customer !== null) {
                return $customer;
            }
        }

        return $this->createContact->execute([
            'name' => $row['customer_name'],
            'phone' => $phone ?? 'N/A',
            'email' => $row['customer_email'] ?? null,
            'type' => 'customer',
        ]);
    }

    private function parseDate(mixed $value): string
    {
        if (is_numeric($value)) {
            return ExcelDate::excelToDateTimeObject($value)->format('Y-m-d');
        }

        return Carbon::parse((string) $value)->format('Y-m-d');
    }
}
