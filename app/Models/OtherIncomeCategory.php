<?php

namespace App\Models;

use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\OtherIncomeCategoryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OtherIncomeCategory extends Model
{
    /** @use HasFactory<OtherIncomeCategoryFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
    ];

    /**
     * @return HasMany<OtherIncome, $this>
     */
    public function incomes(): HasMany
    {
        return $this->hasMany(OtherIncome::class);
    }
}
