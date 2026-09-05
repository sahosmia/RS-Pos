<?php

namespace App\Http\Requests\SaleReturn;

use App\Rules\ReturnQuantityWithinSoldRule;
use App\Rules\SaleMustBeConfirmedRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSaleReturnRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'sale_id' => ['required', 'integer', 'exists:sales,id', new SaleMustBeConfirmedRule],
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
