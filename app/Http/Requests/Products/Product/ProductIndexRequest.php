<?php

namespace App\Http\Requests\Products\Product;

use App\Queries\Product\ProductQuery;
use Illuminate\Foundation\Http\FormRequest;

class ProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // no per-resource policy yet — see Phase 18 in the project roadmap
    }

    public function rules(): array
    {
        return [
            ...ProductQuery::filterRules(),
            'per_page' => ['nullable', 'string', 'max:10'],
        ];
    }
}
