<?php

namespace App\Models;

use Database\Factories\SettingsFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Settings extends Model
{
    /** @use HasFactory<SettingsFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'shop_name',
        'shop_logo',
        'shop_address',
        'shop_phone',
        'currency_symbol',
        'invoice_prefix',
        'invoice_next_number',
        'purchase_prefix',
        'purchase_next_number',
        'thermal_printer_enabled',
        'emi_module_enabled',
        'serial_number_module_enabled',
        'fiscal_year_start_month',
        'license_key',
        'license_status',
        'license_last_verified_at',
        'updated_by',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'thermal_printer_enabled' => 'boolean',
            'emi_module_enabled' => 'boolean',
            'serial_number_module_enabled' => 'boolean',
            'fiscal_year_start_month' => 'integer',
            'invoice_next_number' => 'integer',
            'purchase_next_number' => 'integer',
            'license_key' => 'encrypted',
            'license_last_verified_at' => 'datetime',
        ];
    }

    /**
     * Get the single settings row.
     */
    public static function current(): self
    {
        return static::query()->firstOrFail();
    }

    /**
     * Reserve and format the next invoice number (e.g. "INV-0001").
     * Locks the row so concurrent sales never receive the same number.
     */
    public function generateInvoiceNumber(): string
    {
        return DB::transaction(function () {
            $settings = static::query()->lockForUpdate()->findOrFail($this->id);

            $number = $settings->invoice_prefix.str_pad((string) $settings->invoice_next_number, 4, '0', STR_PAD_LEFT);

            $settings->increment('invoice_next_number');

            return $number;
        });
    }
}
