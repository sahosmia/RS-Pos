<?php

namespace App\Models;

use App\Enums\ThemeColor;
use Database\Factories\SettingsFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class Settings extends Model
{
    /** @use HasFactory<SettingsFactory> */
    use HasFactory;

    /**
     * Fallback list of page-size choices for the "Rows per page" dropdown
     * when the shop hasn't configured its own list yet.
     *
     * @var list<int>
     */
    public const DEFAULT_PAGINATION_OPTIONS = [20, 30, 50, 100];

    /**
     * Allowed choices for the "Activity log retention" dropdown (months).
     *
     * @var list<int>
     */
    public const ACTIVITY_LOG_RETENTION_OPTIONS = [3, 6, 12, 18];

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
        'sales_order_prefix',
        'sales_order_next_number',
        'thermal_printer_enabled',
        'emi_module_enabled',
        'serial_number_module_enabled',
        'fiscal_year_start_month',
        'pagination_per_page_options',
        'pagination_default_per_page',
        'pagination_allow_all',
        'activity_log_retention_months',
        'theme_color',
        'menu_order',
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
            'sales_order_next_number' => 'integer',
            'pagination_per_page_options' => 'array',
            'pagination_default_per_page' => 'integer',
            'pagination_allow_all' => 'boolean',
            'activity_log_retention_months' => 'integer',
            'theme_color' => ThemeColor::class,
            'menu_order' => 'array',
            'license_key' => 'encrypted',
            'license_last_verified_at' => 'datetime',
        ];
    }

    /**
     * Cache key for the single settings row. Loaded on virtually every
     * request (shared Inertia props, pagination, invoice numbering), so it's
     * kept in cache indefinitely and only invalidated by {@see forgetCache()}
     * whenever the row actually changes.
     */
    private const CACHE_KEY = 'settings.shared';

    /**
     * Invalidate the cached settings row. Wired up in {@see booted()} for
     * normal save()/delete() calls; also called explicitly wherever a
     * next-number counter is bumped via increment() (which doesn't fire
     * Eloquent's saved event).
     */
    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return void
     */
    protected static function booted()
    {
        static::saved(fn () => self::forgetCache());
        static::deleted(fn () => self::forgetCache());
    }

    /**
     * Get the single settings row, or null if it hasn't been created yet
     * (fresh install/tests). Cached indefinitely — see {@see CACHE_KEY}.
     */
    public static function currentOrNull(): ?self
    {
        $settings = Cache::get(self::CACHE_KEY);

        if ($settings === null) {
            $settings = static::query()->first();

            if ($settings !== null) {
                Cache::forever(self::CACHE_KEY, $settings);
            }
        }

        return $settings;
    }

    /**
     * Get the single settings row.
     */
    public static function current(): self
    {
        return self::currentOrNull() ?? throw (new ModelNotFoundException)->setModel(static::class);
    }

    /**
     * The shop's configured page-size choices — falls back to
     * {@see DEFAULT_PAGINATION_OPTIONS} until an admin sets their own.
     *
     * @return list<int>
     */
    public function paginationOptions(): array
    {
        return $this->pagination_per_page_options ?: self::DEFAULT_PAGINATION_OPTIONS;
    }

    /**
     * Turn a raw `per_page` query param ('20', 'all', garbage, missing) into
     * either a page size or null (meaning "no pagination — return every row"),
     * whitelisted against the shop's configured options so a tampered value
     * can't force an unbounded/huge query. Null-safe against a missing
     * Settings row (fresh install/tests) — falls back to the hardcoded
     * defaults instead of 404ing, unlike {@see current()}.
     */
    public static function resolveRequestedPerPage(?string $requested): ?int
    {
        $settings = static::currentOrNull();
        $options = $settings?->paginationOptions() ?? self::DEFAULT_PAGINATION_OPTIONS;
        $allowAll = $settings?->pagination_allow_all ?? true;
        $default = $settings?->pagination_default_per_page ?? self::DEFAULT_PAGINATION_OPTIONS[0];

        return match (true) {
            $requested === 'all' && $allowAll => null,
            is_numeric($requested) && in_array((int) $requested, $options, true) => (int) $requested,
            default => $default,
        };
    }

    /**
     * "All" still means a real, capped page — never an unbounded `->get()` —
     * so a shop that grows into tens/hundreds of thousands of rows (sales,
     * contacts, ...) can't have a stray `?per_page=all` pull the entire
     * table into one response and exhaust memory/time out. A table under
     * this ceiling behaves exactly like before: one page with everything.
     */
    public const MAX_UNPAGINATED_ROWS = 5000;

    /**
     * Paginate a query using the shop's per-page settings — shared by every
     * list page's Datatable so "Rows per page" (including "All") behaves the
     * same everywhere instead of each controller reinventing it.
     *
     * @param  Builder<Model>  $query
     */
    public static function paginateQuery(Builder $query, ?string $requestedPerPage, Request $request): LengthAwarePaginator
    {
        $perPage = static::resolveRequestedPerPage($requestedPerPage);

        return $query->paginate($perPage ?? self::MAX_UNPAGINATED_ROWS)->withQueryString();
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
            self::forgetCache();

            return $number;
        });
    }

    /**
     * Reserve and format the next purchase number (e.g. "PUR-0001").
     * Locks the row so concurrent purchases never receive the same number.
     */
    public function generatePurchaseNumber(): string
    {
        return DB::transaction(function () {
            $settings = static::query()->lockForUpdate()->findOrFail($this->id);

            $number = $settings->purchase_prefix.str_pad((string) $settings->purchase_next_number, 4, '0', STR_PAD_LEFT);

            $settings->increment('purchase_next_number');
            self::forgetCache();

            return $number;
        });
    }

    /**
     * Reserve and format the next sales order number (e.g. "SO-0001").
     * Locks the row so concurrent orders never receive the same number.
     */
    public function generateSalesOrderNumber(): string
    {
        return DB::transaction(function () {
            $settings = static::query()->lockForUpdate()->findOrFail($this->id);

            $number = $settings->sales_order_prefix.str_pad((string) $settings->sales_order_next_number, 4, '0', STR_PAD_LEFT);

            $settings->increment('sales_order_next_number');
            self::forgetCache();

            return $number;
        });
    }
}
