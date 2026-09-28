<?php

namespace App\Imports;

use App\Actions\Contact\CreateContactAction;
use App\Actions\Sales\Sale\ConfirmSaleAction;
use App\Actions\Sales\Sale\CreateSaleAction;
use App\Imports\Concerns\BindsCellsAsStrings;
use App\Models\Contact;
use App\Models\Product;
use App\Models\Sale;
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

        $items = [];
        $calculatedTotal = 0.0;

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

            $items[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'note' => $row['item_description'] ?? null,
            ];

            $calculatedTotal += round($quantity * $unitPrice, 2);
        }

        $customer = $this->resolveCustomer($first);

        $sale = $this->createSale->execute([
            'customer_id' => $customer->id,
            'invoice_no' => $invoiceNo,
            'sale_date' => $this->parseDate($first['sale_date']),
            'status' => 'draft',
            'source' => 'imported',
            'items' => $items,
        ]);

        $this->confirmSale->execute($sale);

        if (! empty($first['order_total']) && abs((float) $first['order_total'] - $calculatedTotal) > 0.01) {
            $this->result->messages[] = "Invoice \"{$invoiceNo}\": imported, but Order Total ({$first['order_total']}) didn't match the calculated total ({$calculatedTotal})";
        }

        $this->result->addCreated();
    }

    private function findProduct(Collection $row): ?Product
    {
        if (! empty($row['sku'])) {
            $product = Product::query()->where('sku', $row['sku'])->first();

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
        $phone = $row['customer_phone'] ?? null;
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
            'phone' => $row['customer_phone'] ?? 'N/A',
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
