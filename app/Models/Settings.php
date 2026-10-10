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
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Settings extends Model implements HasMedia
{
    /** @use HasFactory<SettingsFactory> */
    use HasFactory;

    use InteractsWithMedia;

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
    public const ACTIVITY_LOG_RETENTION_OPTIONS = [3, 6, 12, 18, 24];

    /**
     * Every action the Ctrl+Space quick-action switcher can offer. The labels, icons and links live in
     * resources/js/lib/quick-actions.ts; this list only guards what an admin may save.
     *
     * @var list<string>
     */
    public const QUICK_ACTION_KEYS = [
        'add_sale',
        'add_purchase',
        'add_contact',
        'add_product',
        'add_expense',
        'add_other_income',
        'add_sales_order',
        'add_asset',
        'add_service',
        'add_sale_return',
        'add_purchase_return',
    ];

    /**
     * Secrets never leave the server: the settings page is given `sms_api_key_set` (yes/no) instead of the key, and the
     * licence key is not part of the page's data at all.
     *
     * @var list<string>
     */
    protected $hidden = ['sms_api_key', 'license_key'];

    /**
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
        'quick_actions',
        'invoice_settings',
        'sms_enabled',
        'sms_gateway_url',
        'sms_http_method',
        'sms_api_key',
        'sms_auth_mode',
        'sms_sender_id',
        'sms_api_key_param',
        'sms_sender_param',
        'sms_phone_param',
        'sms_message_param',
        'sms_extra_params',
        'sms_phone_format',
        'sms_success_text',
        'license_key',
        'license_status',
        'license_last_verified_at',
        'updated_by',
    ];

    /**
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
            'quick_actions' => 'array',
            'invoice_settings' => 'array',
            'sms_enabled' => 'boolean',
            'sms_api_key' => 'encrypted',
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

    /**
     * Default invoice template config — everything shown, matching what a
     * printed invoice does today with zero configuration. A fresh install or
     * one that hasn't visited Invoice Settings yet always gets this.
     *
     * @return array<string, mixed>
     */
    public static function defaultInvoiceSettings(): array
    {
        return [
            'general' => [
                'title' => 'INVOICE',
                'subtitle' => '',
                'show_number' => true,
                'show_date' => true,
                'show_due_date' => true,
            ],
            'branding' => [
                'show_logo' => true,
            ],
            'business' => [
                'show_name' => true,
                'show_address' => true,
                'show_phone' => true,
            ],
            'customer' => [
                'show_name' => true,
                'show_phone' => true,
                'show_email' => true,
                'show_address' => true,
            ],
            'items' => [
                'show_sku' => true,
                'show_unit' => true,
                'show_discount' => true,
            ],
            'totals' => [
                'show_discount' => true,
                'show_paid' => true,
                'show_due' => true,
            ],
            'terms' => [
                'enabled' => false,
                'items' => [],
            ],
            'footer' => [
                'enabled' => true,
                'text' => 'Thank you for your business!',
            ],
        ];
    }

    /**
     * The shop's saved invoice template config, deep-merged over the
     * defaults so an admin who has only ever touched one section still gets
     * sane values everywhere else (and new sections added later don't need
     * a data migration for existing rows).
     *
     * @return array<string, mixed>
     */
    public function invoiceSettingsOrDefault(): array
    {
        $defaults = self::defaultInvoiceSettings();
        $saved = $this->invoice_settings ?? [];

        foreach ($defaults as $section => $fields) {
            $defaults[$section] = array_merge($fields, $saved[$section] ?? []);
        }

        return $defaults;
    }

    /**
     * The URL slots an admin can upload to in Business Settings → Branding, mapped to their media
     * collection. `logo` shows while the sidebar is open, `logo-small` while it is collapsed to icons.
     *
     * @var array<string, string>
     */
    public const BRANDING_SLOTS = [
        'logo' => 'shop_logo',
        'logo-small' => 'shop_logo_small',
        'favicon' => 'favicon',
    ];

    /**
     * Public URLs of the branding images (null where none was uploaded) — read with one media query.
     * `Settings::current()` hands back a cached instance, so a `media` relation loaded earlier (possibly
     * empty) would otherwise hide an image uploaded since; it is always reloaded here.
     *
     * @return array{logo: ?string, logo_small: ?string, favicon: ?string}
     */
    public function brandingUrls(): array
    {
        $this->unsetRelation('media')->load('media');

        return [
            'logo' => $this->getFirstMediaUrl('shop_logo') ?: null,
            'logo_small' => $this->getFirstMediaUrl('shop_logo_small') ?: null,
            'favicon' => $this->getFirstMediaUrl('favicon') ?: null,
        ];
    }

    public function registerMediaCollections(): void
    {
        // Sidebar logo (open), its small icon-only twin (collapsed sidebar), and the browser favicon —
        // all separate from the invoice logo below.
        $this->addMediaCollection('shop_logo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);

        $this->addMediaCollection('shop_logo_small')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);

        $this->addMediaCollection('favicon')
            ->singleFile()
            ->acceptsMimeTypes(['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp', 'image/jpeg']);

        $this->addMediaCollection('invoice_logo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }
}
