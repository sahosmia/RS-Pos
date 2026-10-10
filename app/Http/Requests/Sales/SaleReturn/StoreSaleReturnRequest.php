<?php

namespace App\Http\Requests\Sales\SaleReturn;

use App\Rules\ReturnQuantityWithinSoldRule;
use App\Rules\SaleMustBeConfirmedRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            // Only a sale the user may see: view_own cannot raise a return against someone else's invoice.
            'sale_id' => ['required', 'integer', Rule::exists('sales', 'id')->when(! $this->user()?->can('sale.view_all'), fn ($rule) => $rule->where('created_by', $this->user()?->id)), new SaleMustBeConfirmedRule],
            'return_date' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ];

        foreach ((array) $this->input('items', []) as $index => $item) {
            $saleItemId = (int) ($item['sale_item_id'] ?? 0);

            if ($saleItemId > 0) {
                $rules["items.{$index}.quantity"][] = new ReturnQuantityWithinSoldRule($saleItemId);
            }
        }

        return $rules;
    }
}
