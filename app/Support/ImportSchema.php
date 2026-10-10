<?php

namespace App\Support;

/**
 * The single description of every bulk-import file: which columns exist, which are required, what they
 * mean, and an example row. It feeds the import page's column table, the downloadable template, and the
 * pre-flight check that rejects a file with missing required columns — so the three can never drift apart.
 *
 * Keep it aligned with the validation in each `App\Imports\*Import` class: a column is `required` here
 * exactly when that class rejects a row without it.
 *
 * @phpstan-type Column array{name: string, requirement: 'required'|'optional'|'conditional', description: string, example: string}
 */
class ImportSchema
{
    public const REQUIRED = 'required';

    public const OPTIONAL = 'optional';

    public const CONDITIONAL = 'conditional';

    public const TYPES = ['products', 'contacts', 'opening-stock', 'sales'];

    /** Columns that hold an identifier, not a quantity: kept as text so Excel never turns them into numbers. */
    public const IDENTIFIER_COLUMNS = ['phone', 'customer_phone', 'sku', 'barcode'];

    /**
     * @return array<string, array{label: string, columns: list<Column>, any_of: list<list<string>>}>
     */
    public static function all(): array
    {
        return [
            'products' => [
                'label' => 'Products',
                'columns' => [
                    self::col('name', self::REQUIRED, 'Product name', 'Walton AC 1 Ton'),
                    self::col('sku', self::REQUIRED, 'Unique SKU. A row whose SKU already exists is skipped', 'WAL-AC-1T'),
                    self::col('category', self::REQUIRED, 'Category name (created if it does not exist)', 'Air Conditioner'),
                    self::col('unit', self::REQUIRED, 'Unit name (created if it does not exist)', 'Piece'),
                    self::col('selling_price', self::REQUIRED, 'Selling price, numbers only', '45000'),
                    self::col('brand', self::OPTIONAL, 'Brand name (created if it does not exist)', 'Walton'),
                    self::col('barcode', self::OPTIONAL, 'Barcode value', '8801234567890'),
                    self::col('opening_stock', self::OPTIONAL, 'Opening quantity, numbers only. Default 0', '5'),
                    self::col('opening_stock_cost', self::OPTIONAL, 'Cost per unit of the opening stock. Default 0', '35000'),
                    self::col('minimum_stock_level', self::OPTIONAL, 'Low-stock alert quantity. Default 0', '2'),
                    self::col('warranty_period_months', self::OPTIONAL, 'Warranty in months. Leave blank for none', '12'),
                ],
                'any_of' => [],
            ],
            'contacts' => [
                'label' => 'Contacts',
                'columns' => [
                    self::col('name', self::REQUIRED, 'Contact name', 'Karim Uddin'),
                    self::col('phone', self::REQUIRED, 'Phone number. The same phone + type is skipped as a duplicate', '+8801811111111'),
                    self::col('type', self::REQUIRED, 'One of: customer, supplier, both', 'customer'),
                    self::col('email', self::OPTIONAL, 'Valid email address', 'karim@example.com'),
                    self::col('address', self::OPTIONAL, 'Address', 'Dhaka'),
                    self::col('business_name', self::OPTIONAL, 'Fill this for a business contact', 'Karim Traders'),
                    self::col('opening_balance', self::OPTIONAL, 'Opening balance, numbers only. Default 0', '0'),
                ],
                'any_of' => [],
            ],
            'opening-stock' => [
                'label' => 'Opening Stock',
                'columns' => [
                    self::col('sku', self::REQUIRED, 'SKU of an existing product that has no stock movement yet', 'WAL-AC-1T'),
                    self::col('quantity', self::REQUIRED, 'Opening quantity, numbers only', '20'),
                    self::col('unit_cost', self::REQUIRED, 'Cost per unit, numbers only', '35000'),
                ],
                'any_of' => [],
            ],
            'sales' => [
                'label' => 'Historical Sales',
                'columns' => [
                    self::col('invoice_no', self::REQUIRED, 'Rows with the same invoice number become one sale', 'OLD-INV-001'),
                    self::col('customer_name', self::REQUIRED, 'Customer name', 'Jashim Uddin'),
                    self::col('sale_date', self::REQUIRED, 'Sale date, YYYY-MM-DD', '2025-01-15'),
                    self::col('quantity', self::REQUIRED, 'Quantity sold, greater than 0', '2'),
                    self::col('unit_price', self::REQUIRED, 'Price per unit, numbers only', '500'),
                    self::col('sku', self::CONDITIONAL, 'Required unless product_name is given. Matched to an existing product', 'WAL-AC-1T'),
                    self::col('product_name', self::CONDITIONAL, 'Required unless sku is given. Matched by exact name', 'Walton AC 1 Ton'),
                    self::col('customer_phone', self::OPTIONAL, 'Used to find an existing customer', '+8801911111111'),
                    self::col('customer_email', self::OPTIONAL, 'Used to find an existing customer', 'jashim@example.com'),
                    self::col('item_description', self::OPTIONAL, 'Note on the line item', ''),
                    self::col('historical', self::OPTIONAL, 'yes (the default): only recorded, no stock, balance or payment is touched. no: a live sale that takes stock and records the payment below', 'yes'),
                    self::col('item_discount_type', self::OPTIONAL, 'Discount on this line: flat (amount per unit) or percentage. unit_price is then the price before this discount', 'percentage'),
                    self::col('item_discount_value', self::OPTIONAL, 'The amount or percentage for item_discount_type', '10'),
                    self::col('discount_type', self::OPTIONAL, 'Discount on the whole invoice: flat or percentage. Read from the first row of the invoice', 'flat'),
                    self::col('discount_value', self::OPTIONAL, 'The amount or percentage for discount_type. First row of the invoice', '50'),
                    self::col('installation_charge', self::OPTIONAL, 'Installation charge for this line. Leave blank for no installation. Added on top, never discounted', '300'),
                    self::col('warranty_months', self::OPTIONAL, 'Warranty for this line in months. Blank takes the product warranty, 0 means none', '12'),
                    self::col('paid_amount', self::OPTIONAL, 'Live sales only (historical = no): what was received at the time; the rest stays due. First row of the invoice', ''),
                    self::col('payment_account', self::OPTIONAL, 'Live sales only: name of the account the money went into. Required when paid_amount is given', ''),
                    self::col('order_total', self::OPTIONAL, 'Checked against the calculated total (after discounts, with installation); a mismatch is reported but never blocks the import', '1150'),
                ],
                'any_of' => [['sku', 'product_name']],
            ],
        ];
    }

    /**
     * @return array{label: string, columns: list<Column>, any_of: list<list<string>>}
     */
    public static function for(string $type): array
    {
        return self::all()[$type];
    }

    /**
     * Column names a file must contain for the import to be able to process any row.
     *
     * @return list<string>
     */
    public static function requiredColumns(string $type): array
    {
        return array_values(array_map(
            fn (array $column) => $column['name'],
            array_filter(self::for($type)['columns'], fn (array $column) => $column['requirement'] === self::REQUIRED),
        ));
    }

    /**
     * Human-readable list of what is missing from a file's header row (empty when it is fine).
     *
     * @param  list<string>  $headings
     * @return list<string>
     */
    public static function missingColumns(string $type, array $headings): array
    {
        $schema = self::for($type);
        $missing = array_values(array_diff(self::requiredColumns($type), $headings));

        foreach ($schema['any_of'] as $group) {
            if (array_intersect($group, $headings) === []) {
                $missing[] = implode(' or ', $group);
            }
        }

        return $missing;
    }

    /**
     * The template's example row, in column order.
     *
     * @return list<string>
     */
    public static function exampleRow(string $type): array
    {
        return array_map(fn (array $column) => $column['example'], self::for($type)['columns']);
    }

    /**
     * @return list<string>
     */
    public static function headerRow(string $type): array
    {
        return array_map(fn (array $column) => $column['name'], self::for($type)['columns']);
    }

    /**
     * @param  'required'|'optional'|'conditional'  $requirement
     * @return Column
     */
    private static function col(string $name, string $requirement, string $description, string $example): array
    {
        return ['name' => $name, 'requirement' => $requirement, 'description' => $description, 'example' => $example];
    }
}
