<?php

namespace App\Models;

use App\Enums\MiscTransactionCategoryType;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\MiscTransactionCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MiscTransactionCategory extends Model
{
    /** @use HasFactory<MiscTransactionCategoryFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'type',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MiscTransactionCategoryType::class,
        ];
    }

    /**
     * @return HasMany<CashBookEntry, $this>
     */
    public function entries(): HasMany
    {
        return $this->hasMany(CashBookEntry::class, 'category_id');
    }
}
