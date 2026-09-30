<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use App\Queries\Product\ProductFormOptions;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    protected static function booted(): void
    {
        static::saved(fn () => ProductFormOptions::clearCache());
        static::deleted(fn () => ProductFormOptions::clearCache());
    }

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
